/**
 * Google Calendar OAuth Callback Route
 * Handles OAuth response from Google and stores calendar connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { createCalendarConnectionAction } from '@/data/user/calendar';
import { toSiteURL } from '@/utils/helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const locale = 'en';

    if (error) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/calendar?error=${encodeURIComponent(error)}`)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/calendar?error=missing_parameters`)
      );
    }

    // Decode state
    let stateData: { 
      workspaceId: string; 
      userId: string; 
      timestamp: number;
    };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        toSiteURL(`${locale}/calendar?error=invalid_state`)
      );
    }

    // Validate state timestamp
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/calendar?error=expired_state`)
      );
    }

    // Get authenticated user
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/login?error=session_expired`)
      );
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/calendar?error=oauth_not_configured`)
      );
    }

    // Build redirect URI
    const origin = request.nextUrl.origin;
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    
    let redirectUri: string;
    if (isLocalhost) {
      redirectUri = `${origin}/api/auth/calendar/google/callback`;
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');
      redirectUri = `https://${siteUrl}/api/auth/calendar/google/callback`;
    } else {
      redirectUri = `${origin}/api/auth/calendar/google/callback`;
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Google Calendar token exchange failed:', errorText);
      return NextResponse.redirect(
        toSiteURL(`${locale}/calendar?error=token_exchange_failed`)
      );
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info from Google');
      return NextResponse.redirect(
        toSiteURL(`${locale}/calendar?error=userinfo_failed`)
      );
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Store calendar connection in database
    const result = await createCalendarConnectionAction({
      workspaceId: stateData.workspaceId,
      provider: 'google_calendar',
      providerAccountId: userInfo.email,
      providerAccountEmail: userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt,
      scopes: tokens.scope.split(' '),
      metadata: {
        picture: userInfo.picture,
        name: userInfo.name,
        grantedAt: new Date().toISOString(),
      },
    });

    if (!result?.data) {
      throw new Error('Failed to store calendar connection');
    }

    return NextResponse.redirect(
      toSiteURL(`${locale}/calendar?success=google_calendar_connected`)
    );
  } catch (error) {
    console.error('Google Calendar OAuth callback error:', error);
    const locale = 'en';
    return NextResponse.redirect(
      toSiteURL(`${locale}/calendar?error=${encodeURIComponent(error instanceof Error ? error.message : 'connection_failed')}`)
    );
  }
}

