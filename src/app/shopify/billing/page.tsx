/**
 * Shopify Embedded App - Billing Page
 * Shows plan options and allows merchants to subscribe via Shopify Billing
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { verifyShopAccess } from '@/lib/shopify/client';
import { getEntitlementByShopDomain, canSubscribeViaProvider } from '@/lib/entitlements';
import { getShopifyBillingPlans } from '@/lib/shopify/billing';
import ShopifyBillingClient from './ShopifyBillingClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ 
    shop?: string; 
    host?: string;
    success?: string;
    canceled?: string;
  }>;
}

export default async function ShopifyBillingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const shop = params.shop;
  const host = params.host || '';
  const success = params.success === 'true';
  const canceled = params.canceled === 'true';

  if (!shop) {
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
    
    redirect(`/shopify/billing?shop=${shopFromCookie}&host=${host}`);
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
    redirect(authUrl);
  }

  // Verify token is still valid
  const isTokenValid = await verifyShopAccess(shop, shopData.access_token);
  
  if (!isTokenValid) {
    const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';
    const authUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
    redirect(authUrl);
  }

  // Get entitlement status
  const entitlement = await getEntitlementByShopDomain(shop);
  
  // Check if user can subscribe via Shopify (double-billing prevention)
  const canSubscribe = await canSubscribeViaProvider(
    'shopify',
    shop,
    shopData.workspace_id || undefined
  );
  
  // Get billing plans
  const billingPlans = await getShopifyBillingPlans();

  return (
    <ShopifyBillingClient
      shop={shop}
      host={host}
      shopName={shopData.shop_name || shop.replace('.myshopify.com', '')}
      entitlement={entitlement ? {
        id: entitlement.id,
        plan: entitlement.plan,
        status: entitlement.status,
        provider: entitlement.provider,
        provider_subscription_id: entitlement.provider_subscription_id,
      } : null}
      billingPlans={billingPlans.map(plan => ({
        plan: plan.plan,
        name: plan.shopify_plan_name_monthly,
        monthlyPrice: plan.shopify_amount_monthly,
        annualPrice: plan.shopify_amount_annual,
        annualName: plan.shopify_plan_name_annual,
        trialDays: plan.trial_days,
      }))}
      canSubscribe={canSubscribe.allowed}
      existingProvider={canSubscribe.existingProvider}
      success={success}
      canceled={canceled}
    />
  );
}
