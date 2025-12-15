/**
 * LinkedIn OAuth Initiation Route
 * Redirects user to LinkedIn OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getOAuthRedirectUri } from '@/utils/helpers';
import crypto from 'crypto';

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

    // Check if LinkedIn OAuth credentials are configured
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'LinkedIn OAuth not configured',
          message: 'Please configure LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables',
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
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/linkedin/callback');
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');
      redirectUri = `https://${siteUrl}/api/auth/linkedin/callback`;
    } else {
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/linkedin/callback');
    }

    // LinkedIn OAuth 2.0 scopes
    const scopes = [
      'openid',
      'profile',
      'email',
      'w_member_social',
      'r_liteprofile',
    ];

    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Build OAuth URL with state
    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
        redirectUri,
        codeVerifier, // Store for callback
      })
    ).toString('base64');

    // LinkedIn OAuth 2.0 authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    console.log('💼 LinkedIn OAuth initiation:', {
      redirectUri,
      clientId: clientId?.substring(0, 20) + '...',
      workspaceId,
      userId: user.id,
    });

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('LinkedIn OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate LinkedIn OAuth' },
      { status: 500 }
    );
  }
}

