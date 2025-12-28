/**
 * Server Actions for Message Management
 * Handles fetching, creating, and updating messages across all channels
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { authActionClient } from '@/lib/safe-action';
import {
  createMessageSchema,
  updateMessageSchema,
  getMessagesSchema,
} from '@/utils/zod-schemas/aiva-schemas';
import { isWorkspaceMember } from '../user/workspaces';
import { syncAllWorkspaceConnections } from '@/lib/sync/orchestrator';
import { batchSummarizeMessages } from '@/lib/ai/summarizer';

// ============================================================================
// GET MESSAGES
// ============================================================================

export const getMessagesAction = authActionClient
  .schema(getMessagesSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const {
      workspaceId,
      channelConnectionId,
      status,
      priority,
      category,
      isRead,
      isStarred,
      limit,
      offset,
      orderBy,
      orderDirection,
    } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Check if Zero Inbox is enabled - if so, exclude handled messages from inbox
    const { data: workspaceSettings } = await supabase
      .from('workspace_settings')
      .select('inbox_zero_enabled')
      .eq('workspace_id', workspaceId)
      .single();
    
    const isZeroInboxEnabled = workspaceSettings?.inbox_zero_enabled ?? true;

    // Get list of unsubscribed contact emails to filter out
    const { data: unsubscribedContacts } = await supabase
      .from('contacts')
      .select('email')
      .eq('workspace_id', workspaceId)
      .eq('is_unsubscribed', true);

    const unsubscribedEmails = (unsubscribedContacts || [])
      .map((c: any) => c.email?.toLowerCase().trim())
      .filter(Boolean) as string[];

    let query = supabase
      .from('messages')
      .select(
        `
        *,
        channel_connection:channel_connections(
          id,
          provider,
          provider_account_name,
          provider_account_id
        ),
        thread:threads(
          id,
          primary_subject,
          message_count
        )
      `,
        { count: 'exact' }
      )
      .eq('workspace_id', workspaceId);
    
    // CRITICAL: With Zero Inbox enabled, exclude handled messages from inbox
    // Handled messages should not appear in the inbox list
    if (isZeroInboxEnabled) {
      query = query.eq('handled_by_aiva', false);
    }

    // Filter out messages from unsubscribed contacts
    if (unsubscribedEmails.length > 0) {
      // Use NOT IN filter for sender emails
      for (const email of unsubscribedEmails) {
        query = query.neq('sender_email', email);
      }
    }

    // Apply filters
    if (channelConnectionId) {
      query = query.eq('channel_connection_id', channelConnectionId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (isRead !== undefined) {
      query = query.eq('is_read', isRead);
    }
    if (isStarred !== undefined) {
      query = query.eq('is_starred', isStarred);
    }

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('📨 getMessagesAction error:', {
        workspaceId,
        channelConnectionId,
        status,
        priority,
        category,
        isRead,
        limit,
        offset,
        orderBy,
        orderDirection,
        error,
      });
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    // Enrich messages with contact avatars (from unified contacts system)
    let messagesWithAvatars = data ?? [];
    if (messagesWithAvatars.length > 0) {
      const emails = Array.from(
        new Set(
          messagesWithAvatars
            .map((m: any) => (m.sender_email as string | null)?.toLowerCase().trim())
            .filter(Boolean) as string[]
        )
      );

      if (emails.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('email, avatar_url')
          .eq('workspace_id', workspaceId)
          .in('email', emails);

        const avatarMap = new Map<string, string>();
        contacts?.forEach((c: any) => {
          if (c.email && c.avatar_url) {
            avatarMap.set((c.email as string).toLowerCase().trim(), c.avatar_url as string);
          }
        });

        messagesWithAvatars = messagesWithAvatars.map((m: any) => ({
          ...m,
          sender_avatar_url:
            (m.sender_email &&
              avatarMap.get((m.sender_email as string).toLowerCase().trim())) ||
            null,
        }));
      }
    }

    console.log('📨 getMessagesAction result:', {
      workspaceId,
      channelConnectionId,
      total: count,
      returned: messagesWithAvatars.length ?? 0,
      hasMore: count ? offset + limit < count : false,
    });

    return {
      messages: messagesWithAvatars,
      total: count,
      hasMore: count ? offset + limit < count : false,
    };
  });

// ============================================================================
// GET NEW MESSAGES (for seamless background sync)
// ============================================================================

export const getNewMessagesAction = authActionClient
  .schema(
    z.object({
      workspaceId: getMessagesSchema.shape.workspaceId,
      channelConnectionId: getMessagesSchema.shape.channelConnectionId.optional(),
      priority: getMessagesSchema.shape.priority.optional(),
      category: getMessagesSchema.shape.category.optional(),
      isRead: z.boolean().optional(),
      afterTimestamp: z.string().datetime(), // ISO timestamp - only get messages after this
      limit: z.number().int().positive().max(200).default(50),
    })
  )
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const {
      workspaceId,
      channelConnectionId,
      priority,
      category,
      isRead,
      afterTimestamp,
      limit,
    } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Get list of unsubscribed contact emails to filter out
    const { data: unsubscribedContacts } = await supabase
      .from('contacts')
      .select('email')
      .eq('workspace_id', workspaceId)
      .eq('is_unsubscribed', true);

    const unsubscribedEmails = (unsubscribedContacts || [])
      .map((c: any) => c.email?.toLowerCase().trim())
      .filter(Boolean) as string[];

    let query = supabase
      .from('messages')
      .select(
        `
        *,
        channel_connection:channel_connections(
          id,
          provider,
          provider_account_name,
          provider_account_id
        ),
        thread:threads(
          id,
          primary_subject,
          message_count
        )
      `
      )
      .eq('workspace_id', workspaceId)
      .gt('created_at', afterTimestamp); // Only messages created after timestamp

    // Filter out messages from unsubscribed contacts
    if (unsubscribedEmails.length > 0) {
      for (const email of unsubscribedEmails) {
        query = query.neq('sender_email', email);
      }
    }

    // Apply filters
    if (channelConnectionId) {
      query = query.eq('channel_connection_id', channelConnectionId);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (isRead !== undefined) {
      query = query.eq('is_read', isRead);
    }

    // Order by timestamp descending (newest first) and limit
    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('📨 getNewMessagesAction error:', {
        workspaceId,
        channelConnectionId,
        afterTimestamp,
        error,
      });
      throw new Error(`Failed to fetch new messages: ${error.message}`);
    }

    // Enrich messages with contact avatars (from unified contacts system)
    let messagesWithAvatars = data ?? [];
    if (messagesWithAvatars.length > 0) {
      const emails = Array.from(
        new Set(
          messagesWithAvatars
            .map((m: any) => (m.sender_email as string | null)?.toLowerCase().trim())
            .filter(Boolean) as string[]
        )
      );

      if (emails.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('email, avatar_url')
          .eq('workspace_id', workspaceId)
          .in('email', emails);

        const avatarMap = new Map<string, string>();
        contacts?.forEach((c: any) => {
          if (c.email && c.avatar_url) {
            avatarMap.set((c.email as string).toLowerCase().trim(), c.avatar_url as string);
          }
        });

        messagesWithAvatars = messagesWithAvatars.map((m: any) => ({
          ...m,
          sender_avatar_url:
            (m.sender_email &&
              avatarMap.get((m.sender_email as string).toLowerCase().trim())) ||
            null,
        }));
      }
    }

    return {
      messages: messagesWithAvatars,
    };
  });

// ============================================================================
// GET SINGLE MESSAGE
// ============================================================================

export async function getMessageById(messageId: string, workspaceId: string, userId: string) {
  // Verify workspace membership
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) {
    throw new Error('You are not a member of this workspace');
  }

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('messages')
    .select(
      `
      *,
      channel_connection:channel_connections(
        id,
        provider,
        provider_account_name,
        provider_account_id
      ),
      thread:threads(
        id,
        primary_subject,
        participants,
        message_count
      ),
      drafts:message_drafts(*)
    `
    )
    .eq('id', messageId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch message: ${error.message}`);
  }

  return data;
}

// ============================================================================
// CREATE MESSAGE (System/Webhook use)
// ============================================================================

export const createMessageAction = authActionClient
  .schema(createMessageSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...messageData } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Check if message already exists (prevent duplicates)
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('channel_connection_id', messageData.channelConnectionId)
      .eq('provider_message_id', messageData.providerMessageId)
      .single();

    if (existing) {
      return {
        success: true,
        data: existing,
        message: 'Message already exists',
        isDuplicate: true,
      };
    }

    // Create message - convert camelCase to snake_case for database
    const { data, error } = await supabase
      .from('messages')
      // Cast insert payload to any so channels without email/subject (e.g. Telegram) fit DB types
      .insert({
        workspace_id: workspaceId,
        channel_connection_id: messageData.channelConnectionId,
        thread_id: messageData.threadId,
        provider_message_id: messageData.providerMessageId,
        provider_thread_id: messageData.providerThreadId,
        subject: messageData.subject,
        body: messageData.body,
        body_html: messageData.bodyHtml,
        snippet: messageData.snippet,
        sender_email: messageData.senderEmail,
        sender_name: messageData.senderName,
        recipients: messageData.recipients,
        timestamp: messageData.timestamp,
        labels: messageData.labels,
        attachments: messageData.attachments,
        raw_data: messageData.rawData,
      } as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    revalidatePath(`/inbox`);
    revalidatePath(`/workspace/${workspaceId}`);

    return {
      success: true,
      data,
      message: 'Message created successfully',
      isDuplicate: false,
    };
  });

// ============================================================================
// UPDATE MESSAGE
// ============================================================================

export const updateMessageAction = authActionClient
  .schema(updateMessageSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId, ...updates } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }

    revalidatePath(`/inbox`);
    revalidatePath(`/workspace/${workspaceId}`);

    return {
      success: true,
      data,
      message: 'Message updated successfully',
    };
  });

// ============================================================================
// MARK MESSAGE AS READ
// ============================================================================

export const markMessageAsReadAction = authActionClient
  .schema(updateMessageSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark message as read: ${error.message}`);
    }

    revalidatePath(`/inbox`);

    return {
      success: true,
      data,
    };
  });

// ============================================================================
// MARK MESSAGE AS UNREAD
// ============================================================================

export const markMessageAsUnreadAction = authActionClient
  .schema(updateMessageSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        is_read: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark message as unread: ${error.message}`);
    }

    revalidatePath(`/inbox`);

    return {
      success: true,
      data,
    };
  });

// ============================================================================
// MARK MULTIPLE MESSAGES AS READ
// ============================================================================

export const markMultipleAsReadAction = authActionClient
  .schema(
    getMessagesSchema.pick({ workspaceId: true }).extend({
      messageIds: getMessagesSchema.shape.workspaceId.array(),
    })
  )
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, messageIds } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .in('id', messageIds)
      .select();

    if (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }

    revalidatePath(`/inbox`);

    return {
      success: true,
      count: data.length,
    };
  });

// ============================================================================
// STAR/UNSTAR MESSAGE
// ============================================================================

export const toggleStarMessageAction = authActionClient
  .schema(
    updateMessageSchema.pick({ id: true, workspaceId: true }).extend({
      isStarred: updateMessageSchema.shape.isStarred,
    })
  )
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId, isStarred } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        is_starred: isStarred,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to toggle star: ${error.message}`);
    }

    revalidatePath(`/inbox`);

    return {
      success: true,
      data,
    };
  });

// Alias for starring a message (sets is_starred to true)
export const starMessageAction = authActionClient
  .schema(updateMessageSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        is_starred: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to star message: ${error.message}`);
    }

    revalidatePath(`/inbox`);

    return {
      success: true,
      data,
    };
  });

// Alias for unstarring a message (sets is_starred to false)
export const unstarMessageAction = authActionClient
  .schema(updateMessageSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        is_starred: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to unstar message: ${error.message}`);
    }

    revalidatePath(`/inbox`);

    return {
      success: true,
      data,
    };
  });

// ============================================================================
// GET UNREAD COUNT
// ============================================================================

export async function getUnreadMessageCount(workspaceId: string, userId: string) {
  // Verify workspace membership
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) {
    return 0;
  }

  const supabase = await createSupabaseUserServerActionClient();

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to fetch unread count:', error);
    return 0;
  }

  return count || 0;
}

// ============================================================================
// GET PRIORITY MESSAGE COUNT
// ============================================================================

export async function getPriorityMessageCount(workspaceId: string, userId: string) {
  // Verify workspace membership
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) {
    return { high: 0, medium: 0, low: 0, noise: 0 };
  }

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('messages')
    .select('priority')
    .eq('workspace_id', workspaceId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to fetch priority counts:', error);
    return { high: 0, medium: 0, low: 0, noise: 0 };
  }

  const counts = {
    high: 0,
    medium: 0,
    low: 0,
    noise: 0,
  };

  data.forEach((msg) => {
    if (msg.priority && msg.priority in counts) {
      counts[msg.priority as keyof typeof counts]++;
    }
  });

  return counts;
}

// ============================================================================
// ARCHIVE MESSAGE
// ============================================================================

export const archiveMessageAction = authActionClient
  .schema(updateMessageSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    // Mark message as handled (for Zero Inbox) - this will also archive in provider if enabled
    const { markMessageHandled } = await import('@/lib/inbox-zero/handler');
    const handleResult = await markMessageHandled(id, workspaceId, {
      action: 'manually_dismissed',
      userId,
      markRead: true,
      archive: true, // Archive in provider (Gmail/Outlook)
      applyLabel: true, // Apply "Handled by Aiva" label
    });

    if (!handleResult.success) {
      console.error('[Archive] Failed to mark as handled:', handleResult.error);
      // Continue anyway - we'll still update status
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Also update status to archived for backward compatibility
    const { data, error } = await supabase
      .from('messages')
      .update({
        status: 'archived',
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to archive message: ${error.message}`);
    }

    // Don't revalidate - let optimistic updates handle UI, and client-side refetch will update
    // Revalidation causes slow full-page refreshes
    // The client will refetch messages which will exclude handled messages when Zero Inbox is enabled

    return {
      success: true,
      data,
      handled: handleResult.success,
    };
  });

// ============================================================================
// UNARCHIVE MESSAGE
// ============================================================================

export const unarchiveMessageAction = authActionClient
  .schema(updateMessageSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    // Restore message (undo handling) - this will unarchive in provider if applicable
    const { restoreMessage } = await import('@/lib/inbox-zero/handler');
    const restoreResult = await restoreMessage(id, userId);

    if (!restoreResult.success) {
      console.error('[Unarchive] Failed to restore message:', restoreResult.error);
      // Continue anyway - we'll still update status
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Also update status to unread for backward compatibility
    const { data, error } = await supabase
      .from('messages')
      .update({
        status: 'unread',
        is_read: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to unarchive message: ${error.message}`);
    }

    revalidatePath(`/inbox`);
    revalidatePath(`/en/dashboard`); // Also revalidate dashboard to update attention items

    return {
      success: true,
      data,
      restored: restoreResult.success,
    };
  });

// ============================================================================
// GENERATE AI SUMMARIES FOR MESSAGES
// ============================================================================

export const generateSummariesAction = authActionClient
  .schema(
    z.object({
      workspaceId: getMessagesSchema.shape.workspaceId,
      limit: z.number().int().positive().max(100).default(20),
    })
  )
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, limit } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const result = await batchSummarizeMessages(workspaceId, limit);

    console.log('🤖 generateSummariesAction result:', {
      workspaceId,
      ...result,
    });

    // Revalidate inbox view to show new summaries
    revalidatePath(`/inbox`);

    return {
      success: true,
      ...result,
    };
  });

// ============================================================================
// SYNC ALL WORKSPACE CONNECTIONS (EXPOSED AS SERVER ACTION)
// ============================================================================

export const syncWorkspaceConnectionsAction = authActionClient
  .schema(
    z.object({
      workspaceId: getMessagesSchema.shape.workspaceId,
      maxMessagesPerConnection: z.number().int().positive().max(200).optional(),
      autoClassify: z.boolean().optional(),
    })
  )
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, maxMessagesPerConnection, autoClassify } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const result = await syncAllWorkspaceConnections(workspaceId, {
      maxMessagesPerConnection: maxMessagesPerConnection ?? 50,
      autoClassify: autoClassify ?? true,
    });

    console.log('📥 syncWorkspaceConnectionsAction result', {
      workspaceId,
      totalConnections: result.totalConnections,
      totalNewMessages: result.totalNewMessages,
    });

    // Revalidate inbox view
    revalidatePath(`/inbox`);
    revalidatePath(`/workspace/${workspaceId}`);

    return result;
  });

// ============================================================================
// GENERATE AI REPLY DRAFT
// ============================================================================

export const generateReplyDraftAction = authActionClient
  .schema(
    z.object({
      messageId: z.string().uuid(),
      workspaceId: z.string().uuid(),
      tone: z.enum(['formal', 'casual', 'friendly', 'professional']).optional(),
      maxLength: z.number().int().positive().max(1000).optional(),
    })
  )
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { messageId, workspaceId, tone, maxLength } = parsedInput;

    console.log('[generateReplyDraftAction] Starting:', { messageId, workspaceId, userId, tone });

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    console.log('[generateReplyDraftAction] Workspace membership check:', { isMember });
    
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const { generateReplyDraft } = await import('@/lib/ai/reply-generator');
    
    try {
      console.log('[generateReplyDraftAction] Calling generateReplyDraft...');
      const draft = await generateReplyDraft(messageId, workspaceId, {
        tone: tone || 'professional',
        maxLength: maxLength || 300,
      });

      console.log('[generateReplyDraftAction] Draft generated:', { 
        hasBody: !!draft.body, 
        bodyLength: draft.body?.length,
        confidence: draft.confidenceScore,
        error: draft.error 
      });

      return {
        success: true,
        data: draft,
      };
    } catch (error) {
      console.error('[generateReplyDraftAction] Error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to generate reply draft'
      );
    }
  });

// ============================================================================
// SEND REPLY
// ============================================================================

export const sendReplyAction = authActionClient
  .schema(
    z.object({
      messageId: z.string().uuid(),
      workspaceId: z.string().uuid(),
      body: z.string().min(1),
      subject: z.string(),
      to: z.array(z.string().email()),
      provider: z.enum(['gmail', 'outlook', 'slack', 'teams']),
      providerMessageId: z.string().optional(),
      draftId: z.string().uuid().optional(),
    })
  )
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { messageId, workspaceId, body, subject, to, provider, providerMessageId, draftId } =
      parsedInput;

    console.log('[sendReplyAction] Starting:', {
      messageId,
      workspaceId,
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100),
      subject,
      to,
      provider,
      draftId,
    });

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Get the original message and connection
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(
        `
        *,
        channel_connection:channel_connections(
          id,
          provider,
          access_token,
          refresh_token,
          token_expires_at
        )
      `
      )
      .eq('id', messageId)
      .eq('workspace_id', workspaceId)
      .single();

    if (messageError || !message) {
      throw new Error('Message not found');
    }

    const connection = message.channel_connection;
    if (!connection || connection.provider !== provider) {
      throw new Error('Channel connection not found or provider mismatch');
    }

    // Validate body is not empty
    if (!body || !body.trim()) {
      throw new Error('Email body cannot be empty');
    }

    // Send reply based on provider
    let sentMessageId: string | undefined;
    
    try {
      if (provider === 'gmail') {
        const { sendGmailMessage, getGmailAccessToken } = await import('@/lib/gmail/client');
        const accessToken = await getGmailAccessToken(connection.id);
        console.log('[sendReplyAction] Sending Gmail message:', {
          to,
          subject,
          bodyLength: body.length,
          inReplyTo: providerMessageId || message.provider_message_id,
        });
        const sendResult = await sendGmailMessage(accessToken, {
          to,
          subject,
          body: body.trim(), // Ensure body is trimmed
          inReplyTo: providerMessageId || message.provider_message_id,
          references: message.provider_thread_id
            ? [message.provider_thread_id]
            : undefined,
        });
        sentMessageId = sendResult.id;
      } else if (provider === 'outlook') {
        const { sendOutlookMessage, getOutlookAccessToken } = await import('@/lib/outlook/client');
        const accessToken = await getOutlookAccessToken(connection.id);
        console.log('[sendReplyAction] Sending Outlook message:', {
          to,
          subject,
          bodyLength: body.length,
          inReplyTo: providerMessageId || message.provider_message_id,
        });
        const sendResult = await sendOutlookMessage(accessToken, {
          to,
          subject,
          body: body.trim(), // Ensure body is trimmed
          inReplyTo: providerMessageId || message.provider_message_id,
        });
        // For Outlook replies, the ID might be the original message ID
        // We'll use a temporary ID for the outbound message
        sentMessageId = sendResult.id || `outlook-sent-${Date.now()}`;
      } else {
        throw new Error(`Reply not supported for ${provider}`);
      }

      // Create outbound message record immediately so it appears in the thread
      if (sentMessageId) {
        console.log('[sendReplyAction] Creating outbound message record');
        
        // Get connection details to find user email
        const { data: connectionDetails } = await supabase
          .from('channel_connections')
          .select('provider_account_id, provider_account_name')
          .eq('id', connection.id)
          .single();
        
        const senderEmail = connectionDetails?.provider_account_id || 
                           connectionDetails?.provider_account_name || 
                           to[0];
        
        try {
          const { error: insertError } = await supabase
            .from('messages')
            .insert({
              workspace_id: workspaceId,
              channel_connection_id: connection.id,
              provider_message_id: sentMessageId,
              provider_thread_id: message.provider_thread_id, // Replies are in the same thread
              subject: subject,
              body: body.trim(),
              snippet: body.trim().substring(0, 200),
              sender_email: senderEmail,
              sender_name: connectionDetails?.provider_account_name || undefined,
              recipients: JSON.stringify(to.map(email => ({ email, type: 'to' }))),
              timestamp: new Date().toISOString(),
              is_read: true, // Sent messages are automatically "read"
              thread_id: message.thread_id, // Link to same thread
            });
          
          if (insertError) {
            // If insert fails (e.g., duplicate or missing field), that's okay - Gmail sync will pick it up
            console.warn('[sendReplyAction] Could not create outbound message record:', insertError.message);
          } else {
            console.log('[sendReplyAction] Outbound message record created successfully');
          }
        } catch (insertError) {
          console.warn('[sendReplyAction] Error creating outbound message record:', insertError);
        }
      }

      // Mark message as reviewed and handled
      console.log('[sendReplyAction] Marking message as reviewed');
      await supabase
        .from('messages')
        .update({
          requires_human_review: false,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          handled_by_aiva: true,
        })
        .eq('id', messageId)
        .eq('workspace_id', workspaceId);

      // Update draft if provided
      if (draftId) {
        console.log('[sendReplyAction] Updating draft status');
        await supabase
          .from('message_drafts')
          .update({
            edited_by_user: true,
            auto_sent: false, // Manual send, not auto-sent
            auto_sent_at: null,
          })
          .eq('id', draftId)
          .eq('workspace_id', workspaceId);

        // Create calendar event if date/time information is available
        try {
          console.log('[sendReplyAction] Attempting to create calendar event');
          const { createCalendarEventFromSentEmail } = await import('@/lib/ai/scheduling');
          const eventResult = await createCalendarEventFromSentEmail(
            messageId,
            draftId,
            workspaceId,
            userId
          );
          
          if (eventResult.success) {
            console.log('[sendReplyAction] Calendar event created:', eventResult.eventId);
          } else {
            console.log('[sendReplyAction] Calendar event not created:', eventResult.message);
          }
        } catch (eventError) {
          console.error('[sendReplyAction] Error creating calendar event:', eventError);
          // Don't fail the send if calendar event creation fails
        }
      }

      revalidatePath(`/inbox`);
      revalidatePath(`/inbox/${messageId}`);
      revalidatePath(`/`); // Revalidate homepage to remove from attention items

      console.log('[sendReplyAction] Reply sent successfully');
      return {
        success: true,
        message: 'Reply sent successfully',
      };
    } catch (error) {
      console.error('[sendReplyAction] Send reply error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to send reply'
      );
    }
  });

