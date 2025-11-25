/**
 * Universal Sync Orchestrator
 * Coordinates syncing across all channel types
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { syncGmailMessages } from '@/lib/gmail/sync';
import { syncOutlookMessages } from '@/lib/outlook/sync';
import { classifyMessage } from '@/lib/ai/classifier';

export type ChannelProvider =
  | 'gmail'
  | 'outlook'
  | 'slack'
  | 'teams'
  | 'whatsapp'
  | 'instagram'
  | 'facebook_messenger'
  | 'linkedin';

export interface SyncResult {
  provider: ChannelProvider;
  connectionId: string;
  accountName: string | null;
  success: boolean;
  syncedCount?: number;
  newCount?: number;
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
    return {
      provider: 'gmail',
      connectionId,
      accountName: null,
      success: false,
      error: 'Connection not found',
    };
  }

  try {
    let syncResult;

    // Route to appropriate sync function
    switch (connection.provider) {
      case 'gmail':
        syncResult = await syncGmailMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
          query: 'is:unread',
        });
        break;

      case 'outlook':
        syncResult = await syncOutlookMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
          filter: 'isRead eq false',
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

    // Auto-classify new messages if enabled
    if (options.autoClassify && syncResult.newCount && syncResult.newCount > 0) {
      try {
        // Get newly synced messages
        const { data: newMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('channel_connection_id', connectionId)
          .is('priority', null)
          .order('created_at', { ascending: false })
          .limit(syncResult.newCount);

        if (newMessages && newMessages.length > 0) {
          // Classify in background (don't wait)
          Promise.all(
            newMessages.map((msg) => classifyMessage(msg.id, workspaceId))
          ).catch((err) => console.error('Auto-classification error:', err));
        }
      } catch (error) {
        console.error('Auto-classify error:', error);
      }
    }

    return {
      provider: connection.provider,
      connectionId,
      accountName: connection.provider_account_name,
      success: true,
      ...syncResult,
    };
  } catch (error) {
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

