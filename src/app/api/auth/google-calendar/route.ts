/**
 * Google Calendar OAuth Initiation Route
 * Redirects user to Google OAuth consent screen for Calendar access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getGoogleCalendarAuthUrl } from '@/lib/calendar/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.url;
      return NextResponse.redirect(new URL('/en/login', baseUrl));
    }

    // Check if Google OAuth credentials are configured
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Google Calendar OAuth not configured',
          message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
        },
        { status: 500 }
      );
    }

    // Get OAuth URL from helper function
    const authUrl = await getGoogleCalendarAuthUrl(workspaceId, user.id);

    console.log('📅 Google Calendar OAuth initiation:', {
      workspaceId,
      userId: user.id,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google Calendar OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar OAuth' },
      { status: 500 }
    );
  }
}

