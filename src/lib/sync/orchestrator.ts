/**
 * Universal Sync Orchestrator
 * Coordinates syncing across all channel types
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { syncGmailMessages } from '@/lib/gmail/sync';
import { syncOutlookMessages } from '@/lib/outlook/sync';
import { syncTwitterMessages } from '@/lib/twitter/sync';
import { syncTelegramMessages } from '@/lib/telegram/sync';
import { syncLinkedInMessages } from '@/lib/linkedin/sync';
import { classifyMessage } from '@/lib/ai/classifier';
import type { SyncProgress, SyncPhase } from '@/types/sync';

/**
 * Broadcast sync progress to Realtime channel
 */
async function broadcastProgress(
  workspaceId: string,
  progress: Partial<SyncProgress> & { phase: SyncPhase }
) {
  try {
    const channel = supabaseAdminClient.channel(`sync-progress:${workspaceId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'sync.progress',
      payload: {
        ...progress,
        timestamp: Date.now(),
      },
    });
    
    // Unsubscribe after sending (we're just broadcasting, not listening)
    supabaseAdminClient.removeChannel(channel);
  } catch (error) {
    console.error('Failed to broadcast sync progress:', error);
  }
}

export type ChannelProvider =
  | 'gmail'
  | 'outlook'
  | 'slack'
  | 'teams'
  | 'whatsapp'
  | 'telegram'
  | 'instagram'
  | 'facebook_messenger'
  | 'linkedin'
  | 'twitter';

export interface SyncResult {
  provider: ChannelProvider;
  connectionId: string;
  accountName: string | null;
  success: boolean;
  syncedCount?: number;
  newCount?: number;
  classifiedCount?: number;
  errorCount?: number;
  error?: string;
}

/**
 * Sync single channel connection
 */
export async function syncChannelConnection(
  connectionId: string,
  workspaceId: string,
  options: {
    maxMessages?: number;
    autoClassify?: boolean;
  } = {}
): Promise<SyncResult> {
  const supabase = await createSupabaseUserServerActionClient();

  // Get connection details
  const { data: connection, error } = await supabase
    .from('channel_connections')
    .select('provider, provider_account_name')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    // Broadcast error
    await broadcastProgress(workspaceId, {
      phase: 'error',
      connectionName: '',
      provider: 'unknown',
      totalMessages: 0,
      syncedMessages: 0,
      classifiedMessages: 0,
      error: 'Connection not found',
    });
    
    return {
      provider: 'gmail',
      connectionId,
      accountName: null,
      success: false,
      error: 'Connection not found',
    };
  }

  // Broadcast connecting phase
  await broadcastProgress(workspaceId, {
    phase: 'connecting',
    connectionName: connection.provider_account_name || '',
    provider: connection.provider,
    totalMessages: 0,
    syncedMessages: 0,
    classifiedMessages: 0,
  });

  try {
    let syncResult: any;
    
    console.log(`🚀 Starting sync for ${connection.provider} (${connection.provider_account_name})`);
    console.log(`   Options: autoClassify=${options.autoClassify}, maxMessages=${options.maxMessages}`);

    // Broadcast fetching phase
    await broadcastProgress(workspaceId, {
      phase: 'fetching',
      connectionName: connection.provider_account_name || '',
      provider: connection.provider,
      totalMessages: 0,
      syncedMessages: 0,
      classifiedMessages: 0,
    });

    // Route to appropriate sync function
    // Note: cast to any so newly added providers (twitter, telegram) are accepted
    switch (connection.provider as any) {
      case 'gmail':
        syncResult = await syncGmailMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
          // NOTE: Do not force 'is:unread' here, so we sync recent history
          // If a custom query is desired in the future, pass it via options
        });
        break;

      case 'outlook':
        syncResult = await syncOutlookMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
          // No filter = sync recent messages (like Gmail) to ensure contacts are created
          // Previously was 'isRead eq false' which only synced unread messages
        });
        break;

      case 'twitter':
        syncResult = await syncTwitterMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
        });
        break;

      case 'telegram':
        syncResult = await syncTelegramMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
        });
        break;

      case 'linkedin':
        syncResult = await syncLinkedInMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
        });
        break;

      case 'slack':
        // TODO: Implement Slack sync
        return {
          provider: connection.provider,
          connectionId,
          accountName: connection.provider_account_name,
          success: false,
          error: 'Slack sync not yet implemented',
        };

      default:
        return {
          provider: connection.provider,
          connectionId,
          accountName: connection.provider_account_name,
          success: false,
          error: `Sync not supported for ${connection.provider}`,
        };
    }

    // Broadcast syncing complete phase
    await broadcastProgress(workspaceId, {
      phase: 'syncing',
      connectionName: connection.provider_account_name || '',
      provider: connection.provider,
      totalMessages: syncResult.syncedCount || 0,
      syncedMessages: syncResult.newCount || 0,
      classifiedMessages: 0,
    });

    // Auto-classify messages if enabled
    let classifiedCount = 0;
    if (options.autoClassify) {
      try {
        // Get ALL unclassified messages in the workspace (not just from this connection)
        // This ensures existing unclassified messages also get processed
        // Check for EITHER priority OR category being null (some messages might have partial classification)
        const { data: unclassifiedMessages, error: queryError } = await supabase
          .from('messages')
          .select('id, subject, priority, category')
          .eq('workspace_id', workspaceId)
          .or('priority.is.null,category.is.null') // Either priority OR category is null
          .order('created_at', { ascending: false })
          .limit(100); // Limit to prevent timeout on large backlogs

        console.log(`🔍 Querying for unclassified messages in workspace ${workspaceId}...`);
        if (queryError) {
          console.error('❌ Query error:', queryError);
        }
        console.log(`📊 Found ${unclassifiedMessages?.length || 0} unclassified messages`);

        if (unclassifiedMessages && unclassifiedMessages.length > 0) {
          const totalToClassify = unclassifiedMessages.length;
          console.log(`🤖 Found ${totalToClassify} unclassified messages to process...`);
          
          // Broadcast classifying phase
          await broadcastProgress(workspaceId, {
            phase: 'classifying',
            connectionName: connection.provider_account_name || '',
            provider: connection.provider,
            totalMessages: totalToClassify,
            syncedMessages: syncResult.newCount || 0,
            classifiedMessages: 0,
          });
          
          // Classify messages one by one with progress updates
          for (let i = 0; i < unclassifiedMessages.length; i++) {
            const msg = unclassifiedMessages[i];
            // Indicate if this is an existing message vs newly synced
            const isExisting = i >= (syncResult.newCount || 0);
            const displaySubject = isExisting 
              ? `Fixing: ${msg.subject || 'Untitled'}` 
              : msg.subject || 'Processing...';
            
            try {
              console.log(`   🏷️ Classifying message ${i + 1}/${totalToClassify}: ${msg.subject?.substring(0, 40) || 'No subject'}...`);
              const result = await classifyMessage(msg.id, workspaceId);
              console.log(`   ✅ Classified as: priority=${result.priority}, category=${result.category}`);
              classifiedCount++;
              
              // Broadcast progress every message (or every 2 for performance)
              if (i % 2 === 0 || i === unclassifiedMessages.length - 1) {
                await broadcastProgress(workspaceId, {
                  phase: 'classifying',
                  connectionName: connection.provider_account_name || '',
                  provider: connection.provider,
                  totalMessages: totalToClassify,
                  syncedMessages: syncResult.newCount || 0,
                  classifiedMessages: classifiedCount,
                  currentMessage: displaySubject,
                });
              }
            } catch (classifyError: any) {
              console.error(`   ❌ Classification failed for message ${msg.id}:`, classifyError?.message || classifyError);
            }
          }
          
          console.log(`✅ Classification complete: ${classifiedCount}/${totalToClassify} successful`);
        }
      } catch (error) {
        console.error('Auto-classify error:', error);
      }
    }

    // Broadcast complete phase
    await broadcastProgress(workspaceId, {
      phase: 'complete',
      connectionName: connection.provider_account_name || '',
      provider: connection.provider,
      totalMessages: classifiedCount > 0 ? classifiedCount : (syncResult.syncedCount || 0),
      syncedMessages: syncResult.newCount || 0,
      classifiedMessages: classifiedCount,
    });

    return {
      provider: connection.provider,
      connectionId,
      accountName: connection.provider_account_name,
      ...syncResult,
      classifiedCount,
      success: true,
    };
  } catch (error) {
    // Broadcast error phase
    await broadcastProgress(workspaceId, {
      phase: 'error',
      connectionName: connection.provider_account_name || '',
      provider: connection.provider,
      totalMessages: 0,
      syncedMessages: 0,
      classifiedMessages: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      provider: connection.provider,
      connectionId,
      accountName: connection.provider_account_name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync all connections for a workspace
 */
export async function syncAllWorkspaceConnections(
  workspaceId: string,
  options: {
    maxMessagesPerConnection?: number;
    autoClassify?: boolean;
  } = {}
): Promise<{
  success: boolean;
  totalConnections: number;
  totalNewMessages: number;
  results: SyncResult[];
}> {
  const supabase = await createSupabaseUserServerActionClient();

  // Get all active connections for workspace
  const { data: connections, error } = await supabase
    .from('channel_connections')
    .select('id, provider, provider_account_name')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (error || !connections || connections.length === 0) {
    return {
      success: true,
      totalConnections: 0,
      totalNewMessages: 0,
      results: [],
    };
  }

  const results: SyncResult[] = [];

  // Sync each connection
  for (const connection of connections) {
    const result = await syncChannelConnection(connection.id, workspaceId, {
      maxMessages: options.maxMessagesPerConnection || 50,
      autoClassify: options.autoClassify,
    });

    results.push(result);
  }

  const totalNewMessages = results.reduce(
    (sum, r) => sum + (r.newCount || 0),
    0
  );

  return {
    success: true,
    totalConnections: connections.length,
    totalNewMessages,
    results,
  };
}

/**
 * Get sync status for all workspace connections
 */
export async function getWorkspaceSyncStatus(workspaceId: string) {
  const supabase = await createSupabaseUserServerActionClient();

  const { data: connections, error } = await supabase
    .from('channel_connections')
    .select('id, provider, provider_account_name, last_sync_at, status, created_at')
    .eq('workspace_id', workspaceId)
    .order('last_sync_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);

  return connections || [];
}

/**
 * Schedule auto-sync (call this from a cron job or webhook)
 */
export async function scheduleAutoSync(workspaceId: string) {
  try {
    const result = await syncAllWorkspaceConnections(workspaceId, {
      maxMessagesPerConnection: 20,
      autoClassify: true,
    });

    console.log(`Auto-sync completed for workspace ${workspaceId}:`, result);

    return result;
  } catch (error) {
    console.error(`Auto-sync failed for workspace ${workspaceId}:`, error);
    throw error;
  }
}

