/**
 * Telegram Message Sync
 * Syncs messages from Telegram to Aiva.io database (polling-based)
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { createMessageAction } from '@/data/user/messages';
import { findOrCreateContactFromMessage } from '@/data/user/contacts';
import { getTelegramUpdates } from './client';

/**
 * Parse Telegram message to normalized format
 */
function parseTelegramMessage(message: any) {
  const text = message.text || message.caption || '';
  const senderName = `${message.from.first_name || ''}${message.from.last_name ? ' ' + message.from.last_name : ''}`.trim() || 
                    message.from.username || 
                    `Telegram User ${message.from.id}`;

  return {
    providerMessageId: String(message.message_id),
    providerThreadId: String(message.chat.id),
    subject: null,
    body: text,
    bodyHtml: null,
    snippet: text.substring(0, 200),
    senderEmail: null,
    senderName,
    senderId: String(message.from.id),
    recipients: [],
    timestamp: new Date(message.date * 1000).toISOString(),
    labels: [],
    rawData: message,
  };
}

/**
 * Sync Telegram messages for a channel connection (polling)
 */
export async function syncTelegramMessages(
  connectionId: string,
  workspaceId: string,
  options: {
    maxMessages?: number;
  } = {}
) {
  try {
    const supabase = await createSupabaseUserServerActionClient();

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (connectionError || !connection) {
      throw new Error('Channel connection not found');
    }

    if (connection.provider !== 'telegram') {
      throw new Error('Connection is not a Telegram account');
    }

    const userId = connection.user_id;

    console.log('📱 Telegram sync starting', {
      connectionId,
      workspaceId,
      maxMessages: options.maxMessages,
    });

    // Get last update ID from sync cursor
    const lastUpdateId = connection.sync_cursor ? parseInt(connection.sync_cursor) : 0;

    // Get updates from Telegram
    const updatesResponse = await getTelegramUpdates({
      offset: lastUpdateId + 1,
      limit: options.maxMessages || 50,
      timeout: 0, // No long polling for sync
    });

    const updates = updatesResponse.result || [];

    console.log('📱 Telegram updates fetched', {
      connectionId,
      workspaceId,
      totalUpdates: updates.length,
      lastUpdateId,
    });

    if (updates.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        newCount: 0,
        message: 'No new messages to sync',
      };
    }

    let syncedCount = 0;
    let newCount = 0;
    let errorCount = 0;
    let maxUpdateId = lastUpdateId;

    // Process each update
    for (const update of updates) {
      try {
        maxUpdateId = Math.max(maxUpdateId, update.update_id);

        // Handle message (prefer edited_message if present)
        const message = update.edited_message || update.message;
        if (!message) {
          continue;
        }

        // Skip bot messages
        if (message.from.is_bot) {
          continue;
        }

        // Only process private messages
        if (message.chat.type !== 'private') {
          continue;
        }

        const parsed = parseTelegramMessage(message);

        // Check if message already exists
        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('channel_connection_id', connectionId)
          .eq('provider_message_id', parsed.providerMessageId)
          .single();

        if (existing) {
          syncedCount++;
          continue;
        }

        // Store message
        const result = await createMessageAction({
          workspaceId,
          channelConnectionId: connectionId,
          providerMessageId: parsed.providerMessageId,
          providerThreadId: parsed.providerThreadId,
          subject: parsed.subject,
          body: parsed.body,
          bodyHtml: parsed.bodyHtml,
          snippet: parsed.snippet,
          senderEmail: parsed.senderEmail,
          senderName: parsed.senderName,
          recipients: parsed.recipients,
          timestamp: parsed.timestamp,
          labels: parsed.labels,
          rawData: parsed.rawData,
        });

        if (result?.data && !(result.data as any).isDuplicate) {
          newCount++;

          // Create or link contact
          try {
            await findOrCreateContactFromMessage(
              workspaceId,
              userId,
              'telegram',
              parsed.senderEmail,
              parsed.senderName,
              parsed.senderId
            );
          } catch (contactError) {
            console.error(`Failed to create/link contact:`, contactError);
          }
        }

        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync update ${update.update_id}:`, error);
        errorCount++;
      }
    }

    // Update last sync time and cursor
    await supabase
      .from('channel_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_cursor: String(maxUpdateId),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return {
      success: true,
      syncedCount,
      newCount,
      errorCount,
      hasMore: updates.length >= (options.maxMessages || 50),
      message: `Synced ${syncedCount} messages (${newCount} new, ${errorCount} errors)`,
    };
  } catch (error) {
    console.error('Telegram sync error:', error);
    throw error;
  }
}

