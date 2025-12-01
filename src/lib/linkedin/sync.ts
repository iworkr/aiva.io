/**
 * LinkedIn Message Sync
 * Syncs messages from LinkedIn to Aiva.io database
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { createMessageAction } from '@/data/user/messages';
import { findOrCreateContactFromMessage } from '@/data/user/contacts';
import { getLinkedInAccessToken, getLinkedInMessages } from './client';

/**
 * Parse LinkedIn message to normalized format
 */
function parseLinkedInMessage(message: any, conversation: any) {
  const text = message.body?.text || '';
  const senderId = message.from?.entity || conversation.participants?.find((p: any) => p !== conversation.entityUrn);
  const createdAt = message.createdAt || new Date().toISOString();

  return {
    providerMessageId: message.id || message.entityUrn,
    providerThreadId: conversation.id || conversation.entityUrn,
    subject: conversation.subject || null,
    body: text,
    bodyHtml: null,
    snippet: text.substring(0, 200),
    senderEmail: null, // LinkedIn doesn't provide email in messages
    senderName: null, // Will need to fetch from profile
    senderId,
    recipients: [],
    timestamp: new Date(createdAt).toISOString(),
    labels: [],
    rawData: message,
  };
}

/**
 * Sync LinkedIn messages for a channel connection
 */
export async function syncLinkedInMessages(
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

    if (connection.provider !== 'linkedin') {
      throw new Error('Connection is not a LinkedIn account');
    }

    const userId = connection.user_id;

    console.log('💼 LinkedIn sync starting', {
      connectionId,
      workspaceId,
      maxMessages: options.maxMessages,
    });

    // Get access token
    const accessToken = await getLinkedInAccessToken(connectionId);

    // List conversations
    const conversationsResponse = await getLinkedInMessages(accessToken, {
      maxResults: options.maxMessages || 50,
    });

    console.log('💼 LinkedIn conversations listed', {
      connectionId,
      workspaceId,
      totalConversations: conversationsResponse.elements?.length ?? 0,
    });

    if (!conversationsResponse.elements || conversationsResponse.elements.length === 0) {
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

    // Process each conversation
    for (const conversation of conversationsResponse.elements) {
      try {
        // Get messages for this conversation
        // Note: LinkedIn API structure may vary - this is a simplified version
        const messages = conversation.lastActivityAt ? [conversation] : [];

        for (const message of messages) {
          const parsed = parseLinkedInMessage(message, conversation);

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
            senderName: parsed.senderName || 'LinkedIn User',
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
                'linkedin',
                parsed.senderEmail,
                parsed.senderName || 'LinkedIn User',
                parsed.senderId || 'linkedin-user'
              );
            } catch (contactError) {
              console.error(`Failed to create/link contact:`, contactError);
            }
          }

          syncedCount++;
        }
      } catch (error) {
        console.error(`Failed to sync LinkedIn conversation:`, error);
        errorCount++;
      }
    }

    // Update last sync time
    await supabase
      .from('channel_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return {
      success: true,
      syncedCount,
      newCount,
      errorCount,
      hasMore: false, // LinkedIn pagination handled differently
      message: `Synced ${syncedCount} messages (${newCount} new, ${errorCount} errors)`,
    };
  } catch (error) {
    console.error('LinkedIn sync error:', error);
    throw error;
  }
}

