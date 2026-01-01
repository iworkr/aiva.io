/**
 * Shopify Embedded App - Dashboard Page
 * Main landing page for the Shopify embedded app
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { verifyShopAccess } from '@/lib/shopify/client';
import { generateLinkToken } from '@/lib/shopify/tokens';
import { getEntitlementByShopDomain } from '@/lib/entitlements';
import ShopifyDashboardClient from './ShopifyDashboardClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ shop?: string; host?: string }>;
}

export default async function ShopifyDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const shop = params.shop;
  const host = params.host || '';

  if (!shop) {
    // Try to get from cookie
    const cookieStore = await cookies();
    const shopFromCookie = cookieStore.get('shopify_shop')?.value;
    
    if (!shopFromCookie) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h1>Missing Shop Parameter</h1>
          <p>Please access this app through your Shopify admin.</p>
        </div>
      );
    }
    
    redirect(`/shopify?shop=${shopFromCookie}&host=${host}`);
  }

  // Fetch shop data
  const { data: shopData, error } = await supabaseAdminClient
    .from('shopify_stores')
    .select('id, linked_user_id, access_token, shop_name, workspace_id')
    .eq('shop_domain', shop)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching shop data:', error);
  }

  // Check if shop needs OAuth
  if (!shopData?.access_token) {
    const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';
    const authUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
    
    return (
      <ShopifyDashboardClient
        shop={shop}
        host={host}
        needsAuth={true}
        authUrl={authUrl}
      />
    );
  }

  // Verify token is still valid
  const isTokenValid = await verifyShopAccess(shop, shopData.access_token);
  
  if (!isTokenValid) {
    const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';
    const authUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
    
    return (
      <ShopifyDashboardClient
        shop={shop}
        host={host}
        needsAuth={true}
        authUrl={authUrl}
      />
    );
  }

  // Get entitlement status
  const entitlement = await getEntitlementByShopDomain(shop);
  
  // Check if entitlement is active
  const isEntitlementActive = entitlement && 
    (entitlement.status === 'active' || entitlement.status === 'trialing' ||
     // For canceled subscriptions, check if still within the paid period
     (entitlement.status === 'canceled' && entitlement.current_period_end && 
      new Date(entitlement.current_period_end) > new Date()));
  
  // If no active entitlement, redirect to billing page
  if (!isEntitlementActive) {
    const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';
    const billingUrl = `${appUrl}/shopify/billing?shop=${shop}&host=${host}`;
    redirect(billingUrl);
  }
  
  // Generate token for auto-login if linked
  let autoLoginUrl: string | undefined;
  if (shopData.linked_user_id) {
    const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';
    const token = generateLinkToken(shop, shopData.access_token);
    const url = new URL('/api/shopify/auto-login', appUrl);
    url.searchParams.set('token', token);
    url.searchParams.set('host', host);
    autoLoginUrl = url.toString();
  }

  // Generate link URL if not linked
  let linkUrl: string | undefined;
  if (!shopData.linked_user_id) {
    const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';
    const token = generateLinkToken(shop, shopData.access_token);
    const url = new URL('/en/shopify/link', appUrl);
    url.searchParams.set('token', token);
    url.searchParams.set('host', host);
    linkUrl = url.toString();
  }

  return (
    <ShopifyDashboardClient
      shop={shop}
      host={host}
      shopName={shopData.shop_name || shop.replace('.myshopify.com', '')}
      isLinked={!!shopData.linked_user_id}
      autoLoginUrl={autoLoginUrl}
      linkUrl={linkUrl}
      entitlement={entitlement ? {
        plan: entitlement.plan,
        status: entitlement.status,
        provider: entitlement.provider,
      } : null}
    />
  );
}
