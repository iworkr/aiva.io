/**
 * Server Actions for Message Management
 * Handles fetching, creating, and updating messages across all channels
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { authActionClient } from '@/lib/safe-action';
import {
  createMessageSchema,
  updateMessageSchema,
  getMessagesSchema,
} from '@/utils/zod-schemas/aiva-schemas';
import { isWorkspaceMember } from '../user/workspaces';

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

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return {
      messages: data,
      total: count,
      hasMore: count ? offset + limit < count : false,
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

    // Create message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...messageData,
        workspace_id: workspaceId,
      })
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

    const supabase = await createSupabaseUserServerActionClient();

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

    revalidatePath(`/inbox`);

    return {
      success: true,
      data,
    };
  });

