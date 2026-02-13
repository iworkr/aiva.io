/**
 * AI-Powered Scheduling
 * Automatically create calendar events from scheduling intent detection
 */

'use server';

import { detectSchedulingIntent } from './reply-generator';
import { createEventAction } from '@/data/user/calendar';
import { createGoogleCalendarEvent } from '@/lib/calendar/google-calendar';
import { getGoogleCalendarAccessToken } from '@/lib/calendar/google-calendar';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { extractDateTimeReferences } from './calendar-verifier';
import { parseISO, startOfDay, endOfDay, addMinutes } from 'date-fns';
import { TZDate } from '@date-fns/tz';

/**
 * Auto-create calendar event from message scheduling intent
 */
export async function autoCreateEventFromMessage(
  messageId: string,
  workspaceId: string,
  userId: string,
  options: {
    calendarConnectionId?: string;
    autoConfirm?: boolean;
  } = {}
) {
  try {
    // SCHEDULING ASSISTANT CHECK: Require Pro+ plan
    const { hasFeatureAccess } = await import('@/lib/entitlements-guard');
    const hasSchedulingAssistant = await hasFeatureAccess(workspaceId, 'schedulingAssistant');
    if (!hasSchedulingAssistant) {
      return {
        success: false,
        message: 'Intelligent scheduling assistant requires a Professional plan. Please upgrade.',
      };
    }

    // Detect scheduling intent
    const intent = await detectSchedulingIntent(messageId, workspaceId);

    if (!intent.hasIntent) {
      return {
        success: false,
        message: 'No scheduling intent detected',
      };
    }

    // Get message details
    const supabase = await createSupabaseUserServerActionClient();
    const { data: message } = await supabase
      .from('messages')
      .select('subject, sender_email, sender_name')
      .eq('id', messageId)
      .single();

    if (!message) {
      throw new Error('Message not found');
    }

    // Find calendar connection
    let calendarConnectionId = options.calendarConnectionId;

    if (!calendarConnectionId) {
      const { data: connection } = await supabase
        .from('calendar_connections')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!connection) {
        return {
          success: false,
          message: 'No calendar connection found. Please connect a calendar first.',
        };
      }

      calendarConnectionId = connection.id;
    }

    // Get calendar connection details
    const { data: calendarConnection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', calendarConnectionId)
      .single();

    if (!calendarConnection) {
      throw new Error('Calendar connection not found');
    }

    // Determine event details
    const startTime = intent.proposedTimes?.[0] || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const duration = intent.duration || 60; // Default 60 minutes
    const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();

    // Create event title
    const title = message.subject || `Meeting with ${message.sender_name || message.sender_email}`;

    // Create event in Google Calendar (if Google Calendar)
    if (calendarConnection.provider === 'google_calendar') {
      const accessToken = await getGoogleCalendarAccessToken(calendarConnectionId);

      const googleEvent = await createGoogleCalendarEvent(accessToken, {
        summary: title,
        description: `Scheduled via Aiva.io from message`,
        start: {
          dateTime: startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC',
        },
        attendees: [{ email: message.sender_email }],
        location: intent.location,
      });

      // Store in database
      await createEventAction({
        workspaceId,
        calendarConnectionId,
        providerEventId: googleEvent.id,
        title,
        description: `Scheduled via Aiva.io`,
        startTime,
        endTime,
        timezone: 'UTC',
        organizer: { email: calendarConnection.provider_account_email || '', name: '' },
        attendees: [
          {
            email: message.sender_email,
            name: message.sender_name || message.sender_email,
            responseStatus: 'needsAction',
          },
        ],
        location: intent.location,
        createdFromMessageId: messageId,
      });

      return {
        success: true,
        event: googleEvent,
        message: 'Event created successfully',
      };
    }

    // For other calendar providers, just store in database
    const result = await createEventAction({
      workspaceId,
      calendarConnectionId,
      providerEventId: `manual_${Date.now()}`,
      title,
      description: `Scheduled via Aiva.io`,
      startTime,
      endTime,
      timezone: 'UTC',
      organizer: { email: calendarConnection.provider_account_email || '', name: '' },
      attendees: [
        {
          email: message.sender_email,
          name: message.sender_name || message.sender_email,
          responseStatus: 'needsAction',
        },
      ],
      location: intent.location,
      createdFromMessageId: messageId,
    });

    return {
      success: true,
      event: result?.data,
      message: 'Event created successfully',
    };
  } catch (error) {
    console.error('Auto-create event error:', error);
    throw error;
  }
}

