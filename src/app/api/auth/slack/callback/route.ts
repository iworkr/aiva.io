/**
 * Slack OAuth Callback Route
 * Handles OAuth response from Slack and stores tokens
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
        toSiteURL(`${locale}/inbox?error=invalid_state`)
      );
    }

    // Validate state timestamp (5 minutes expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=expired_state`)
      );
    }

    // Ensure user is still authenticated and matches state
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(toSiteURL(`${locale}/login`));
    }

    const clientId = process.env.SLACK_CLIENT_ID!;
    const clientSecret = process.env.SLACK_CLIENT_SECRET!;

    // Use redirectUri from state (exact match with initiation)
    const redirectUri =
      stateData.redirectUri ||
      `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')}/api/auth/slack/callback`;

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenJson = await tokenResponse.json();
    if (!tokenJson.ok) {
      console.error('Slack token exchange failed:', tokenJson);
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=slack_token_exchange_failed`)
      );
    }

    const accessToken = tokenJson.access_token as string;
    const botToken = tokenJson.bot_user_id ? (tokenJson.access_token as string) : undefined;
    const team = tokenJson.team || {};
    const authedUser = tokenJson.authed_user || {};

    // Store connection in database
    const result = await createChannelConnectionAction({
      workspaceId: stateData.workspaceId,
      provider: 'slack',
      providerAccountId: team.id || authedUser.id,
      providerAccountName: team.name || 'Slack Workspace',
      accessToken,
      // Slack v2 OAuth tokens are typically long‑lived; omit explicit expiry if none provided
      refreshToken: undefined,
      tokenExpiresAt: undefined,
      scopes: (tokenJson.scope as string | undefined)?.split(',') || [],
      metadata: {
        team,
        authedUser,
        botToken,
        grantedAt: new Date().toISOString(),
      },
    });

    if (!result?.data) {
      console.error('Failed to store Slack connection:', result);
      return NextResponse.redirect(
        toSiteURL(`${locale}/inbox?error=slack_store_failed`)
      );
    }

    return NextResponse.redirect(
      toSiteURL(`${locale}/inbox?success=slack_connected`)
    );
  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    const locale = 'en';
    return NextResponse.redirect(
      toSiteURL(
        `${locale}/inbox?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'slack_connection_failed'
        )}`
      )
    );
  }
}


