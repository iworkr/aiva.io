import { NextRequest, NextResponse } from 'next/server';
import { verifyLinkToken } from '@/lib/shopify/tokens';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';

/**
 * Auto-login endpoint for returning Shopify users
 * 
 * This endpoint verifies the shop is linked and then redirects
 * to the session endpoint which creates the actual Supabase session.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
  const token = request.nextUrl.searchParams.get('token');
  
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
  
  // Quick check that shop is linked
  const { data: shopData, error: shopError } = await supabaseAdminClient
    .from('shopify_stores')
    .select('linked_user_id')
    .eq('shop_domain', shop)
    .eq('is_active', true)
    .single();
  
  if (shopError || !shopData?.linked_user_id) {
    console.error('Auto-login: Shop not linked:', shopError);
    return NextResponse.redirect(new URL(`/en/shopify/onboarding?shop=${shop}`, appUrl));
  }
  
  console.log('Auto-login: Redirecting to session endpoint');
  
  // Redirect to session endpoint which handles server-side login
  const sessionUrl = new URL('/api/shopify/session', appUrl);
  sessionUrl.searchParams.set('token', token);
  
  return NextResponse.redirect(sessionUrl.toString());
}
