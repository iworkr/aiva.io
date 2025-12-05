/**
 * Outlook/Microsoft 365 OAuth Initiation Route
 * Redirects user to Microsoft OAuth consent screen
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

    // Get authenticated user using route handler client (CRITICAL: must use route handler client for API routes)
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
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    
    // Build redirect URI
    // For localhost: always use request origin (for development)
    // For production: use NEXT_PUBLIC_SITE_URL if set (for consistency with Azure Portal)
    let redirectUri: string;
    const origin = request.nextUrl.origin;
    const host = request.headers.get('host') || '';
    const forwardedHost = request.headers.get('x-forwarded-host') || '';
    
    // More robust localhost detection
    const isLocalhost = 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') ||
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      forwardedHost.includes('localhost') ||
      forwardedHost.includes('127.0.0.1') ||
      request.url.includes('localhost') ||
      request.url.includes('127.0.0.1');
    
    console.log('🔵 Outlook OAuth Origin Detection:', {
      origin,
      host,
      forwardedHost,
      requestUrl: request.url,
      isLocalhost,
      nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });
    
    if (isLocalhost) {
      // Always use request origin for localhost (development)
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/outlook/callback');
      console.log('🔵 Using LOCALHOST redirect URI:', redirectUri);
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      // Production: use configured site URL - normalize it EXACTLY
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.trim();
      
      // Remove all trailing slashes
      siteUrl = siteUrl.replace(/\/+$/, '');
      
      // Remove protocol if present (we'll add https://)
      siteUrl = siteUrl.replace(/^https?:\/\//, '');
      
      // Always use HTTPS for production
      siteUrl = `https://${siteUrl}`;
      
      // Ensure no trailing slash
      siteUrl = siteUrl.replace(/\/+$/, '');
      
      // Construct redirect URI - ensure exact format
      redirectUri = `${siteUrl}/api/auth/outlook/callback`;
      
      console.log('🔵 Using PRODUCTION redirect URI:', redirectUri);
    } else {
      // Fallback: use request origin
      redirectUri = getOAuthRedirectUri(origin, '/api/auth/outlook/callback');
      console.log('🔵 Using FALLBACK redirect URI:', redirectUri);
    }
    
    console.log('🔵 Outlook OAuth Redirect URI (FINAL):', redirectUri);

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

    // Build OAuth URL with state (include redirectUri to ensure exact match in callback)
    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
        redirectUri, // Store the exact redirect URI used
      })
    ).toString('base64');

    console.log('🔵 Outlook OAuth initiation:', {
      redirectUri,
      clientId: clientId?.substring(0, 20) + '...',
      workspaceId,
      userId: user.id,
      origin: request.nextUrl.origin,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      isProduction: !isLocalhost,
    });

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('response_mode', 'query');
    authUrl.searchParams.append('state', state);

    console.log('🔵 Redirecting to Microsoft OAuth:', authUrl.toString().substring(0, 200) + '...');
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Outlook OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Outlook OAuth' },
      { status: 500 }
    );
  }
}

