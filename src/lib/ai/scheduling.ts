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
import { extractDateTimeReferences } from './calendar-verifier';
import { parseISO, startOfDay, endOfDay, addMinutes } from 'date-fns';

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
  userId: string
): Promise<{ success: boolean; eventId?: string; message?: string }> {
  try {
    const supabase = await createSupabaseUserServerActionClient();

    // Get message and draft
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('subject, body, sender_email, sender_name')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      console.log('[Calendar Event] Message not found:', msgError?.message);
      return { success: false, message: 'Message not found' };
    }

    const { data: draft, error: draftError } = await supabase
      .from('message_drafts')
      .select('calendar_context, body')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      console.log('[Calendar Event] Draft not found:', draftError?.message);
      return { success: false, message: 'Draft not found' };
    }

    // Extract date/time from message
    const dateTimeInfo = await extractDateTimeReferences(
      message.subject || '',
      message.body || ''
    );

    // Check if we have date/time information
    if (!dateTimeInfo.hasDateTime && dateTimeInfo.parsedDates.length === 0) {
      console.log('[Calendar Event] No date/time found in message');
      return { success: false, message: 'No date/time information found' };
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
      console.log('[Calendar Event] No calendar connection found');
      return { success: false, message: 'No calendar connection found' };
    }

    // Determine event date/time
    let eventDate: Date;
    let isAllDay = true;
    let startTime: string;
    let endTime: string;
    let duration = 60; // Default 60 minutes

    if (dateTimeInfo.parsedDates.length > 0) {
      // Use the first parsed date
      eventDate = parseISO(dateTimeInfo.parsedDates[0]);
    } else {
      // Fall back to calendar_context searchedDateRange if available
      const calendarContext = draft.calendar_context as any;
      if (calendarContext?.searchedDateRange?.start) {
        eventDate = parseISO(calendarContext.searchedDateRange.start);
      } else {
        // Default to tomorrow if no date found
        eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 1);
      }
    }

    // Check if time is specified
    if (dateTimeInfo.timeReferences.length > 0) {
      isAllDay = false;
      
      // Try to parse time from time references
      const timeRef = dateTimeInfo.timeReferences[0].toLowerCase();
      
      // Parse common time formats
      const timeMatch = timeRef.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3]?.toLowerCase();
        
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        
        eventDate.setHours(hour, minute, 0, 0);
        startTime = eventDate.toISOString();
        endTime = addMinutes(eventDate, duration).toISOString();
      } else {
        // Handle meal times
        if (timeRef.includes('lunch')) {
          eventDate.setHours(12, 0, 0, 0);
        } else if (timeRef.includes('breakfast')) {
          eventDate.setHours(8, 0, 0, 0);
        } else if (timeRef.includes('dinner')) {
          eventDate.setHours(19, 0, 0, 0);
        } else {
          // Default to noon if time reference but can't parse
          eventDate.setHours(12, 0, 0, 0);
        }
        startTime = eventDate.toISOString();
        endTime = addMinutes(eventDate, duration).toISOString();
      }
    } else {
      // All-day event
      const startOfEvent = startOfDay(eventDate);
      const endOfEvent = endOfDay(eventDate);
      startTime = startOfEvent.toISOString();
      endTime = endOfEvent.toISOString();
    }

    // Create event title
    const title = message.subject || `Meeting with ${message.sender_name || message.sender_email}`;

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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
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

