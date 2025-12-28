/**
 * Test endpoint to verify OAuth callback route is accessible
 * GET /api/debug/test-oauth-callback
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
  const redirectUri = `${appUrl}/api/shopify/auth/callback`;
  
  return NextResponse.json({
    message: 'OAuth callback route test',
    expectedCallbackUrl: redirectUri,
    actualRequestUrl: request.url,
    environment: {
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || 'NOT SET',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET',
      appUrl,
    },
    instructions: [
      '1. Check Shopify Partner Dashboard → App Setup → Allowed redirection URL(s)',
      `2. Make sure this URL is listed: ${redirectUri}`,
      '3. The URL must match EXACTLY (including https://, no trailing slash)',
      '4. After uninstalling/reinstalling, check Vercel logs for:',
      '   - 🟢 [OAuth Init] Shopify OAuth initiation',
      '   - 🔵 [OAuth Callback] REQUEST RECEIVED',
      '   - 🟢 [OAuth Callback] Callback received',
    ],
  });
}

