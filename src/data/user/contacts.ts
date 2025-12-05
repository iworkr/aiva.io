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

/**
 * Find or create contact from message sender information
 * This is the main function used during message sync to automatically create/link contacts
 * 
 * Matching logic:
 * 1. First tries to find existing contact by email (primary matching)
 * 2. If email matches, links the channel to that contact
 * 3. If no email match, tries to find by channel (channel_type + channel_id)
 * 4. If no match found, creates new contact and links channel
 * 
 * This ensures that:
 * - Same person across channels (Gmail, Instagram, etc.) is linked to one contact
 * - All communication history is unified under one contact
 */
export async function findOrCreateContactFromMessage(
  workspaceId: string,
  userId: string,
  channelType: string,
  senderEmail: string | null,
  senderName: string | null,
  channelId?: string // For non-email channels (Instagram username, phone number, etc.)
): Promise<{ contactId: string; isNew: boolean }> {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  // Normalize email for matching (lowercase, trim)
  const normalizedEmail = senderEmail?.toLowerCase().trim() || null;
  
  // Use email as channel_id for email channels if not provided
  const normalizedChannelId = channelId || normalizedEmail || senderName || 'unknown';

  // Step 1: Try to find existing contact by email (primary matching method)
  if (normalizedEmail) {
    const { data: existingContactByEmail } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', normalizedEmail)
      .single();

    if (existingContactByEmail) {
      // Found contact by email - link this channel to it
      const contactId = existingContactByEmail.id;

      // Check if channel already linked
      const { data: existingChannel } = await supabase
        .from('contact_channels')
        .select('id, message_count')
        .eq('contact_id', contactId)
        .eq('workspace_id', workspaceId)
        .eq('channel_type', channelType)
        .eq('channel_id', normalizedChannelId)
        .single();

      if (!existingChannel) {
        // Link the channel to the existing contact
        await supabase
          .from('contact_channels')
          .insert({
            contact_id: contactId,
            workspace_id: workspaceId,
            channel_type: channelType,
            channel_id: normalizedChannelId,
            channel_display_name: senderName || normalizedEmail,
            // Mark as primary if this is the first channel of this type
            is_primary: channelType === 'gmail' || channelType === 'outlook',
            last_message_at: new Date().toISOString(),
            message_count: 1,
          });
      } else {
        // Update message count and last message time
        await supabase
          .from('contact_channels')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: (existingChannel.message_count || 0) + 1,
          })
          .eq('id', existingChannel.id);
      }

      // Update contact interaction stats (will be triggered by trigger)
      await supabase
        .from('contacts')
        .update({
          last_interaction_at: new Date().toISOString(),
          // Update name if we have a better one
          ...(senderName && { full_name: senderName }),
        })
        .eq('id', contactId);

      return { contactId, isNew: false };
    }
  }

  // Step 2: Try to find existing contact by channel (for non-email channels)
  const { data: existingChannel } = await supabase
    .from('contact_channels')
    .select('contact_id, contacts(*)')
    .eq('workspace_id', workspaceId)
    .eq('channel_type', channelType)
    .eq('channel_id', normalizedChannelId)
    .single();

  if (existingChannel && existingChannel.contacts) {
    const contactId = (existingChannel.contacts as any).id;
    
    // Update contact with email if we have one and it's not set
    if (normalizedEmail) {
      await supabase
        .from('contacts')
        .update({
          email: normalizedEmail,
          last_interaction_at: new Date().toISOString(),
          ...(senderName && { full_name: senderName }),
        })
        .eq('id', contactId)
        .is('email', null); // Only update if email is null
    }

    // Update channel message count and last message time
    await supabase
      .from('contact_channels')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: ((existingChannel as any).message_count || 0) + 1,
      })
      .eq('contact_id', contactId)
      .eq('channel_type', channelType)
      .eq('channel_id', normalizedChannelId);

    return { contactId, isNew: false };
  }

  // Step 3: No existing contact found - create new one (or find existing by name)
  const displayName = senderName || normalizedEmail || normalizedChannelId;
  const firstName = senderName?.split(' ')[0] || null;
  const lastName = senderName?.split(' ').slice(1).join(' ') || null;

  // Use upsert to handle the unique constraint on workspace_id + full_name
  // This prevents duplicate key errors when the same sender name exists
  const { data: upsertedContact, error: contactError } = await supabase
    .from('contacts')
    .upsert({
      workspace_id: workspaceId,
      full_name: displayName,
      first_name: firstName,
      last_name: lastName || null,
      email: normalizedEmail,
      created_by: userId,
      last_interaction_at: new Date().toISOString(),
      interaction_count: 1,
    }, {
      onConflict: 'workspace_id,full_name',
      ignoreDuplicates: false, // Update if exists
    })
    .select('id')
    .single();

  // If upsert failed (e.g., different constraint), try to find existing contact by name
  let contactId: string;
  let isNew = true;

  if (contactError) {
    // Fallback: try to find existing contact by name
    const { data: existingByName } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('full_name', displayName)
      .single();

    if (existingByName) {
      contactId = existingByName.id;
      isNew = false;
      // Update interaction time
      await supabase
        .from('contacts')
        .update({
          last_interaction_at: new Date().toISOString(),
          ...(normalizedEmail && { email: normalizedEmail }),
        })
        .eq('id', contactId);
    } else {
      // Still can't find - throw the original error
      throw new Error(contactError.message);
    }
  } else {
    contactId = upsertedContact.id;
  }

  // Link the channel to the contact (use upsert to avoid duplicates)
  const { error: channelError } = await supabase
    .from('contact_channels')
    .upsert({
      contact_id: contactId,
      workspace_id: workspaceId,
      channel_type: channelType,
      channel_id: normalizedChannelId,
      channel_display_name: senderName || normalizedEmail || normalizedChannelId,
      is_primary: true,
      last_message_at: new Date().toISOString(),
      message_count: 1,
    }, {
      onConflict: 'contact_id,workspace_id,channel_type,channel_id',
      ignoreDuplicates: true, // Don't update if channel already exists
    });

  if (channelError) {
    // Log but don't throw - contact was created/found successfully
    console.warn('Channel link warning (may already exist):', channelError.message);
  }

  return { contactId, isNew };
}

