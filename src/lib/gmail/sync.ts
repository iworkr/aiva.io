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
    });

    // Get access token (will refresh if needed)
    const accessToken = await getGmailAccessToken(connectionId);

    // List messages
    const messagesList = await listGmailMessages(accessToken, {
      maxResults: options.maxMessages || 50,
      // If a specific query is provided, use it; otherwise fetch recent messages
      // Leaving q empty lets Gmail return recent mail instead of only unread
      q: options.query ?? "",
    });

    console.log("📥 Gmail messages listed", {
      connectionId,
      workspaceId,
      totalRefs: messagesList.messages?.length ?? 0,
      nextPageToken: messagesList.nextPageToken,
    });

    if (!messagesList.messages || messagesList.messages.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        newCount: 0,
        message: "No new messages to sync",
      };
    }

    let syncedCount = 0;
    let newCount = 0;
    let errorCount = 0;

    // Fetch and store each message
    for (const messageRef of messagesList.messages) {
      try {
        // Get full message details
        const gmailMessage = await getGmailMessage(accessToken, messageRef.id);

        // Parse to normalized format
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
          continue; // Skip if already exists
        }

        // Store message in database directly (system sync, not user-initiated action)
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
            `Failed to insert Gmail message ${messageRef.id} into messages:`,
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
        console.error(`Failed to sync message ${messageRef.id}:`, error);
        errorCount++;
      }
    }

    // Update last sync time and cursor
    await supabase
      .from("channel_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_cursor: messagesList.nextPageToken || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    return {
      success: true,
      syncedCount,
      newCount,
      errorCount,
      hasMore: !!messagesList.nextPageToken,
      nextPageToken: messagesList.nextPageToken,
      message: `Synced ${syncedCount} messages (${newCount} new, ${errorCount} errors)`,
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
