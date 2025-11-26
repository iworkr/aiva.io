/**
 * Microsoft Teams OAuth Initiation Route
 * Reuses Azure AD app (same as Outlook) for Teams permissions
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

    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.url;
      return NextResponse.redirect(new URL('/en/login', baseUrl));
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Teams OAuth not configured',
          message:
            'Please configure MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables',
        },
        { status: 500 }
      );
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/teams/callback`;

    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
        redirectUri,
      })
    ).toString('base64');

    const scopes = [
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Chat.Read',
      'https://graph.microsoft.com/Chat.ReadWrite',
      'https://graph.microsoft.com/Channel.ReadBasic.All',
      'offline_access',
    ];

    const tenant = process.env.AZURE_TENANT_ID || 'common';
    const authUrl = new URL(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`
    );
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('response_mode', 'query');
    authUrl.searchParams.append('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Teams OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Teams OAuth' },
      { status: 500 }
    );
  }
}


