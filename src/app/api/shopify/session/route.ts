/**
 * Shopify Session Creator
 * 
 * This endpoint creates a Supabase session server-side and sets cookies.
 * This bypasses the problematic hash token flow.
 * 
 * Flow:
 * 1. Verify the secure token
 * 2. Get the linked user
 * 3. Generate a session using admin API
 * 4. Set session cookies
 * 5. Redirect to dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyLinkToken } from '@/lib/shopify/tokens';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
  
  try {
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      console.error('Session: Missing token');
      return NextResponse.redirect(new URL('/en/login?error=missing_token', appUrl));
    }
    
    // Verify token
    let tokenData;
    try {
      tokenData = verifyLinkToken(token);
    } catch (error) {
      console.error('Session: Token verification failed:', error);
      return NextResponse.redirect(new URL('/en/login?error=session_expired', appUrl));
    }
    
    const { shop } = tokenData;
    console.log('Session: Processing for shop:', shop);
    
    // Get the linked user for this shop
    const { data: shopData, error: shopError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('linked_user_id')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();
    
    if (shopError || !shopData?.linked_user_id) {
      console.error('Session: Shop not found or not linked:', shopError);
      return NextResponse.redirect(new URL(`/en/shopify/onboarding?shop=${shop}`, appUrl));
    }
    
    // Get the user's email
    const { data: userData, error: userError } = await supabaseAdminClient.auth.admin.getUserById(
      shopData.linked_user_id
    );
    
    if (userError || !userData?.user?.email) {
      console.error('Session: User not found:', userError);
      return NextResponse.redirect(new URL('/en/login?error=user_not_found', appUrl));
    }
    
    const userEmail = userData.user.email;
    console.log('Session: Creating session for:', userEmail);
    
    // Generate a magic link - we'll extract the tokens from it
    const { data: linkData, error: linkError } = await supabaseAdminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });
    
    if (linkError || !linkData?.properties) {
      console.error('Session: Failed to generate link:', linkError);
      return NextResponse.redirect(new URL('/en/login?error=auth_failed', appUrl));
    }
    
    // Parse the action link to get the token
    const actionLink = new URL(linkData.properties.action_link);
    const emailToken = actionLink.searchParams.get('token');
    const tokenType = actionLink.searchParams.get('type');
    
    if (!emailToken) {
      console.error('Session: No token in action link');
      return NextResponse.redirect(new URL('/en/login?error=auth_failed', appUrl));
    }
    
    // Create a Supabase client with cookie handling
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    // Verify the OTP token to create a session
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });
    
    if (sessionError) {
      console.error('Session: OTP verification failed:', sessionError);
      return NextResponse.redirect(new URL('/en/login?error=session_failed', appUrl));
    }
    
    console.log('Session: Successfully created session, redirecting to dashboard');
    
    // Redirect to dashboard
    const response = NextResponse.redirect(new URL(`/en/dashboard?from=shopify&shop=${shop}`, appUrl));
    
    return response;
    
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.redirect(new URL('/en/login?error=session_failed', appUrl));
  }
}




