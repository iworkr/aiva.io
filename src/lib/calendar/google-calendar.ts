/**
 * Google Calendar Integration
 * OAuth and API client for Google Calendar
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { createCalendarConnectionAction } from '@/data/user/calendar';

/**
 * Initiate Google Calendar OAuth
 */
export async function getGoogleCalendarAuthUrl(workspaceId: string, userId: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/calendar/google/callback`;

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const state = Buffer.from(
    JSON.stringify({ workspaceId, userId, timestamp: Date.now() })
  ).toString('base64');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  authUrl.searchParams.append('state', state);

  return authUrl.toString();
}

/**
 * Refresh Google Calendar token
 */
export async function refreshGoogleCalendarToken(
  connectionId: string,
  refreshToken: string
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error('Failed to refresh Google Calendar token');

  const data = await response.json();
  const tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const supabase = await createSupabaseUserServerActionClient();
  await supabase
    .from('calendar_connections')
    .update({
      access_token: data.access_token,
      token_expires_at: tokenExpiresAt,
      status: 'active',
    })
    .eq('id', connectionId);

  return data.access_token;
}

/**
 * Get Google Calendar access token
 */
export async function getGoogleCalendarAccessToken(connectionId: string): Promise<string> {
  const supabase = await createSupabaseUserServerActionClient();
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', connectionId)
    .single();

  if (!connection) throw new Error('Calendar connection not found');

  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    if (expiresAt <= new Date(Date.now() + 5 * 60 * 1000) && connection.refresh_token) {
      return await refreshGoogleCalendarToken(connectionId, connection.refresh_token);
    }
  }

  return connection.access_token;
}

/**
 * List Google Calendar events
 */
export async function listGoogleCalendarEvents(
  accessToken: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  } = {}
) {
  const params = new URLSearchParams({
    timeMin: options.timeMin || new Date().toISOString(),
    timeMax: options.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults: String(options.maxResults || 50),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) throw new Error('Failed to fetch Google Calendar events');
  return await response.json();
}

/**
 * Create Google Calendar event
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: Array<{ email: string }>;
    location?: string;
  }
) {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) throw new Error('Failed to create Google Calendar event');
  return await response.json();
}

