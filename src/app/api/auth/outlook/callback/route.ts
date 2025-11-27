/**
 * Outlook OAuth Callback Route
 * Handles OAuth response from Microsoft and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { createChannelConnectionAction } from '@/data/user/channels';
import { toSiteURL } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/channels?error=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/channels?error=missing_parameters', request.url)
      );
    }

    // Decode state
    let stateData: { workspaceId: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/channels?error=invalid_state', request.url)
      );
    }

    // Validate state timestamp
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/channels?error=expired_state', request.url)
      );
    }

    // Get authenticated user
    const supabase = await createSupabaseUserServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Exchange code for tokens
    const clientId = process.env.MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/outlook/callback`;

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
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
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/channels?error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        new URL('/channels?error=userinfo_failed', request.url)
      );
    }

    const userInfo = await userInfoResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Store connection in database
    const result = await createChannelConnectionAction({
      workspaceId: stateData.workspaceId,
      provider: 'outlook',
      providerAccountId: userInfo.mail || userInfo.userPrincipalName,
      providerAccountName: userInfo.displayName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt,
      scopes: tokens.scope?.split(' ') || [],
      metadata: {
        userPrincipalName: userInfo.userPrincipalName,
        grantedAt: new Date().toISOString(),
      },
    });

    if (!result?.data) {
      throw new Error('Failed to store connection');
    }

    // Check if this was an auto-connect from sign-in flow
    const autoConnect = request.nextUrl.searchParams.get('auto_connect') === 'true';
    const locale = 'en';
    
    // Redirect to inbox if auto-connect, otherwise channels
    const redirectUrl = autoConnect
      ? toSiteURL(`${locale}/inbox?success=outlook_connected&auto_connect=true`)
      : toSiteURL(`${locale}/channels?success=outlook_connected`);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Outlook OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/channels?error=connection_failed', request.url)
    );
  }
}

