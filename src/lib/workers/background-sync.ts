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

export interface BackgroundSyncOptions {
  workspaceId?: string; // If provided, only sync this workspace
  connectionId?: string; // If provided, only sync this connection
  maxMessages?: number;
  autoClassify?: boolean;
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
    const result = await syncAllWorkspaceConnections(workspaceId, {
      maxMessagesPerConnection: options.maxMessages || 50,
      autoClassify: options.autoClassify ?? true,
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

    // Sync each workspace
    for (const workspace of workspaces) {
      try {
        const result = await syncWorkspaceInBackground(workspace.id, options);
        if (result.success) {
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
      workspacesProcessed: workspaces.length,
      connectionsProcessed: totalConnections,
      totalNewMessages,
      totalErrors,
      message: `Synced ${workspaces.length} workspaces: ${totalConnections} connections, ${totalNewMessages} new messages`,
    };
  } catch (error) {
    console.error('Background sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

