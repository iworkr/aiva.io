/**
 * Outlook Calendar OAuth Initiation Route
 * Redirects user to Microsoft OAuth consent screen for Calendar access
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

    // Check if Microsoft OAuth credentials are configured
    const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Outlook Calendar OAuth not configured',
          message: 'Please configure MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables',
        },
        { status: 500 }
      );
    }

    // Build redirect URI
    const origin = request.nextUrl.origin;
    const isLocalhost = 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') ||
      request.headers.get('host')?.includes('localhost') ||
      request.headers.get('host')?.includes('127.0.0.1');

    let redirectUri: string;
    if (isLocalhost) {
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/outlook-calendar/callback');
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');
      redirectUri = `https://${siteUrl}/api/auth/outlook-calendar/callback`;
    } else {
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/outlook-calendar/callback');
    }

    // Microsoft Graph API scopes for Calendar
    const scopes = [
      'https://graph.microsoft.com/Calendars.Read',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ];

    // Build OAuth URL with state
    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
        redirectUri,
      })
    ).toString('base64');

    console.log('📅 Outlook Calendar OAuth initiation:', {
      redirectUri,
      clientId: clientId?.substring(0, 20) + '...',
      workspaceId,
      userId: user.id,
    });

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('response_mode', 'query');
    authUrl.searchParams.append('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Outlook Calendar OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Outlook Calendar OAuth' },
      { status: 500 }
    );
  }
}