/**
 * Create calendar event from a sent email reply
 * Extracts date/time from message and draft's calendar_context
 * Creates all-day event if no time specified, or timed event if time provided
 */
export async function createCalendarEventFromSentEmail(
  messageId: string,
  draftId: string,
  workspaceId: string,
  userId: string,
  options?: { useAdminClient?: boolean }
): Promise<{ success: boolean; eventId?: string; message?: string }> {
  try {
    // SCHEDULING ASSISTANT CHECK: Require Pro+ plan
    const { hasFeatureAccess } = await import('@/lib/entitlements-guard');
    const hasSchedulingAssistant = await hasFeatureAccess(workspaceId, 'schedulingAssistant');
    if (!hasSchedulingAssistant) {
      const msg = 'Calendar event creation from emails requires a Professional plan. Please upgrade.';
      console.log('[Calendar Event] Skipped:', msg);
      return { success: false, message: msg };
    }

    // Cron has no user session; use admin client so RLS doesn't block reads/insert
    const supabase = options?.useAdminClient
      ? supabaseAdminClient
      : await createSupabaseUserServerActionClient();

    // Get message and draft
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('subject, body, sender_email, sender_name')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      console.log('[Calendar Event] Message not found:', msgError?.message, 'messageId:', messageId);
      return { success: false, message: msgError?.message || 'Message not found' };
    }

    const { data: draft, error: draftError } = await supabase
      .from('message_drafts')
      .select('calendar_context, body, auto_sent, auto_sent_at')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      console.log('[Calendar Event] Draft not found:', draftError?.message, 'draftId:', draftId);
      return { success: false, message: draftError?.message || 'Draft not found' };
    }

    // SAFETY GUARD: Only create calendar events after the reply has actually been sent.
    // The auto_sent flag is set by auto-send cron; manual sends call this right after sendReply succeeds.
    // If the draft hasn't been sent yet (still a draft), do NOT create the event prematurely.
    // Note: manual sends (sendReplyAction / review-queue approval) call this immediately after
    // a successful send, so auto_sent may not be set yet in those flows. The caller is responsible
    // for only calling this function after a successful send.
    console.log('[Calendar Event] Draft send status:', {
      draftId,
      autoSent: draft.auto_sent,
      autoSentAt: draft.auto_sent_at,
    });

    // Workspace timezone so "Tuesday 3pm" is in the user's local time
    const { data: wsRow } = await supabase
      .from('workspace_settings')
      .select('workspace_settings')
      .eq('workspace_id', workspaceId)
      .single();
    const wsSettings = (wsRow?.workspace_settings || {}) as Record<string, unknown>;
    const userTimeZone =
      typeof wsSettings?.timezone === 'string' && wsSettings.timezone.length > 0
        ? (wsSettings.timezone as string)
        : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Extract date/time from the ORIGINAL incoming message (with timezone for correct "Tuesday" etc.)
    console.log('[Calendar Event] Extracting dates from message:', {
      subject: message.subject,
      bodyLength: message.body?.length || 0,
      userTimeZone,
    });

    let dateTimeInfo = await extractDateTimeReferences(
      message.subject || '',
      message.body || '',
      userTimeZone
    );

    console.log('[Calendar Event] Date extraction from original message:', {
      hasDateTime: dateTimeInfo.hasDateTime,
      dateReferences: dateTimeInfo.dateReferences,
      parsedDates: dateTimeInfo.parsedDates,
      timeReferences: dateTimeInfo.timeReferences,
      confidence: dateTimeInfo.confidence,
    });

    // If no dates found in original message, try extracting from the draft reply
    if (dateTimeInfo.parsedDates.length === 0 && draft.body) {
      console.log('[Calendar Event] No dates in original message, trying draft body...');
      const draftDateInfo = await extractDateTimeReferences(
        message.subject || '',
        draft.body,
        userTimeZone
      );

      if (draftDateInfo.parsedDates.length > 0) {
        console.log('[Calendar Event] Found dates in draft:', draftDateInfo.parsedDates);
        dateTimeInfo = draftDateInfo;
      }
    }

    // Check if we have date/time information
    if (!dateTimeInfo.hasDateTime && dateTimeInfo.parsedDates.length === 0) {
      const msg = 'No date/time information found in the message or draft.';
      console.log('[Calendar Event]', msg);
      return { success: false, message: msg };
    }

    // Find calendar connection
    const { data: calendarConnection } = await supabase
      .from('calendar_connections')
      .select('id, provider, provider_account_email')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!calendarConnection) {
      const msg = 'No active calendar connection for this workspace. Connect a calendar in Calendar → Connect Calendar.';
      console.log('[Calendar Event]', msg);
      return { success: false, message: msg };
    }

    // Determine event date/time in the user's timezone (so "Tuesday 3pm" is correct locally)
    let isAllDay = true;
    let startTime: string;
    let endTime: string;
    const duration = 60; // Default 60 minutes

    const parsedDateStr = dateTimeInfo.parsedDates[0];
    let dateOnly = parsedDateStr ? parseISO(parsedDateStr) : null;
    if (!dateOnly || Number.isNaN(dateOnly.getTime())) {
      const d = new Date();
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 5) d.setDate(d.getDate() + 3);
      else if (dayOfWeek === 6) d.setDate(d.getDate() + 2);
      else if (dayOfWeek === 0) d.setDate(d.getDate() + 1);
      else d.setDate(d.getDate() + 1);
      dateOnly = d;
    }

    const year = dateOnly.getFullYear();
    const monthIndex = dateOnly.getMonth();
    const day = dateOnly.getDate();

    const getHourMinute = (): { hour: number; minute: number } => {
      if (dateTimeInfo.timeReferences.length === 0) return { hour: 0, minute: 0 };
      const timeRef = dateTimeInfo.timeReferences[0].toLowerCase();
      const timeMatch = timeRef.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3]?.toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        return { hour, minute };
      }
      if (timeRef.includes('lunch')) return { hour: 12, minute: 0 };
      if (timeRef.includes('breakfast')) return { hour: 8, minute: 0 };
      if (timeRef.includes('dinner') || timeRef.includes('evening')) return { hour: 19, minute: 0 };
      if (timeRef.includes('afternoon')) return { hour: 14, minute: 0 };
      if (timeRef.includes('morning')) return { hour: 10, minute: 0 };
      return { hour: 14, minute: 0 };
    };

    if (dateTimeInfo.timeReferences.length > 0) {
      isAllDay = false;
      const { hour, minute } = getHourMinute();
      // Build start in user's timezone then convert to UTC for storage
      const tzStart = new TZDate(year, monthIndex, day, hour, minute, 0, 0, userTimeZone);
      startTime = tzStart.toISOString();
      endTime = addMinutes(new Date(tzStart.getTime()), duration).toISOString();
      console.log('[Calendar Event] Using user timezone:', userTimeZone, '-> start:', startTime);
    } else {
      // All-day event: 00:00–23:59 in user's timezone
      const tzStart = new TZDate(year, monthIndex, day, 0, 0, 0, 0, userTimeZone);
      const tzEnd = new TZDate(year, monthIndex, day, 23, 59, 59, 999, userTimeZone);
      startTime = tzStart.toISOString();
      endTime = tzEnd.toISOString();
    }

    // Create event title
    const title = message.subject || `Meeting with ${message.sender_name || message.sender_email}`;

    // Prevent overlapping bookings: do not create if an event already exists at this time
    const { data: overlapping } = await supabase
      .from('events')
      .select('id, title, start_time, end_time')
      .eq('workspace_id', workspaceId)
      .lt('start_time', endTime)
      .gt('end_time', startTime)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      console.log('[Calendar Event] Not creating event: overlapping booking exists:', overlapping[0].title);
      return { success: false, message: 'Overlapping booking already exists at this time' };
    }

    // Create event directly in database (we're already in a server context)
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert({
        workspace_id: workspaceId,
        calendar_connection_id: calendarConnection.id,
        provider_event_id: `email_${messageId}_${Date.now()}`,
        title,
        description: `Created from email reply to ${message.sender_email}`,
        start_time: startTime,
        end_time: endTime,
        timezone: userTimeZone || 'UTC',
        is_all_day: isAllDay,
        organizer: { 
          email: calendarConnection.provider_account_email || '', 
          name: '' 
        },
        attendees: [
          {
            email: message.sender_email,
            name: message.sender_name || message.sender_email,
            responseStatus: 'needsAction',
          },
        ],
        created_from_message_id: messageId,
      })
      .select()
      .single();

    if (eventError) {
      console.error('[Calendar Event] Error creating event:', eventError);
      return { success: false, message: eventError.message };
    }

    if (eventData) {
      console.log('[Calendar Event] Event created successfully:', eventData.id);
      return { success: true, eventId: eventData.id };
    }

    return { success: false, message: 'Failed to create event' };
  } catch (error) {
    console.error('[Calendar Event] Error creating event:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
