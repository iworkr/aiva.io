/**
 * Catch-all route for Supabase auth verification URLs that might land on our domain
 * Redirects to the correct Supabase auth endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const redirectTo = searchParams.get('redirect_to');

  // Get Supabase project URL from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not configured');
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
  }

  // Construct the correct Supabase verification URL
  const supabaseVerifyUrl = new URL('/auth/v1/verify', supabaseUrl);
  
  // Copy all query parameters
  if (token) supabaseVerifyUrl.searchParams.set('token', token);
  if (type) supabaseVerifyUrl.searchParams.set('type', type);
  if (redirectTo) supabaseVerifyUrl.searchParams.set('redirect_to', redirectTo);
  
  // Copy any other query parameters
  searchParams.forEach((value, key) => {
    if (!['token', 'type', 'redirect_to'].includes(key)) {
      supabaseVerifyUrl.searchParams.set(key, value);
    }
  });

  console.log('🔄 Redirecting Supabase auth verification to:', supabaseVerifyUrl.toString());

  // Redirect to Supabase's auth endpoint
  return NextResponse.redirect(supabaseVerifyUrl.toString());
}

