/**
 * Gmail OAuth Initiation Route
 * Redirects user to Google OAuth consent screen
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
    
    // Build redirect URI
    // For localhost: always use request origin (for development)
    // For production: use NEXT_PUBLIC_SITE_URL if set (for consistency with Google Cloud Console)
    let redirectUri: string;
    const origin = request.nextUrl.origin;
    const host = request.headers.get('host') || '';
    const forwardedHost = request.headers.get('x-forwarded-host') || '';
    
    // More robust localhost detection - check origin, host header, and forwarded host
    const isLocalhost = 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') ||
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      forwardedHost.includes('localhost') ||
      forwardedHost.includes('127.0.0.1') ||
      request.url.includes('localhost') ||
      request.url.includes('127.0.0.1');
    
    // CRITICAL: Log all detection info for debugging
    console.log('🔵 Gmail OAuth Origin Detection:', {
      origin,
      host,
      forwardedHost,
      requestUrl: request.url,
      isLocalhost,
      nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });
    
    if (isLocalhost) {
      // Always use request origin for localhost (development)
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/gmail/callback');
      console.log('🔵 Using LOCALHOST redirect URI:', redirectUri);
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      // Production: use configured site URL - normalize it EXACTLY
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim();
      
      // Remove all trailing slashes
      siteUrl = siteUrl.replace(/\/+$/, '');
      
      // Remove protocol if present (we'll add https://)
      siteUrl = siteUrl.replace(/^https?:\/\//, '');
      
      // Remove www. if we want to ensure consistency (or keep it if that's what's configured)
      // Actually, keep it as configured - just normalize the protocol
      
      // Always use HTTPS for production
      siteUrl = `https://${siteUrl}`;
      
      // Ensure no trailing slash
      siteUrl = siteUrl.replace(/\/+$/, '');
      
      // Construct redirect URI - ensure exact format
      redirectUri = `${siteUrl}/api/auth/gmail/callback`;
      
      // CRITICAL: Verify the exact format matches Google Cloud Console
      console.log('🔵 Using PRODUCTION redirect URI:', redirectUri);
      console.log('🔵 Expected format: https://www.tryaiva.io/api/auth/gmail/callback');
      console.log('🔵 Match:', redirectUri === 'https://www.tryaiva.io/api/auth/gmail/callback' ? '✅ EXACT MATCH' : '❌ MISMATCH');
    } else {
      // Fallback: use request origin
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/gmail/callback');
      console.log('🔵 Using FALLBACK redirect URI:', redirectUri);
    }
    
    // CRITICAL: Log the exact redirect URI being used for debugging
    console.log('🔵 Gmail OAuth Redirect URI (FINAL):', redirectUri);

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
      clientId: clientId?.substring(0, 20) + '...',
      workspaceId,
      userId: user.id,
      origin: request.nextUrl.origin,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      isProduction: !request.nextUrl.origin.includes('localhost'),
      fullUrl: request.url,
      headers: {
        host: request.headers.get('host'),
        'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
        'x-forwarded-host': request.headers.get('x-forwarded-host'),
      },
    });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state);

    // Log the FULL redirect URI for debugging
    const fullRedirectUri = authUrl.searchParams.get('redirect_uri');
    console.log('🔵 FULL Redirect URI being sent to Google:', fullRedirectUri);
    console.log('🔵 Complete OAuth URL:', authUrl.toString());
    console.log('🔵 Environment check:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      redirectUri,
      matchesGoogleConsole: fullRedirectUri === 'https://www.tryaiva.io/api/auth/gmail/callback',
    });
    
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Gmail OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail OAuth' },
      { status: 500 }
    );
  }
}

