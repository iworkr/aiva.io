/**
 * Shopify Onboarding Page
 * 
 * Shown to merchants after they install the Aiva app from Shopify App Store.
 * Allows them to:
 * 1. Create a new Aiva account using their Shopify email (recommended)
 * 2. Link to an existing Aiva account
 */

import { Suspense } from 'react';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { OnboardingContent } from './OnboardingContent';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getShopInfo(shopDomain: string) {
  const { data: shop, error } = await supabaseAdminClient
    .from('shopify_stores')
    .select('shop_domain, shop_name, shop_email, shop_owner, linked_user_id, is_active')
    .eq('shop_domain', shopDomain)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching shop info:', error);
    return null;
  }

  return shop;
}

export default async function ShopifyOnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const shopDomain = typeof params.shop === 'string' ? params.shop : null;
  const success = params.success === 'installed';

  // If we have a shop domain, fetch the shop info
  let shopInfo = null;
  if (shopDomain) {
    shopInfo = await getShopInfo(shopDomain);
  }

  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent 
        shopDomain={shopDomain}
        shopName={shopInfo?.shop_name || shopDomain?.replace('.myshopify.com', '')}
        shopEmail={shopInfo?.shop_email}
        shopOwner={shopInfo?.shop_owner}
        isLinked={!!shopInfo?.linked_user_id}
        showSuccess={success}
      />
    </Suspense>
  );
}

function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
