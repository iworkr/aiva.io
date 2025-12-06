/**
 * Background Sync Worker
 * Handles automatic message syncing in the background
 * Can be called from webhooks, cron jobs, or scheduled tasks
 */

'use server';

import { syncAllWorkspaceConnections } from '@/lib/sync/orchestrator';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { syncGmailMessages } from '@/lib/gmail/sync';
import { syncOutlookMessages } from '@/lib/outlook/sync';
import { PLAN_SYNC_LIMITS } from '@/utils/subscriptions';

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface BackgroundSyncOptions {
  workspaceId?: string; // If provided, only sync this workspace
  connectionId?: string; // If provided, only sync this connection
  maxMessages?: number;
  autoClassify?: boolean;
  tier?: string; // For tiered cron jobs: 'free', 'basic', 'pro', 'enterprise'
}

export interface BackgroundSyncResult {
  success: boolean;
  workspacesProcessed?: number;
  connectionsProcessed?: number;
  totalNewMessages?: number;
  totalErrors?: number;
  message?: string;
  error?: string;
}

/**
 * Sync a single connection in the background
 */
export async function syncConnectionInBackground(
  connectionId: string,
  workspaceId: string,
  options: { maxMessages?: number; autoClassify?: boolean } = {}
): Promise<BackgroundSyncResult> {
  try {
    const supabase = supabaseAdminClient;

    // Get connection details
    const { data: connection, error } = await supabase
      .from('channel_connections')
      .select('provider, provider_account_name')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .single();

    if (error || !connection) {
      return {
        success: false,
        error: 'Connection not found or inactive',
      };
    }

    let syncResult;

    // Route to appropriate sync function
    switch (connection.provider) {
      case 'gmail':
        syncResult = await syncGmailMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
          query: '', // Sync all recent messages
        });
        break;

      case 'outlook':
        syncResult = await syncOutlookMessages(connectionId, workspaceId, {
          maxMessages: options.maxMessages || 50,
          // No filter = sync all recent messages
        });
        break;

      default:
        return {
          success: false,
          error: `Sync not supported for ${connection.provider}`,
        };
    }

    return {
      success: true,
      connectionsProcessed: 1,
      totalNewMessages: syncResult.newCount || 0,
      message: `Synced ${connection.provider} connection: ${syncResult.syncedCount} messages (${syncResult.newCount} new)`,
    };
  } catch (error) {
    console.error('Background sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync all connections for a workspace in the background
 */
export async function syncWorkspaceInBackground(
  workspaceId: string,
  options: BackgroundSyncOptions = {}
): Promise<BackgroundSyncResult> {
  try {
    // Use admin client since this is called from background jobs without user context
    const result = await syncAllWorkspaceConnections(workspaceId, {
      maxMessagesPerConnection: options.maxMessages || 50,
      autoClassify: options.autoClassify ?? true,
      useAdminClient: true, // Critical: use admin client for background sync
    });

    return {
      success: true,
      connectionsProcessed: result.totalConnections,
      totalNewMessages: result.totalNewMessages,
      totalErrors: 0, // Calculate from results if needed
      message: `Synced workspace: ${result.totalConnections} connections, ${result.totalNewMessages} new messages`,
    };
  } catch (error) {
    console.error('Workspace background sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get workspace plan type from subscription data
 * 
 * Note: Currently returns 'free' for all workspaces since billing is not yet set up.
 * When billing is enabled, this will query through billing_customers to get subscription data.
 */
async function getWorkspacePlan(workspaceId: string): Promise<PlanTier> {
  // TODO: When billing is set up, query billing_customers -> billing_subscriptions
  // For now, return 'free' for all workspaces
  console.log(`📊 Getting plan for workspace ${workspaceId}: free (billing not configured)`);
  return 'free';
}

/**
 * Check if workspace should be synced based on its plan and last sync time
 */
async function shouldSyncWorkspace(workspaceId: string, tier?: string): Promise<boolean> {
  const supabase = supabaseAdminClient;
  const planType = await getWorkspacePlan(workspaceId);

  // If a tier filter is provided, only sync workspaces on that tier
  if (tier && planType !== tier) {
    return false;
  }

  // Get workspace settings to check last sync time
  // Note: sync_frequency_minutes may not exist if migration not applied
  const { data: settings } = await supabase
    .from('workspace_settings')
    .select('workspace_settings')
    .eq('workspace_id', workspaceId)
    .single();

  // Cast to include optional sync_frequency_minutes (may not exist if migration not applied)
  type SettingsWithSync = { 
    workspace_settings: Record<string, unknown>; 
    sync_frequency_minutes?: number;
  };
  const typedSettings = settings as unknown as SettingsWithSync | null;
  const syncFrequency = typedSettings?.sync_frequency_minutes || PLAN_SYNC_LIMITS[planType].minSyncIntervalMinutes;

  // Get the most recent sync time from connections
  // Note: Using updated_at as fallback if last_sync_at doesn't exist
  const { data: connections } = await supabase
    .from('channel_connections')
    .select('updated_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1);

  if (!connections || connections.length === 0) {
    // No connections, nothing to sync
    return false;
  }

  // Cast to include optional last_sync_at (may not exist if migration not applied)
  type ConnectionWithSync = { 
    updated_at: string; 
    last_sync_at?: string | null;
  };
  const typedConnections = connections as unknown as ConnectionWithSync[];
  const lastSyncAt = typedConnections[0].last_sync_at || typedConnections[0].updated_at;
  
  if (!lastSyncAt) {
    // Never synced before, should sync
    return true;
  }

  // Check if enough time has passed since last sync
  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const minutesSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);

  return minutesSinceLastSync >= syncFrequency;
}

/**
 * Update last sync time for a connection
 */
async function updateConnectionSyncTime(connectionId: string): Promise<void> {
  const supabase = supabaseAdminClient;
  await supabase
    .from('channel_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);
}

/**
 * Sync all active workspaces in the background
 * This is the main function called by cron jobs
 */
export async function syncAllWorkspacesInBackground(
  options: BackgroundSyncOptions = {}
): Promise<BackgroundSyncResult> {
  try {
    const supabase = supabaseAdminClient;

    // Get all active workspaces
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('id')
      .eq('is_active', true);

    if (error) {
      return {
        success: false,
        error: `Failed to fetch workspaces: ${error.message}`,
      };
    }

    if (!workspaces || workspaces.length === 0) {
      return {
        success: true,
        workspacesProcessed: 0,
        message: 'No active workspaces to sync',
      };
    }

    let totalConnections = 0;
    let totalNewMessages = 0;
    let totalErrors = 0;
    let workspacesProcessed = 0;

    // Sync each workspace
    for (const workspace of workspaces) {
      try {
        // Check if this workspace should be synced based on tier and sync frequency
        const shouldSync = await shouldSyncWorkspace(workspace.id, options.tier);
        if (!shouldSync) {
          continue;
        }

        const result = await syncWorkspaceInBackground(workspace.id, options);
        if (result.success) {
          workspacesProcessed++;
          totalConnections += result.connectionsProcessed || 0;
          totalNewMessages += result.totalNewMessages || 0;
          totalErrors += result.totalErrors || 0;
        } else {
          totalErrors++;
        }
      } catch (error) {
        console.error(`Failed to sync workspace ${workspace.id}:`, error);
        totalErrors++;
      }
    }

    return {
      success: true,
      workspacesProcessed,
      connectionsProcessed: totalConnections,
      totalNewMessages,
      totalErrors,
      message: `Synced ${workspacesProcessed}/${workspaces.length} workspaces: ${totalConnections} connections, ${totalNewMessages} new messages`,
    };
  } catch (error) {
    console.error('Background sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export { updateConnectionSyncTime };

