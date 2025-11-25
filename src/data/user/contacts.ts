/**
 * Contacts Server Actions
 * Handles unified contact profiles and channel linking
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { authActionClient } from '@/lib/safe-action';
import {
  createContactSchema,
  updateContactSchema,
  getContactsSchema,
  createContactChannelSchema,
  updateContactChannelSchema,
  linkChannelToContactSchema,
} from '@/utils/zod-schemas/aiva-schemas';
import { isWorkspaceMember } from './workspaces';
import { z } from 'zod';

/**
 * Get all contacts for a workspace
 */
export async function getContacts(
  workspaceId: string,
  userId: string,
  options: {
    search?: string;
    tags?: string[];
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  let query = supabase
    .from('contacts')
    .select('*, contact_channels(*)')
    .eq('workspace_id', workspaceId);

  // Search filter
  if (options.search) {
    query = query.or(
      `full_name.ilike.%${options.search}%,email.ilike.%${options.search}%,company.ilike.%${options.search}%`
    );
  }

  // Tags filter
  if (options.tags && options.tags.length > 0) {
    query = query.contains('tags', options.tags);
  }

  // Favorite filter
  if (options.isFavorite !== undefined) {
    query = query.eq('is_favorite', options.isFavorite);
  }

  // Pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  // Order by last interaction
  query = query.order('last_interaction_at', { ascending: false, nullsFirst: false });

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get a single contact by ID
 */
export async function getContact(contactId: string, workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('contacts')
    .select('*, contact_channels(*)')
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Create a new contact
 */
export const createContactAction = authActionClient
  .schema(createContactSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...contactData } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Convert camelCase to snake_case for database
    const dbData = {
      workspace_id: workspaceId,
      full_name: contactData.fullName,
      first_name: contactData.firstName,
      last_name: contactData.lastName,
      email: contactData.email || null,
      phone: contactData.phone,
      company: contactData.company,
      job_title: contactData.jobTitle,
      avatar_url: contactData.avatarUrl,
      bio: contactData.bio,
      notes: contactData.notes,
      tags: contactData.tags,
      is_favorite: contactData.isFavorite,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert(dbData)
      .select('*, contact_channels(*)')
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/contacts`);
    revalidatePath(`/contacts`);
    return { success: true, data };
  });

/**
 * Update an existing contact
 */
export const updateContactAction = authActionClient
  .schema(updateContactSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId, ...updates } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Convert camelCase to snake_case for database
    const dbUpdates: Record<string, any> = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.company !== undefined) dbUpdates.company = updates.company;
    if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;

    const { data, error } = await supabase
      .from('contacts')
      .update(dbUpdates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, contact_channels(*)')
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/contacts`);
    revalidatePath(`/contacts`);
    return { success: true, data };
  });

/**
 * Delete a contact
 */
export const deleteContactAction = authActionClient
  .schema(z.object({ id: z.string().uuid(), workspaceId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/contacts`);
    revalidatePath(`/contacts`);
    return { success: true };
  });

/**
 * Toggle contact favorite status
 */
export const toggleContactFavoriteAction = authActionClient
  .schema(z.object({ id: z.string().uuid(), workspaceId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Get current favorite status
    const { data: current } = await supabase
      .from('contacts')
      .select('is_favorite')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!current) throw new Error('Contact not found');

    // Toggle favorite
    const { data, error } = await supabase
      .from('contacts')
      .update({ is_favorite: !current.is_favorite })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/contacts`);
    revalidatePath(`/contacts`);
    return { success: true, data };
  });

/**
 * Link a channel to a contact (or create if contact doesn't exist)
 */
export const linkChannelToContactAction = authActionClient
  .schema(linkChannelToContactSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, contactId, channelType, channelId, channelDisplayName } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Check if channel already exists
    const { data: existing } = await supabase
      .from('contact_channels')
      .select('*')
      .eq('contact_id', contactId)
      .eq('channel_type', channelType)
      .eq('channel_id', channelId)
      .single();

    if (existing) {
      return { success: true, data: existing, message: 'Channel already linked' };
    }

    // Create new channel link
    const { data, error } = await supabase
      .from('contact_channels')
      .insert({
        contact_id: contactId,
        workspace_id: workspaceId,
        channel_type: channelType,
        channel_id: channelId,
        channel_display_name: channelDisplayName,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/contacts`);
    revalidatePath(`/contacts`);
    return { success: true, data };
  });

/**
 * Get contact channels
 */
export async function getContactChannels(
  contactId: string,
  workspaceId: string,
  userId: string
) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('contact_channels')
    .select('*')
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId)
    .order('is_primary', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a contact channel
 */
export const deleteContactChannelAction = authActionClient
  .schema(z.object({ id: z.string().uuid(), workspaceId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('contact_channels')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/contacts`);
    revalidatePath(`/contacts`);
    return { success: true };
  });

/**
 * Find or create contact from channel information
 * Used when a message comes in from a new channel
 */
export async function findOrCreateContactFromChannel(
  workspaceId: string,
  userId: string,
  channelType: string,
  channelId: string,
  channelDisplayName?: string
) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  // First, try to find existing contact with this channel
  const { data: existingChannel } = await supabase
    .from('contact_channels')
    .select('*, contacts(*)')
    .eq('workspace_id', workspaceId)
    .eq('channel_type', channelType)
    .eq('channel_id', channelId)
    .single();

  if (existingChannel) {
    return existingChannel.contacts;
  }

  // No existing contact, create a new one
  const displayName = channelDisplayName || channelId;
  const { data: newContact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      full_name: displayName,
      created_by: userId,
    })
    .select()
    .single();

  if (contactError) throw new Error(contactError.message);

  // Link the channel to the new contact
  const { error: channelError } = await supabase
    .from('contact_channels')
    .insert({
      contact_id: newContact.id,
      workspace_id: workspaceId,
      channel_type: channelType,
      channel_id: channelId,
      channel_display_name: channelDisplayName,
      is_primary: true,
    });

  if (channelError) throw new Error(channelError.message);

  return newContact;
}

