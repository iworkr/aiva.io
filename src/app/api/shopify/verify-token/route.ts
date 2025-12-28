import { NextRequest, NextResponse } from 'next/server';
import { verifyLinkToken } from '@/lib/shopify/tokens';
import { getShopOwnerEmail, getShopInfo } from '@/lib/shopify/client';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';

/**
 * Verify a Shopify link token and return shop information
 * Used by the link page to display shop details
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        { status: 400 }
      );
    }
    
    // Verify and decode the token
    let tokenData;
    try {
      tokenData = verifyLinkToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token. Please try again from Shopify.' },
        { status: 401 }
      );
    }
    
    const { shop, accessToken } = tokenData;
    
    // Fetch shop info from Shopify API
    let shopInfo;
    try {
      shopInfo = await getShopInfo(shop, accessToken);
    } catch (error) {
      console.error('Failed to fetch shop info:', error);
      // Fall back to database info
      const { data: dbShop } = await supabaseAdminClient
        .from('shopify_stores')
        .select('shop_name, shop_email, shop_owner')
        .eq('shop_domain', shop)
        .single();
      
      shopInfo = {
        name: dbShop?.shop_name || shop.replace('.myshopify.com', ''),
        email: dbShop?.shop_email || '',
        shop_owner: dbShop?.shop_owner || '',
      };
    }
    
    return NextResponse.json({
      shop,
      shopName: shopInfo.name,
      email: shopInfo.email,
      ownerName: shopInfo.shop_owner,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}





