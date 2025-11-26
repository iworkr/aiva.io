/**
 * Microsoft Teams OAuth Callback Route
 * Handles OAuth response from Azure AD and stores tokens as a Teams channel connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { createChannelConnectionAction } from '@/data/user/channels';
import { toSiteURL } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const locale = 'en';

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
        toSiteURL(`${locale}/inbox?error=invalid_state`)
      );
    }

    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=expired_state`)
      );
    }

    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(toSiteURL(`${locale}/login`));
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
    const tenant = process.env.AZURE_TENANT_ID || 'common';

    const redirectUri =
      stateData.redirectUri ||
      `${process.env.NEXT_PUBLIC_SITE_URL?.replace(
        /\/$/,
        ''
      )}/api/auth/teams/callback`;

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
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

    const tokenJson = await tokenResponse.json();
    if (!tokenResponse.ok || tokenJson.error) {
      console.error('Teams token exchange failed:', tokenJson);
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=teams_token_exchange_failed`)
      );
    }

    const accessToken = tokenJson.access_token as string;
    const refreshToken = tokenJson.refresh_token as string | undefined;
    const expiresIn = tokenJson.expires_in as number | undefined;
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Fetch basic user info for display name
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let profile: any = {};
    if (profileRes.ok) {
      profile = await profileRes.json();
    }

    const result = await createChannelConnectionAction({
      workspaceId: stateData.workspaceId,
      provider: 'teams',
      providerAccountId: profile.id || 'teams-user',
      providerAccountName: profile.displayName || 'Microsoft Teams',
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes: (tokenJson.scope as string | undefined)?.split(' ') || [],
      metadata: {
        profile,
        grantedAt: new Date().toISOString(),
      },
    });

    if (!result?.data) {
      console.error('Failed to store Teams connection:', result);
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=teams_store_failed`)
      );
    }

    return NextResponse.redirect(
      toSiteURL(`${locale}/inbox?success=teams_connected`)
    );
  } catch (error) {
    console.error('Teams OAuth callback error:', error);
    const locale = 'en';
    return NextResponse.redirect(
      toSiteURL(
        `${locale}/inbox?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'teams_connection_failed'
        )}`
      )
    );
  }
}


