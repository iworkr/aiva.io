/**
 * Shopify Link Complete Page
 * 
 * This page is shown after a user logs in with an existing account
 * to link their Shopify store. It handles:
 * 1. Verifying the user is logged in
 * 2. Linking the Shopify store to their account
 * 3. Redirecting to the dashboard
 */

import { redirect } from 'next/navigation';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ShopifyLinkCompletePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const shopDomain = typeof params.shop === 'string' ? params.shop : null;

  if (!shopDomain) {
    redirect('/en/dashboard?error=missing_shop');
  }

  // Get current user
  const supabase = await createSupabaseUserServerComponentClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    // Not logged in - redirect to login
    redirect(`/en/login?from=shopify&shop=${shopDomain}&next=/en/shopify/link-complete?shop=${shopDomain}`);
  }

  // Check if shop exists
  const { data: shop, error: shopError } = await supabaseAdminClient
    .from('shopify_stores')
    .select('id, linked_user_id')
    .eq('shop_domain', shopDomain)
    .eq('is_active', true)
    .single();

  if (shopError || !shop) {
    redirect('/en/dashboard?error=shop_not_found');
  }

  // Link the shop to the current user
  const { error: linkError } = await supabaseAdminClient
    .from('shopify_stores')
    .update({
      linked_user_id: user.id,
      link_method: 'existing_account',
      updated_at: new Date().toISOString(),
    })
    .eq('id', shop.id);

  if (linkError) {
    console.error('Failed to link shop:', linkError);
    redirect('/en/dashboard?error=link_failed');
  }

  // Success - redirect to dashboard
  redirect(`/en/dashboard?from=shopify&shop=${shopDomain}&linked=true`);
}



