/**
 * Gmail Message Sync
 * Syncs messages from Gmail to Aiva.io database
 */

"use server";

import { createMessageAction } from "@/data/user/messages";
import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { supabaseAdminClient } from "@/supabase-clients/admin/supabaseAdminClient";
import {
  getGmailAccessToken,
  getGmailMessage,
  listGmailMessages,
  getGmailHistory,
  getGmailProfileWithHistory,
  parseGmailMessage,
} from "./client";
import { findOrCreateContactFromMessage } from "@/data/user/contacts";

/**
 * Sync Gmail messages for a channel connection
 * @param useAdminClient - Use admin client for background jobs (cron, webhooks)
 */
export async function syncGmailMessages(
  connectionId: string,
  workspaceId: string,
  options: {
    maxMessages?: number;
    query?: string;
    useAdminClient?: boolean;
  } = {},
) {
  try {
    // Use admin client for background jobs that don't have user context
    const supabase = options.useAdminClient 
      ? supabaseAdminClient 
      : await createSupabaseUserServerActionClient();

    // Get connection details (including user_id for contact creation)
    const { data: connection, error: connectionError } = await supabase
      .from("channel_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (connectionError || !connection) {
      throw new Error("Channel connection not found");
    }

    if (connection.provider !== "gmail") {
      throw new Error("Connection is not a Gmail account");
    }

    const userId = connection.user_id;

    console.log("📥 Gmail sync starting", {
      connectionId,
      workspaceId,
      maxMessages: options.maxMessages,
      query: options.query,
      hasHistoryId: !!connection.sync_cursor,
    });

    // Get access token (will refresh if needed)
    const accessToken = await getGmailAccessToken(connectionId);

    let messageIds: string[] = [];
    let newHistoryId: string | null = null;

    // Try to use History API for incremental sync (much more efficient)
    if (connection.sync_cursor && !options.query) {
      console.log("📥 Using Gmail History API for incremental sync...");
      try {
        const history = await getGmailHistory(accessToken, connection.sync_cursor, {
          maxResults: options.maxMessages || 10,
          labelId: 'INBOX',
        });
        
        newHistoryId = history.historyId;
        
        // Extract message IDs from history
        if (history.history) {
          for (const h of history.history) {
            if (h.messagesAdded) {
              for (const added of h.messagesAdded) {
                if (!messageIds.includes(added.message.id)) {
                  messageIds.push(added.message.id);
                }
              }
            }
          }
        }
        
        console.log(`📥 History API: ${messageIds.length} new messages since last sync`);
        
        if (messageIds.length === 0) {
          // Update historyId even if no new messages
          await supabase
            .from("channel_connections")
            .update({
              sync_cursor: newHistoryId,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", connectionId);
            
          return {
            success: true,
            syncedCount: 0,
            newCount: 0,
            skippedCount: 0,
            message: "No new messages since last sync (via History API)",
          };
        }
      } catch (historyError) {
        console.log("📥 History API failed, falling back to list:", historyError);
        // Fall back to list API
      }
    }

    // Fall back to List API if History API didn't work or no sync_cursor
    if (messageIds.length === 0) {
      // Get current historyId for future incremental syncs
      try {
        const profile = await getGmailProfileWithHistory(accessToken);
        newHistoryId = profile.historyId;
      } catch (e) {
        console.log("📥 Could not get historyId:", e);
      }

      const messagesList = await listGmailMessages(accessToken, {
        maxResults: options.maxMessages || 10,
        q: options.query ?? "",
      });

      console.log("📥 Gmail messages listed", {
        connectionId,
        workspaceId,
        totalRefs: messagesList.messages?.length ?? 0,
        nextPageToken: messagesList.nextPageToken,
      });

      if (!messagesList.messages || messagesList.messages.length === 0) {
        // Update historyId for next sync
        if (newHistoryId) {
          await supabase
            .from("channel_connections")
            .update({
              sync_cursor: newHistoryId,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", connectionId);
        }
        
        return {
          success: true,
          syncedCount: 0,
          newCount: 0,
          message: "No new messages to sync",
        };
      }
      
      messageIds = messagesList.messages.map((m: any) => m.id);
    }

    let syncedCount = 0;
    let newCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // First, check which messages already exist in our database to avoid unnecessary API calls
    const { data: existingMessages } = await supabase
      .from("messages")
      .select("provider_message_id")
      .eq("channel_connection_id", connectionId)
      .in("provider_message_id", messageIds);
    
    const existingIds = new Set((existingMessages || []).map(m => m.provider_message_id));
    
    console.log(`📥 Checking ${messageIds.length} messages, ${existingIds.size} already synced`);

    // Fetch and store only NEW messages (not already in database)
    for (const messageId of messageIds) {
      // Skip if message already exists - BEFORE making API call
      if (existingIds.has(messageId)) {
        skippedCount++;
        syncedCount++;
        continue;
      }

      try {
        // Get full message details - only for NEW messages
        const gmailMessage = await getGmailMessage(accessToken, messageId);

        // Parse to normalized format
        const parsed = parseGmailMessage(gmailMessage);

        // CRITICAL: Skip SENT messages - they should not be processed for auto-reply
        // This prevents the infinite reply loop where we reply to our own sent messages
        if (parsed.labels.some((l: string) => l.toUpperCase() === 'SENT')) {
          console.log(`📥 Skipping SENT message: ${parsed.subject?.substring(0, 30) || messageId}`);
          skippedCount++;
          continue;
        }

        // Also skip if sender is our own account (connection email)
        const connectionEmail = connection.provider_account_id?.toLowerCase() || '';
        if (connectionEmail && parsed.senderEmail?.toLowerCase() === connectionEmail) {
          console.log(`📥 Skipping self-sent message: ${parsed.subject?.substring(0, 30) || messageId}`);
          skippedCount++;
          continue;
        }

        // Store message in database directly (no need to check exists - we already did above)
        const { data: inserted, error: insertError } = await supabase
          .from("messages")
          .insert({
            workspace_id: workspaceId,
            channel_connection_id: connectionId,
            provider_message_id: parsed.providerMessageId,
            provider_thread_id: parsed.providerThreadId,
            subject: parsed.subject,
            body: parsed.body,
            body_html: parsed.bodyHtml,
            snippet: parsed.snippet,
            sender_email: parsed.senderEmail,
            sender_name: parsed.senderName,
            recipients: parsed.recipients,
            timestamp: parsed.timestamp,
            labels: parsed.labels,
            // Cast to any to satisfy Supabase Json type
            raw_data: parsed.rawData as any,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(
            `Failed to insert Gmail message ${messageId} into messages:`,
            insertError,
          );
          errorCount++;
          continue;
        }

        if (inserted?.id) {
          newCount++;
          
          // Create or link contact for this message sender
          try {
            await findOrCreateContactFromMessage(
              workspaceId,
              userId,
              'gmail', // channel type
              parsed.senderEmail, // email
              parsed.senderName, // name
              parsed.senderEmail, // channel ID (email for Gmail)
              { useAdminClient: options.useAdminClient } // Pass through for background jobs
            );
          } catch (contactError) {
            // Log but don't fail the sync if contact creation fails
            console.error(`Failed to create/link contact for ${parsed.senderEmail}:`, contactError);
          }
        }
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync message ${messageId}:`, error);
        errorCount++;
      }
    }

    // Update last sync time and historyId (for incremental sync)
    await supabase
      .from("channel_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_cursor: newHistoryId || connection.sync_cursor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    console.log(`📥 Gmail sync complete: ${newCount} new, ${skippedCount} skipped (already synced), ${errorCount} errors`);
    
    return {
      success: true,
      syncedCount,
      newCount,
      skippedCount,
      errorCount,
      message: `Synced ${syncedCount} messages (${newCount} new, ${skippedCount} skipped, ${errorCount} errors)`,
    };
  } catch (error) {
    console.error("Gmail sync error:", error);
    throw error;
  }
}

/**
 * Sync all Gmail connections for a workspace
 */
export async function syncAllGmailConnectionsForWorkspace(workspaceId: string) {
  const supabase = await createSupabaseUserServerActionClient();

  // Get all active Gmail connections for workspace
  const { data: connections, error } = await supabase
    .from("channel_connections")
    .select("id, provider_account_name")
    .eq("workspace_id", workspaceId)
    .eq("provider", "gmail")
    .eq("status", "active");

  if (error || !connections || connections.length === 0) {
    return {
      success: true,
      message: "No active Gmail connections found",
      results: [],
    };
  }

  const results = [];

  for (const connection of connections) {
    try {
      const result = await syncGmailMessages(connection.id, workspaceId);
      results.push({
        connectionId: connection.id,
        accountName: connection.provider_account_name,
        ...result,
      });
    } catch (error) {
      results.push({
        connectionId: connection.id,
        accountName: connection.provider_account_name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const totalNew = results.reduce(
    (sum, r) => sum + ((r as any).newCount || 0),
    0,
  );

  return {
    success: true,
    connectionsProcessed: connections.length,
    totalNewMessages: totalNew,
    results,
  };
}

/**
 * Sync specific Gmail thread
 */
export async function syncGmailThread(
  connectionId: string,
  workspaceId: string,
  threadId: string,
) {
  try {
    const supabase = await createSupabaseUserServerActionClient();

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from("channel_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (connectionError || !connection) {
      throw new Error("Channel connection not found");
    }

    // Get access token
    const accessToken = await getGmailAccessToken(connectionId);

    // Get thread from Gmail API
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Gmail thread");
    }

    const thread = await response.json();

    let syncedCount = 0;
    let newCount = 0;

    // Process each message in the thread
    for (const gmailMessage of thread.messages) {
      const parsed = parseGmailMessage(gmailMessage);

      // Check if message already exists
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("channel_connection_id", connectionId)
        .eq("provider_message_id", parsed.providerMessageId)
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
      }
      syncedCount++;
    }

    return {
      success: true,
      threadId,
      syncedCount,
      newCount,
      message: `Synced thread with ${syncedCount} messages (${newCount} new)`,
    };
  } catch (error) {
    console.error("Gmail thread sync error:", error);
    throw error;
  }
}
