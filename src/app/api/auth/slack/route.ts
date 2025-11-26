/**
 * Slack OAuth Initiation Route
 * Redirects user to Slack OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';

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

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Slack OAuth not configured',
          message:
            'Please configure SLACK_CLIENT_ID and SLACK_CLIENT_SECRET environment variables',
        },
        { status: 500 }
      );
    }

    // Use current origin for callback (localhost vs production)
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/slack/callback`;

    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
        redirectUri,
      })
    ).toString('base64');

    const scopes = [
      'channels:history',
      'channels:read',
      'chat:write',
      'groups:history',
      'im:history',
      'mpim:history',
      'users:read',
    ];

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('scope', scopes.join(','));
    authUrl.searchParams.append('user_scope', ''); // none for now
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Slack OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Slack OAuth' },
      { status: 500 }
    );
  }
}


