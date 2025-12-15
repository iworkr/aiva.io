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

