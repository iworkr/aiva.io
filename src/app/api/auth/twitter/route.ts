/**
 * Twitter/X OAuth Initiation Route
 * Redirects user to Twitter OAuth consent screen
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

    // Check if Twitter OAuth credentials are configured
    const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Twitter OAuth not configured',
          message: 'Please configure TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET environment variables',
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
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/twitter/callback');
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');
      redirectUri = `https://${siteUrl}/api/auth/twitter/callback`;
    } else {
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/twitter/callback');
    }

    // Twitter OAuth 2.0 scopes
    const scopes = [
      'tweet.read',
      'users.read',
      'dm.read',
      'dm.write',
      'offline.access',
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

    // Twitter OAuth 2.0 authorization URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', 'challenge'); // For PKCE
    authUrl.searchParams.append('code_challenge_method', 'plain');

    console.log('🐦 Twitter OAuth initiation:', {
      redirectUri,
      clientId: clientId?.substring(0, 20) + '...',
      workspaceId,
      userId: user.id,
    });

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Twitter OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Twitter OAuth' },
      { status: 500 }
    );
  }
}

