import { NextRequest, NextResponse } from 'next/server';
import { verifyLinkToken } from '@/lib/shopify/tokens';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';

/**
 * Auto-login endpoint for returning Shopify users
 * 
 * Flow:
 * 1. Verify the link token (contains shop domain)
 * 2. Look up the linked user from the shopify_stores table
 * 3. Generate a magic link for instant login
 * 4. Redirect directly to the magic link URL (which logs them in)
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
  
  try {
    const token = request.nextUrl.searchParams.get('token');
    const host = request.nextUrl.searchParams.get('host') || '';
    
    if (!token) {
      console.error('Auto-login: Missing token');
      return NextResponse.redirect(new URL('/en/login?error=missing_token', appUrl));
    }
    
    // Verify token
    let tokenData;
    try {
      tokenData = verifyLinkToken(token);
    } catch (error) {
      console.error('Auto-login: Token verification failed:', error);
      return NextResponse.redirect(new URL('/en/login?error=session_expired', appUrl));
    }
    
    const { shop } = tokenData;
    console.log('Auto-login: Processing for shop:', shop);
    
    // Get the linked user for this shop
    const { data: shopData, error: shopError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('linked_user_id, shop_email')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();
    
    if (shopError || !shopData?.linked_user_id) {
      console.error('Auto-login: Shop not found or not linked:', shopError);
      return NextResponse.redirect(new URL(`/en/shopify/onboarding?shop=${shop}`, appUrl));
    }
    
    // Get the user's email
    const { data: userData, error: userError } = await supabaseAdminClient.auth.admin.getUserById(
      shopData.linked_user_id
    );
    
    if (userError || !userData?.user?.email) {
      console.error('Auto-login: User not found:', userError);
      return NextResponse.redirect(new URL('/en/login?error=user_not_found', appUrl));
    }
    
    const userEmail = userData.user.email;
    console.log('Auto-login: Generating magic link for:', userEmail);
    
    // Generate a magic link for instant login
    const dashboardUrl = `${appUrl}/en/dashboard?from=shopify&shop=${shop}`;
    
    const { data: linkData, error: linkError } = await supabaseAdminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: dashboardUrl,
      },
    });
    
    if (linkError || !linkData?.properties?.action_link) {
      console.error('Auto-login: Failed to generate magic link:', linkError);
      // Fallback: redirect to login with email prefilled
      return NextResponse.redirect(new URL(`/en/login?email=${encodeURIComponent(userEmail)}&from=shopify`, appUrl));
    }
    
    console.log('Auto-login: Redirecting to magic link for instant login');
    
    // Redirect directly to the magic link - this logs them in!
    return NextResponse.redirect(linkData.properties.action_link);
    
  } catch (error) {
    console.error('Auto-login error:', error);
    return NextResponse.redirect(new URL('/en/login?error=auto_login_failed', appUrl));
  }
}
