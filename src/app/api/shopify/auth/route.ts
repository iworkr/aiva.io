/**
 * Shopify OAuth Initiation Route
 * Handles app installation flow from Shopify merchants
 * 
 * Flow:
 * 1. Merchant clicks "Install" in Shopify App Store
 * 2. Shopify redirects to this route with shop parameter
 * 3. We redirect merchant to Shopify OAuth consent screen
 * 4. After consent, Shopify redirects to callback with auth code
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Shopify OAuth scopes - what your app can access
const SHOPIFY_SCOPES = [
  'read_customers',
  'write_customers', 
  'read_orders',
  'read_products',
  'read_content',
].join(',');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    // Validate shop parameter
    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Validate shop format (must be *.myshopify.com)
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
    if (!shopRegex.test(shop)) {
      return NextResponse.json(
        { error: 'Invalid shop parameter' },
        { status: 400 }
      );
    }

    // Get Shopify credentials
    const apiKey = process.env.SHOPIFY_API_KEY;
    const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!apiKey) {
      console.error('SHOPIFY_API_KEY not configured');
      return NextResponse.json(
        { error: 'Shopify integration not configured' },
        { status: 500 }
      );
    }

    // Generate nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex');

    // Build redirect URI
    const redirectUri = `${appUrl}/api/shopify/auth/callback`;

    // Build Shopify OAuth URL
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.append('client_id', apiKey);
    authUrl.searchParams.append('scope', SHOPIFY_SCOPES);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', nonce);

    console.log('🟢 Shopify OAuth initiation:', {
      shop,
      redirectUri,
      scopes: SHOPIFY_SCOPES,
    });

    // Create response with redirect
    const response = NextResponse.redirect(authUrl.toString());
    
    // Store nonce in cookie for validation in callback
    response.cookies.set('shopify_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // Also store shop in cookie for callback
    response.cookies.set('shopify_shop', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Shopify OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Shopify OAuth' },
      { status: 500 }
    );
  }
}





