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
import { getSoloWorkspace } from '@/data/user/workspaces';

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

  // Get user's workspace
  let workspaceId: string | null = null;
  try {
    const soloWorkspace = await getSoloWorkspace();
    workspaceId = soloWorkspace.id;
    console.log(`[Shopify Link Complete] Found workspace ${workspaceId} for user ${user.id}`);
  } catch (error) {
    console.warn(`[Shopify Link Complete] Could not get workspace for user ${user.id}:`, error);
  }
  
  // Link the shop to the current user and workspace
  const { data: updatedShop, error: linkError } = await supabaseAdminClient
    .from('shopify_stores')
    .update({
      linked_user_id: user.id,
      workspace_id: workspaceId,
      link_method: 'existing_account',
      sync_enabled: true, // Enable sync by default
      updated_at: new Date().toISOString(),
    })
    .eq('id', shop.id)
    .select('id')
    .single();

  if (linkError || !updatedShop) {
    console.error('Failed to link shop:', linkError);
    redirect('/en/dashboard?error=link_failed');
  }
  
  // Ensure entitlements are linked to workspace (handles both existing and future entitlements)
  if (workspaceId) {
    try {
      const { ensureEntitlementsLinkedToWorkspace } = await import('@/lib/entitlements');
      await ensureEntitlementsLinkedToWorkspace(shopDomain, workspaceId);
    } catch (entitlementError) {
      console.warn('[Shopify Link Complete] Failed to ensure entitlement linking (non-blocking):', entitlementError);
      // Don't fail the link if entitlement linking fails
    }
  }
  
  // Trigger initial sync if workspace is set
  if (workspaceId) {
    try {
      console.log(`[Shopify Link Complete] Triggering initial sync for store ${updatedShop.id}`);
      const { syncAllShopifyData } = await import('@/lib/shopify/sync');
      // Run sync in background - don't wait for it
      syncAllShopifyData(updatedShop.id, workspaceId, {
        maxRecords: 250,
        fullSync: true,
      }).catch((syncError) => {
        console.error('[Shopify Link Complete] Initial sync error (non-blocking):', syncError);
      });
    } catch (syncError) {
      console.error('[Shopify Link Complete] Failed to trigger initial sync:', syncError);
    }
  }

  // Success - redirect to dashboard
  redirect(`/en/dashboard?from=shopify&shop=${shopDomain}&linked=true`);
}





