import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify Gmail callback route is accessible
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Gmail callback route is accessible',
    pathname: request.nextUrl.pathname,
    timestamp: new Date().toISOString(),
    expectedCallbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/gmail/callback`,
  });
}

