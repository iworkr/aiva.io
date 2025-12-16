/**
 * Shopify OAuth Callback Route
 * Handles OAuth response from Shopify after merchant authorization
 * 
 * Flow:
 * 1. Merchant authorizes app in Shopify
 * 2. Shopify redirects here with code and state
 * 3. We exchange code for access token
 * 4. Store shop connection in database
 * 5. Redirect merchant to Aiva dashboard (or embedded app)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ShopifyTokenResponse {
  access_token: string;
  scope: string;
}

interface ShopifyShopInfo {
  shop: {
    id: number;
    name: string;
    email: string;
    domain: string;
    myshopify_domain: string;
    plan_name: string;
    shop_owner: string;
    timezone: string;
    currency: string;
    country_code: string;
  };
}

// Verify HMAC signature from Shopify
function verifyHmac(query: URLSearchParams, secret: string): boolean {
  const hmac = query.get('hmac');
  if (!hmac) return false;

  // Create a copy of params without hmac
  const params = new URLSearchParams(query);
  params.delete('hmac');

  // Sort and stringify
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // Calculate HMAC
  const calculatedHmac = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(calculatedHmac)
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');

    console.log('🟢 Shopify callback received:', { shop, hasCode: !!code, hasState: !!state });

    // Validate required parameters
    if (!code || !shop || !state) {
      return NextResponse.redirect(
        new URL('/en/integrations?error=missing_parameters', request.url)
      );
    }

    // Get stored nonce from cookie
    const storedNonce = request.cookies.get('shopify_nonce')?.value;
    const storedShop = request.cookies.get('shopify_shop')?.value;

    // Validate state (CSRF protection)
    if (state !== storedNonce) {
      console.error('Shopify OAuth state mismatch:', { state, storedNonce });
      return NextResponse.redirect(
        new URL('/en/integrations?error=invalid_state', request.url)
      );
    }

    // Validate shop matches
    if (shop !== storedShop) {
      console.error('Shopify shop mismatch:', { shop, storedShop });
      return NextResponse.redirect(
        new URL('/en/integrations?error=shop_mismatch', request.url)
      );
    }

    // Get credentials
    const apiKey = process.env.SHOPIFY_API_KEY!;
    const apiSecret = process.env.SHOPIFY_API_SECRET!;

    // Verify HMAC if present (Shopify signs requests)
    if (hmac && apiSecret) {
      const isValid = verifyHmac(searchParams, apiSecret);
      if (!isValid) {
        console.error('Shopify HMAC verification failed');
        return NextResponse.redirect(
          new URL('/en/integrations?error=invalid_hmac', request.url)
        );
      }
    }

    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Shopify token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/en/integrations?error=token_exchange_failed', request.url)
      );
    }

    const tokens: ShopifyTokenResponse = await tokenResponse.json();
    console.log('🟢 Shopify tokens received:', { scopes: tokens.scope });

    // Get shop info
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': tokens.access_token,
      },
    });

    let shopInfo: ShopifyShopInfo | null = null;
    if (shopInfoResponse.ok) {
      shopInfo = await shopInfoResponse.json();
      console.log('🟢 Shopify shop info:', shopInfo?.shop?.name);
    }

    // Store connection in database
    const supabase = supabaseAdminClient;
    
    // Check if this shop already exists
    const { data: existingShop } = await supabase
      .from('shopify_stores')
      .select('id')
      .eq('shop_domain', shop)
      .single();

    const shopData = {
      shop_domain: shop,
      access_token: tokens.access_token,
      scopes: tokens.scope.split(','),
      shop_name: shopInfo?.shop?.name || shop,
      shop_email: shopInfo?.shop?.email,
      shop_owner: shopInfo?.shop?.shop_owner,
      shop_plan: shopInfo?.shop?.plan_name,
      currency: shopInfo?.shop?.currency,
      timezone: shopInfo?.shop?.timezone,
      country_code: shopInfo?.shop?.country_code,
      installed_at: new Date().toISOString(),
      is_active: true,
    };

    if (existingShop) {
      // Update existing shop
      const { error: updateError } = await supabase
        .from('shopify_stores')
        .update(shopData)
        .eq('id', existingShop.id);

      if (updateError) {
        console.error('Failed to update Shopify store:', updateError);
        throw updateError;
      }
      console.log('🟢 Updated existing Shopify store connection');
    } else {
      // Insert new shop
      const { error: insertError } = await supabase
        .from('shopify_stores')
        .insert(shopData);

      if (insertError) {
        console.error('Failed to store Shopify connection:', insertError);
        throw insertError;
      }
      console.log('🟢 Created new Shopify store connection');
    }

    // Clear cookies
    const response = NextResponse.redirect(
      new URL('/en/shopify/onboarding?success=installed', request.url)
    );
    response.cookies.delete('shopify_nonce');
    response.cookies.delete('shopify_shop');

    return response;
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/en/integrations?error=callback_failed', request.url)
    );
  }
}

