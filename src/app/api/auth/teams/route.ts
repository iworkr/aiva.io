/**
 * Microsoft Teams OAuth Initiation Route
 * Uses separate Teams Azure AD app for Teams-specific permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getOAuthRedirectUri } from '@/utils/helpers';

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

    // Use Teams-specific credentials (fallback to Microsoft credentials if Teams not configured)
    const clientId = process.env.TEAMS_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.TEAMS_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Teams OAuth not configured',
          message:
            'Please configure TEAMS_CLIENT_ID and TEAMS_CLIENT_SECRET (or MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET) environment variables',
        },
        { status: 500 }
      );
    }

    // Build redirect URI dynamically from the current request origin
    // This ensures localhost uses localhost callback, and production uses HTTPS
    const origin = request.nextUrl.origin; // e.g. http://localhost:3000 or https://www.tryaiva.io
    const redirectUri = getOAuthRedirectUri(origin, '/api/auth/teams/callback');

    // Build OAuth URL with state (include redirectUri to ensure exact match in callback)
    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
        redirectUri, // Store the exact redirect URI used
      })
    ).toString('base64');

    const scopes = [
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Chat.Read',
      'https://graph.microsoft.com/Chat.ReadWrite',
      'https://graph.microsoft.com/Channel.ReadBasic.All',
      'offline_access',
    ];

    const tenant = process.env.TEAMS_TENANT_ID || process.env.AZURE_TENANT_ID || 'common';
    const authUrl = new URL(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`
    );
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('response_mode', 'query');
    authUrl.searchParams.append('state', state);

    console.log('🔵 Teams OAuth initiation:', {
      redirectUri,
      clientId: clientId?.substring(0, 20) + '...',
      workspaceId,
      userId: user.id,
      origin,
      tenant,
    });

    console.log('🔵 Redirecting to Microsoft OAuth for Teams:', authUrl.toString().substring(0, 200) + '...');
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Teams OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Teams OAuth' },
      { status: 500 }
    );
  }
}


