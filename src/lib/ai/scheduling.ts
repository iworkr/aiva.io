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
  userId: string
): Promise<{ success: boolean; eventId?: string; message?: string }> {
  try {
    // SCHEDULING ASSISTANT CHECK: Require Pro+ plan
    const { hasFeatureAccess } = await import('@/lib/entitlements-guard');
    const hasSchedulingAssistant = await hasFeatureAccess(workspaceId, 'schedulingAssistant');
    if (!hasSchedulingAssistant) {
      return {
        success: false,
        message: 'Calendar event creation from emails requires a Professional plan. Please upgrade.',
      };
    }

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

    // Extract date/time from the ORIGINAL incoming message
    console.log('[Calendar Event] Extracting dates from message:', {
      subject: message.subject,
      bodyLength: message.body?.length || 0,
    });
    
    let dateTimeInfo = await extractDateTimeReferences(
      message.subject || '',
      message.body || ''
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
        draft.body
      );
      
      if (draftDateInfo.parsedDates.length > 0) {
        console.log('[Calendar Event] Found dates in draft:', draftDateInfo.parsedDates);
        dateTimeInfo = draftDateInfo;
      }
    }

    // Check if we have date/time information
    if (!dateTimeInfo.hasDateTime && dateTimeInfo.parsedDates.length === 0) {
      console.log('[Calendar Event] No date/time found in message or draft');
      return { success: false, message: 'No date/time information found in the message. Please specify a date.' };
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
      console.log('[Calendar Event] Using parsed date:', eventDate.toISOString());
    } else {
      // No parsed dates - this shouldn't happen since we check above, but handle gracefully
      // IMPORTANT: Do NOT use searchedDateRange.start as that's the search START (usually today),
      // not the date mentioned in the email!
      console.log('[Calendar Event] Warning: No parsed dates, defaulting to next business day');
      
      // Default to next business day
      eventDate = new Date();
      const dayOfWeek = eventDate.getDay();
      
      // If Friday, Saturday, or Sunday, go to next Monday
      if (dayOfWeek === 5) {
        eventDate.setDate(eventDate.getDate() + 3); // Friday -> Monday
      } else if (dayOfWeek === 6) {
        eventDate.setDate(eventDate.getDate() + 2); // Saturday -> Monday
      } else if (dayOfWeek === 0) {
        eventDate.setDate(eventDate.getDate() + 1); // Sunday -> Monday
      } else {
        eventDate.setDate(eventDate.getDate() + 1); // Next day
      }
      
      console.log('[Calendar Event] Defaulted to:', eventDate.toISOString());
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
        // Handle common time expressions
        if (timeRef.includes('lunch')) {
          eventDate.setHours(12, 0, 0, 0);
        } else if (timeRef.includes('breakfast')) {
          eventDate.setHours(8, 0, 0, 0);
        } else if (timeRef.includes('dinner') || timeRef.includes('evening')) {
          eventDate.setHours(19, 0, 0, 0);
        } else if (timeRef.includes('afternoon')) {
          eventDate.setHours(14, 0, 0, 0); // 2pm for afternoon
        } else if (timeRef.includes('morning')) {
          eventDate.setHours(10, 0, 0, 0); // 10am for morning
        } else {
          // Default to 2pm if time reference but can't parse (common meeting time)
          eventDate.setHours(14, 0, 0, 0);
        }
        console.log('[Calendar Event] Parsed time reference:', timeRef, '-> hour:', eventDate.getHours());
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
