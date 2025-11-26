/**
 * Gmail OAuth Callback Route
 * Handles OAuth response from Google and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { createChannelConnectionAction } from '@/data/user/channels';
import { toSiteURL } from '@/utils/helpers';

// Ensure this route is dynamic and not cached
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

// Test endpoint to verify route is accessible
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Gmail callback route is accessible',
    pathname: request.nextUrl.pathname,
    timestamp: new Date().toISOString()
  });
}

export async function GET(request: NextRequest) {
  console.log('🔵 Gmail callback route hit!', {
    url: request.url,
    pathname: request.nextUrl.pathname,
    fullUrl: request.nextUrl.toString(),
    searchParams: Object.fromEntries(request.nextUrl.searchParams),
    headers: {
      'user-agent': request.headers.get('user-agent'),
      'referer': request.headers.get('referer'),
    }
  });

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('🔵 Gmail callback params:', { code: !!code, state: !!state, error });

    const locale = 'en'; // Default locale, could be extracted from state if needed

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=${encodeURIComponent(error)}`)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=missing_parameters`)
      );
    }

    // Decode state
    let stateData: { workspaceId: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=invalid_state`)
      );
    }

    // Validate state timestamp (5 minutes expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=expired_state`)
      );
    }

    // Get authenticated user using route handler client (properly handles cookies)
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== stateData.userId) {
      console.error('Auth error in Gmail callback:', authError);
      return NextResponse.redirect(
        toSiteURL(`${locale}/login?error=session_expired`)
      );
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    // Ensure no double slashes - remove trailing slash from base URL if present
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/auth/gmail/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=token_exchange_failed`)
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
        toSiteURL(`${locale}/inbox?error=userinfo_failed`)
      );
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Store connection in database using server action
    console.log('Storing Gmail connection for user:', user.id, 'workspace:', stateData.workspaceId);
    const result = await createChannelConnectionAction({
      workspaceId: stateData.workspaceId,
      provider: 'gmail',
      providerAccountId: userInfo.email,
      providerAccountName: userInfo.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt,
      scopes: tokens.scope.split(' '),
      metadata: {
        picture: userInfo.picture,
        grantedAt: new Date().toISOString(),
      },
    });

    if (!result?.data?.data) {
      console.error('Failed to store Gmail connection:', result);
      throw new Error('Failed to store connection');
    }

    console.log('Gmail connection stored successfully:', result.data.data.id);

    // Redirect to inbox page with success message
    return NextResponse.redirect(
      toSiteURL(`${locale}/inbox?success=gmail_connected`)
    );
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    const locale = 'en';
    return NextResponse.redirect(
      toSiteURL(`${locale}/inbox?error=${encodeURIComponent(error instanceof Error ? error.message : 'connection_failed')}`)
    );
  }
}

