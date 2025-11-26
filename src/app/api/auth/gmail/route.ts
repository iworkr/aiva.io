/**
 * Gmail OAuth Initiation Route
 * Redirects user to Google OAuth consent screen
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

    // Get authenticated user using route handler client
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.url;
      return NextResponse.redirect(new URL('/en/login', baseUrl));
    }

    // Check if Google OAuth credentials are configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // Ensure no double slashes - remove trailing slash from base URL if present
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/auth/gmail/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Gmail OAuth not configured',
          message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
        },
        { status: 500 }
      );
    }

    // Gmail API scopes
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // Build OAuth URL with state (include redirectUri to ensure exact match in callback)
    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
        redirectUri, // Store the exact redirect URI used
      })
    ).toString('base64');

    console.log('🔵 Gmail OAuth initiation:', {
      redirectUri,
      expectedCallbackUrl: `${baseUrl}/api/auth/gmail/callback`,
      clientId: clientId?.substring(0, 20) + '...',
      workspaceId,
      userId: user.id,
      baseUrl,
    });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state);

    console.log('🔵 Redirecting to Google OAuth:', authUrl.toString().substring(0, 200) + '...');
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Gmail OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail OAuth' },
      { status: 500 }
    );
  }
}

