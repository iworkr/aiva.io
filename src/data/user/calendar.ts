/**
 * Calendar Server Actions
 * Handles calendar connections and event management
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { authActionClient } from '@/lib/safe-action';
import {
  createCalendarConnectionSchema,
  updateCalendarConnectionSchema,
  createEventSchema,
  updateEventSchema,
  getEventsSchema,
} from '@/utils/zod-schemas/aiva-schemas';
import { isWorkspaceMember } from './workspaces';
import { z } from 'zod';

// Schema for frequent contacts
const frequentContactSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

const deleteFrequentContactSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

/**
 * Create calendar connection
 */
export const createCalendarConnectionAction = authActionClient
  .schema(createCalendarConnectionSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, provider, ...data } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Check for existing connection
    const { data: existing } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('provider_account_id', data.providerAccountId)
      .single();

    if (existing) {
      // Update existing
      const { data: updated, error } = await supabase
        .from('calendar_connections')
        .update({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
          token_expires_at: data.tokenExpiresAt,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { success: true, data: updated };
    }

    // Create new connection
    const { data: connection, error } = await supabase
      .from('calendar_connections')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        provider,
        ...data,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    return { success: true, data: connection };
  });

/**
 * Create event
 */
export const createEventAction = authActionClient
  .schema(createEventSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, calendarConnectionId, ...eventData } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // For manual events, calendarConnectionId might be the workspaceId (fallback)
    // We need to find or create a default calendar connection
    let finalCalendarConnectionId = calendarConnectionId;
    if (calendarConnectionId === workspaceId) {
      // This is a manual event, check if there's any calendar connection
      const { data: connections } = await supabase
        .from('calendar_connections')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (connections && connections.length > 0) {
        finalCalendarConnectionId = connections[0].id;
      } else {
        // Create a default "Aiva" calendar connection for this workspace
        const { data: defaultConnection, error: connError } = await supabase
          .from('calendar_connections')
          .insert({
            workspace_id: workspaceId,
            user_id: userId,
            provider: 'aiva', // Aiva default calendar (no external integration required)
            provider_account_id: `aiva-${workspaceId}`,
            provider_account_email: `aiva-calendar@${workspaceId}.aiva.io`,
            access_token: '',
            refresh_token: '',
            status: 'active',
          })
          .select()
          .single();

        if (connError) throw new Error(`Failed to create default calendar connection: ${connError.message}`);
        finalCalendarConnectionId = defaultConnection.id;
      }
    }

    // Convert camelCase to snake_case for database
    const { data, error } = await supabase
      .from('events')
      .insert({
        workspace_id: workspaceId,
        calendar_connection_id: finalCalendarConnectionId,
        provider_event_id: eventData.providerEventId,
        provider_calendar_id: eventData.providerCalendarId || null,
        title: eventData.title,
        description: eventData.description || null,
        location: eventData.location || null,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        timezone: eventData.timezone || 'UTC',
        is_all_day: eventData.isAllDay || false,
        status: eventData.status || 'confirmed',
        is_recurring: eventData.isRecurring || false,
        recurrence_rule: eventData.recurrenceRule || null,
        conference_data: eventData.conferenceData || {},
        visibility: eventData.visibility || 'default',
        organizer: eventData.organizer || null,
        attendees: eventData.attendees || [],
        created_from_message_id: eventData.createdFromMessageId || null,
        raw_data: eventData.rawData || {},
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    revalidatePath(`/calendar`);
    return { success: true, data };
  });

/**
 * Get events
 */
export async function getEvents(
  workspaceId: string,
  userId: string,
  options: {
    startTime?: string;
    endTime?: string;
    calendarConnectionId?: string;
  } = {}
) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  let query = supabase
    .from('events')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (options.calendarConnectionId) {
    query = query.eq('calendar_connection_id', options.calendarConnectionId);
  }

  if (options.startTime) {
    query = query.gte('start_time', options.startTime);
  }

  if (options.endTime) {
    query = query.lte('end_time', options.endTime);
  }

  const { data, error } = await query.order('start_time', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update event
 */
export const updateEventAction = authActionClient
  .schema(updateEventSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId, ...updates } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Convert camelCase to snake_case for database
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
    if (updates.isAllDay !== undefined) dbUpdates.is_all_day = updates.isAllDay;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.visibility !== undefined) dbUpdates.visibility = updates.visibility;
    if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
    if (updates.recurrenceRule !== undefined) dbUpdates.recurrence_rule = updates.recurrenceRule;
    if (updates.conferenceData !== undefined) dbUpdates.conference_data = updates.conferenceData;
    if (updates.attendees !== undefined) dbUpdates.attendees = updates.attendees;
    if (updates.organizer !== undefined) dbUpdates.organizer = updates.organizer;

    const { data, error } = await supabase
      .from('events')
      .update(dbUpdates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    revalidatePath(`/calendar`);
    return { success: true, data };
  });

/**
 * Delete event
 */
export const deleteEventAction = authActionClient
  .schema(updateEventSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    revalidatePath(`/calendar`);
    return { success: true };
  });

/**
 * Get calendar connections
 */
export async function getCalendarConnections(
  workspaceId: string,
  userId: string
) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete calendar connection
 */
export const deleteCalendarConnectionAction = authActionClient
  .schema(updateCalendarConnectionSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    revalidatePath(`/calendar`);
    return { success: true };
  });

/**
 * Update calendar connection
 */
export const updateCalendarConnectionAction = authActionClient
  .schema(updateCalendarConnectionSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId, ...updates } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase
      .from('calendar_connections')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    revalidatePath(`/calendar`);
    return { success: true, data };
  });

/**
 * Toggle calendar visibility
 */
export const toggleCalendarVisibilityAction = authActionClient
  .schema(updateCalendarConnectionSchema.pick({ id: true, workspaceId: true }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Get current visibility status
    const { data: current } = await supabase
      .from('calendar_connections')
      .select('is_visible')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!current) throw new Error('Calendar not found');

    // Toggle visibility
    const { data, error } = await supabase
      .from('calendar_connections')
      .update({
        is_visible: !current.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    revalidatePath(`/calendar`);
    return { success: true, data };
  });

/**
 * Get frequent contacts
 */
export async function getFrequentContacts(
  workspaceId: string,
  userId: string
) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('frequent_contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Create frequent contact
 */
export const createFrequentContactAction = authActionClient
  .schema(frequentContactSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, name, email } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Check if contact already exists
    const { data: existing } = await supabase
      .from('frequent_contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .single();

    if (existing) {
      throw new Error('Contact already exists');
    }

    const { data, error } = await supabase
      .from('frequent_contacts')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        name,
        email,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    revalidatePath(`/calendar`);
    return { success: true, data };
  });

/**
 * Delete frequent contact
 */
export const deleteFrequentContactAction = authActionClient
  .schema(deleteFrequentContactSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('frequent_contacts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/workspace/${workspaceId}/calendar`);
    revalidatePath(`/calendar`);
    return { success: true };
  });

