/**
 * Twitter Message Sync
 * Syncs direct messages from Twitter/X to Aiva.io database
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { createMessageAction } from '@/data/user/messages';
import { findOrCreateContactFromMessage } from '@/data/user/contacts';
import { getTwitterAccessToken, listTwitterDMs, getTwitterUser } from './client';

/**
 * Parse Twitter DM to normalized format
 */
function parseTwitterDM(dm: any, accessToken: string) {
  // Twitter DM structure from API v2
  const senderId = dm.dm_conversation_id?.split('-').find((id: string) => id !== dm.participant_id);
  const text = dm.text || '';
  const createdAt = dm.created_timestamp || new Date().toISOString();

  return {
    providerMessageId: dm.id,
    providerThreadId: dm.dm_conversation_id,
    subject: null, // DMs don't have subjects
    body: text,
    bodyHtml: null,
    snippet: text.substring(0, 200),
    senderEmail: null, // Twitter doesn't provide email
    senderName: null, // Will be fetched from user API
    senderId, // Twitter user ID
    recipients: [],
    timestamp: new Date(parseInt(createdAt)).toISOString(),
    labels: [],
    rawData: dm,
    accessToken, // Pass for user lookup
  };
}

/**
 * Sync Twitter messages for a channel connection
 */
export async function syncTwitterMessages(
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

    if (connection.provider !== 'twitter') {
      throw new Error('Connection is not a Twitter account');
    }

    const userId = connection.user_id;

    console.log('🐦 Twitter sync starting', {
      connectionId,
      workspaceId,
      maxMessages: options.maxMessages,
    });

    // Get access token
    const accessToken = await getTwitterAccessToken(connectionId);

    // List DMs
    const dmsList = await listTwitterDMs(accessToken, {
      maxResults: options.maxMessages || 50,
    });

    console.log('🐦 Twitter DMs listed', {
      connectionId,
      workspaceId,
      totalDMs: dmsList.data?.length ?? 0,
      nextToken: dmsList.meta?.next_token,
    });

    if (!dmsList.data || dmsList.data.length === 0) {
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

    // Process each DM
    for (const dm of dmsList.data) {
      try {
        const parsed = parseTwitterDM(dm, accessToken);

        // Get sender info from Twitter API
        if (parsed.senderId) {
          try {
            const senderInfo = await getTwitterUser(accessToken, parsed.senderId);
            parsed.senderName = senderInfo.data?.name || senderInfo.data?.username || 'Twitter User';
          } catch (err) {
            console.warn('Failed to fetch sender info:', err);
            parsed.senderName = 'Twitter User';
          }
        }

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
              'twitter',
              parsed.senderEmail,
              parsed.senderName,
              parsed.senderId || parsed.senderName
            );
          } catch (contactError) {
            console.error(`Failed to create/link contact:`, contactError);
          }
        }

        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync DM ${dm.id}:`, error);
        errorCount++;
      }
    }

    // Update last sync time
    await supabase
      .from('channel_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_cursor: dmsList.meta?.next_token || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return {
      success: true,
      syncedCount,
      newCount,
      errorCount,
      hasMore: !!dmsList.meta?.next_token,
      nextPageToken: dmsList.meta?.next_token,
      message: `Synced ${syncedCount} messages (${newCount} new, ${errorCount} errors)`,
    };
  } catch (error) {
    console.error('Twitter sync error:', error);
    throw error;
  }
}

