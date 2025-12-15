/**
 * Twitter/X OAuth Callback Route
 * Handles OAuth response from Twitter and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { createChannelConnectionAction } from '@/data/user/channels';
import { toSiteURL, getOAuthRedirectUri } from '@/utils/helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TwitterTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface TwitterUserInfo {
  data: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
  };
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
        toSiteURL(`${locale}/channels?error=${encodeURIComponent(error)}`)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/channels?error=missing_parameters`)
      );
    }

    // Decode state
    let stateData: { 
      workspaceId: string; 
      userId: string; 
      timestamp: number;
      redirectUri?: string;
    };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        toSiteURL(`${locale}/channels?error=invalid_state`)
      );
    }

    // Validate state timestamp
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/channels?error=expired_state`)
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
    const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/channels?error=oauth_not_configured`)
      );
    }

    let redirectUri: string;
    if (stateData.redirectUri) {
      redirectUri = stateData.redirectUri;
    } else {
      const origin = request.nextUrl.origin;
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      
      if (isLocalhost) {
        redirectUri = getOAuthRedirectUri(origin, '/api/auth/twitter/callback');
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');
        redirectUri = `https://${siteUrl}/api/auth/twitter/callback`;
      } else {
        redirectUri = getOAuthRedirectUri(origin, '/api/auth/twitter/callback');
      }
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: 'challenge', // Should match code_challenge from auth
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Twitter token exchange failed:', errorText);
      return NextResponse.redirect(
        toSiteURL(`${locale}/channels?error=token_exchange_failed`)
      );
    }

    const tokens: TwitterTokenResponse = await tokenResponse.json();

    // Get user info from Twitter
    const userInfoResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info from Twitter');
      return NextResponse.redirect(
        toSiteURL(`${locale}/channels?error=userinfo_failed`)
      );
    }

    const userInfo: TwitterUserInfo = await userInfoResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Store connection in database
    const result = await createChannelConnectionAction({
      workspaceId: stateData.workspaceId,
      provider: 'twitter',
      providerAccountId: userInfo.data.id,
      providerAccountName: userInfo.data.name || userInfo.data.username,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt,
      scopes: tokens.scope.split(' '),
      metadata: {
        username: userInfo.data.username,
        profile_image_url: userInfo.data.profile_image_url,
        grantedAt: new Date().toISOString(),
      },
    });

    if (!result?.data?.data) {
      throw new Error('Failed to store connection');
    }

    return NextResponse.redirect(
      toSiteURL(`${locale}/channels?success=twitter_connected`)
    );
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    const locale = 'en';
    return NextResponse.redirect(
      toSiteURL(`${locale}/channels?error=${encodeURIComponent(error instanceof Error ? error.message : 'connection_failed')}`)
    );
  }
}

