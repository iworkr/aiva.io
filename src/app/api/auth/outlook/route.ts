/**
 * Outlook/Microsoft 365 OAuth Initiation Route
 * Redirects user to Microsoft OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';

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
    const supabase = await createSupabaseUserServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if Microsoft OAuth credentials are configured
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/outlook/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Outlook OAuth not configured',
          message: 'Please configure MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables',
        },
        { status: 500 }
      );
    }

    // Microsoft Graph API scopes
    const scopes = [
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'offline_access', // For refresh token
    ];

    // Build OAuth URL with state
    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('response_mode', 'query');
    authUrl.searchParams.append('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Outlook OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Outlook OAuth' },
      { status: 500 }
    );
  }
}

