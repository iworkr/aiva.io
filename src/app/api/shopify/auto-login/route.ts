import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyLinkToken } from '@/lib/shopify/tokens';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

/**
 * Auto-login endpoint for returning Shopify users
 * 
 * Flow:
 * 1. Verify the link token
 * 2. Look up the linked user from the shopify_stores table
 * 3. Create a session for that user
 * 4. Redirect to dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const host = request.nextUrl.searchParams.get('host') || '';
    
    if (!token) {
      return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
    }
    
    // Verify token
    let tokenData;
    try {
      tokenData = verifyLinkToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      // Token expired or invalid - redirect to link page
      return NextResponse.redirect(new URL('/login?error=session_expired', request.url));
    }
    
    const { shop } = tokenData;
    
    // Get the linked user for this shop
    const { data: shopData, error: shopError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('linked_user_id')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();
    
    if (shopError || !shopData?.linked_user_id) {
      console.error('Shop not found or not linked:', shopError);
      return NextResponse.redirect(new URL(`/shopify/link?token=${token}`, request.url));
    }
    
    // Get the user's email
    const { data: userData, error: userError } = await supabaseAdminClient.auth.admin.getUserById(
      shopData.linked_user_id
    );
    
    if (userError || !userData?.user?.email) {
      console.error('User not found:', userError);
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url));
    }
    
    // Generate a magic link for instant login
    const { data: linkData, error: linkError } = await supabaseAdminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
      options: {
        redirectTo: `${process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io'}/dashboard?from=shopify`,
      },
    });
    
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Failed to generate magic link:', linkError);
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }
    
    // Extract the token from the magic link and redirect to verify endpoint
    const magicLinkUrl = new URL(linkData.properties.action_link);
    const verifyUrl = new URL('/auth/v1/verify', process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io');
    
    // Copy over all the params from the magic link
    magicLinkUrl.searchParams.forEach((value, key) => {
      verifyUrl.searchParams.set(key, value);
    });
    
    // Add our redirect
    verifyUrl.searchParams.set('redirect_to', '/dashboard?from=shopify');
    
    return NextResponse.redirect(verifyUrl.toString());
  } catch (error) {
    console.error('Auto-login error:', error);
    return NextResponse.redirect(new URL('/login?error=auto_login_failed', request.url));
  }
}

