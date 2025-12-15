/**
 * Inbox Zero Message Handler
 * Central handler for marking messages as handled and archiving in providers
 */

'use server';

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { handleGmailMessage } from '@/lib/gmail/actions';
import { handleOutlookMessage } from '@/lib/outlook/actions';

export type HandleAction = 
  | 'auto_replied' 
  | 'classified_no_action' 
  | 'manually_dismissed' 
  | 'manually_handled';

export interface HandleMessageOptions {
  action: HandleAction;
  markRead?: boolean;
  archive?: boolean;
  applyLabel?: boolean;
  userId?: string;
}

export interface HandleMessageResult {
  success: boolean;
  handledAt?: string;
  archivedInProvider: boolean;
  providerActions?: {
    markedRead: boolean;
    archived: boolean;
    labeled: boolean;
  };
  error?: string;
}

/**
 * Get workspace settings for inbox zero
 */
async function getInboxZeroSettings(workspaceId: string) {
  const { data } = await supabaseAdminClient
    .from('workspace_settings')
    .select('inbox_zero_enabled, auto_archive_handled, apply_aiva_label')
    .eq('workspace_id', workspaceId)
    .single();

  return {
    enabled: data?.inbox_zero_enabled ?? true,
    autoArchive: data?.auto_archive_handled ?? true,
    applyLabel: data?.apply_aiva_label ?? true,
  };
}

/**
 * Mark a message as handled by Aiva and optionally archive in provider
 */
export async function markMessageHandled(
  messageId: string,
  workspaceId: string,
  options: HandleMessageOptions
): Promise<HandleMessageResult> {
  const supabase = supabaseAdminClient;
  
  try {
    // Get inbox zero settings
    const settings = await getInboxZeroSettings(workspaceId);

    // Get message details including provider info
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        provider_message_id,
        channel_connection_id,
        channel_connection:channel_connections(provider)
      `)
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return {
        success: false,
        archivedInProvider: false,
        error: 'Message not found',
      };
    }

    const handledAt = new Date().toISOString();
    let archivedInProvider = false;
    let providerActions: HandleMessageResult['providerActions'] | undefined;

    // If inbox zero is enabled, archive in provider
    if (settings.enabled && message.provider_message_id && message.channel_connection_id) {
      const provider = (message.channel_connection as any)?.provider;
      
      const archiveOptions = {
        markRead: options.markRead ?? true,
        archive: settings.autoArchive && (options.archive ?? true),
        applyLabel: settings.applyLabel && (options.applyLabel ?? true),
      };

      if (provider === 'gmail') {
        const result = await handleGmailMessage(
          message.channel_connection_id,
          message.provider_message_id,
          archiveOptions
        );
        archivedInProvider = result.success && result.actions.archived;
        providerActions = result.actions;
      } else if (provider === 'outlook') {
        const result = await handleOutlookMessage(
          message.channel_connection_id,
          message.provider_message_id,
          {
            ...archiveOptions,
            applyCategory: archiveOptions.applyLabel, // Map applyLabel to applyCategory for Outlook
          }
        );
        archivedInProvider = result.success && result.actions.archived;
        providerActions = {
          markedRead: result.actions.markedRead,
          archived: result.actions.archived,
          labeled: result.actions.categorized,
        };
      }
    }

    // Update message in database
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        handled_by_aiva: true,
        handled_at: handledAt,
        handle_action: options.action,
        archived_in_provider: archivedInProvider,
        updated_at: handledAt,
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('[Inbox Zero] Failed to update message:', updateError);
      return {
        success: false,
        archivedInProvider,
        providerActions,
        error: updateError.message,
      };
    }

    // Log the handle action
    await supabase.from('message_handle_log').insert({
      workspace_id: workspaceId,
      message_id: messageId,
      user_id: options.userId,
      action: options.action,
      provider_action: archivedInProvider ? 'archived' : providerActions?.markedRead ? 'read' : null,
      provider_message_id: message.provider_message_id,
      success: true,
      metadata: { providerActions },
    });

    return {
      success: true,
      handledAt,
      archivedInProvider,
      providerActions,
    };
  } catch (error) {
    console.error('[Inbox Zero] Error handling message:', error);
    return {
      success: false,
      archivedInProvider: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch mark messages as handled
 */
export async function batchMarkMessagesHandled(
  messageIds: string[],
  workspaceId: string,
  options: HandleMessageOptions
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{ messageId: string; result: HandleMessageResult }>;
}> {
  const results: Array<{ messageId: string; result: HandleMessageResult }> = [];
  let successful = 0;
  let failed = 0;

  for (const messageId of messageIds) {
    const result = await markMessageHandled(messageId, workspaceId, options);
    results.push({ messageId, result });
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return {
    total: messageIds.length,
    successful,
    failed,
    results,
  };
}

/**
 * Handle messages that don't need a response (FYI, notifications, etc.)
 * Called after classification
 */
export async function handleNoActionNeeded(
  messageId: string,
  workspaceId: string
): Promise<HandleMessageResult> {
  return markMessageHandled(messageId, workspaceId, {
    action: 'classified_no_action',
    markRead: true,
    archive: true,
    applyLabel: true,
  });
}

/**
 * Restore a message (undo handling)
 */
export async function restoreMessage(
  messageId: string,
  workspaceId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = supabaseAdminClient;

  try {
    // Get message details
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        provider_message_id,
        channel_connection_id,
        channel_connection:channel_connections(provider)
      `)
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return { success: false, error: 'Message not found' };
    }

    // Restore in provider
    if (message.provider_message_id && message.channel_connection_id) {
      const provider = (message.channel_connection as any)?.provider;
      
      if (provider === 'gmail') {
        const { restoreGmailMessage } = await import('@/lib/gmail/actions');
        await restoreGmailMessage(message.channel_connection_id, message.provider_message_id);
      } else if (provider === 'outlook') {
        const { restoreOutlookMessage } = await import('@/lib/outlook/actions');
        await restoreOutlookMessage(message.channel_connection_id, message.provider_message_id);
      }
    }

    // Update message in database
    await supabase
      .from('messages')
      .update({
        handled_by_aiva: false,
        handled_at: null,
        handle_action: null,
        archived_in_provider: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    // Log the restore action
    await supabase.from('message_handle_log').insert({
      workspace_id: workspaceId,
      message_id: messageId,
      user_id: userId,
      action: 'restored',
      provider_action: 'restored',
      provider_message_id: message.provider_message_id,
      success: true,
    });

    return { success: true };
  } catch (error) {
    console.error('[Inbox Zero] Error restoring message:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

