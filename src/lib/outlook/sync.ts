/**
 * Outlook Message Sync
 * Syncs messages from Outlook to Aiva.io database
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import {
  getOutlookAccessToken,
  listOutlookMessages,
  getOutlookMessage,
  parseOutlookMessage,
} from './client';
import { createMessageAction } from '@/data/user/messages';
import { findOrCreateContactFromMessage } from '@/data/user/contacts';

/**
 * Sync Outlook messages for a channel connection
 * @param useAdminClient - Use admin client for background jobs (cron, webhooks)
 */
export async function syncOutlookMessages(
  connectionId: string,
  workspaceId: string,
  options: {
    maxMessages?: number;
    filter?: string;
    useAdminClient?: boolean;
  } = {}
) {
  try {
    // Use admin client for background jobs that don't have user context
    const supabase = options.useAdminClient 
      ? supabaseAdminClient 
      : await createSupabaseUserServerActionClient();

    // Get connection details (including user_id for contact creation)
    const { data: connection, error: connectionError } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (connectionError || !connection) {
      throw new Error('Channel connection not found');
    }

    if (connection.provider !== 'outlook') {
      throw new Error('Connection is not an Outlook account');
    }

    const userId = connection.user_id;

    // Get access token (will refresh if needed)
    const accessToken = await getOutlookAccessToken(connectionId);

    console.log('📥 Outlook sync starting', {
      connectionId,
      workspaceId,
      userId,
      maxMessages: options.maxMessages,
      filter: options.filter,
    });

    // List messages
    // Default to no filter (sync recent messages) like Gmail, unless explicitly provided
    // This ensures we sync messages regardless of read status to create contacts
    const messagesList = await listOutlookMessages(accessToken, {
      maxResults: options.maxMessages || 50,
      filter: options.filter || undefined, // No filter = sync recent messages
    });

    console.log('📥 Outlook messages listed', {
      connectionId,
      workspaceId,
      totalMessages: messagesList.value?.length ?? 0,
    });

    if (!messagesList.value || messagesList.value.length === 0) {
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

    // Process each message
    for (const message of messagesList.value) {
      try {
        // Parse to normalized format
        const parsed = parseOutlookMessage(message);

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

        // Store message in database
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
          
          // Create or link contact for this message sender
          try {
            const contactResult = await findOrCreateContactFromMessage(
              workspaceId,
              userId,
              'outlook', // channel type
              parsed.senderEmail, // email
              parsed.senderName, // name
              parsed.senderEmail // channel ID (email for Outlook)
            );
            console.log('✅ Contact created/linked for Outlook message', {
              senderEmail: parsed.senderEmail,
              senderName: parsed.senderName,
              contactId: contactResult.contactId,
              isNew: contactResult.isNew,
            });
          } catch (contactError) {
            // Log but don't fail the sync if contact creation fails
            console.error(`❌ Failed to create/link contact for ${parsed.senderEmail}:`, contactError);
          }
        }
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync message ${message.id}:`, error);
        errorCount++;
      }
    }

    // Update last sync time
    await supabase
      .from('channel_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_cursor: messagesList['@odata.nextLink'] || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return {
      success: true,
      syncedCount,
      newCount,
      errorCount,
      hasMore: !!messagesList['@odata.nextLink'],
      message: `Synced ${syncedCount} messages (${newCount} new, ${errorCount} errors)`,
    };
  } catch (error) {
    console.error('Outlook sync error:', error);
    throw error;
  }
}

