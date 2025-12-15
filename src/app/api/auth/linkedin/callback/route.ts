/**
 * LinkedIn OAuth Callback Route
 * Handles OAuth response from LinkedIn and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { createChannelConnectionAction } from '@/data/user/channels';
import { toSiteURL, getOAuthRedirectUri } from '@/utils/helpers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LinkedInTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface LinkedInUserInfo {
  sub: string; // LinkedIn user ID
  name: string;
  given_name?: string;
  family_name?: string;
  email?: string;
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
      codeVerifier?: string;
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
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

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
        redirectUri = getOAuthRedirectUri(origin, '/api/auth/linkedin/callback');
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');
        redirectUri = `https://${siteUrl}/api/auth/linkedin/callback`;
      } else {
        redirectUri = getOAuthRedirectUri(origin, '/api/auth/linkedin/callback');
      }
    }

    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Add PKCE code verifier if available
    if (stateData.codeVerifier) {
      tokenParams.append('code_verifier', stateData.codeVerifier);
    }

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ LinkedIn token exchange failed:', errorText);
      return NextResponse.redirect(
        toSiteURL(`${locale}/channels?error=token_exchange_failed`)
      );
    }

    const tokens: LinkedInTokenResponse = await tokenResponse.json();

    // Get user info from LinkedIn
    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info from LinkedIn');
      return NextResponse.redirect(
        toSiteURL(`${locale}/channels?error=userinfo_failed`)
      );
    }

    const userInfo: LinkedInUserInfo = await userInfoResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Store connection in database
    const result = await createChannelConnectionAction({
      workspaceId: stateData.workspaceId,
      provider: 'linkedin',
      providerAccountId: userInfo.sub,
      providerAccountName: userInfo.name || userInfo.given_name || 'LinkedIn User',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt,
      scopes: tokens.scope.split(' '),
      metadata: {
        email: userInfo.email,
        picture: userInfo.picture,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
        grantedAt: new Date().toISOString(),
      },
    });

    if (!result?.data?.data) {
      throw new Error('Failed to store connection');
    }

    return NextResponse.redirect(
      toSiteURL(`${locale}/channels?success=linkedin_connected`)
    );
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error);
    const locale = 'en';
    return NextResponse.redirect(
      toSiteURL(`${locale}/channels?error=${encodeURIComponent(error instanceof Error ? error.message : 'connection_failed')}`)
    );
  }
}

