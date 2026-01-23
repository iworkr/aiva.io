/**
 * Entitlements API Route
 * Fetches entitlement data for a workspace or shop
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const shopDomain = request.nextUrl.searchParams.get('shopDomain');

    if (!workspaceId && !shopDomain) {
      return NextResponse.json(
        { error: 'Missing workspaceId or shopDomain parameter' },
        { status: 400 }
      );
    }

    // Verify user is authenticated and has access to this workspace
    const supabase = await createSupabaseUserServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // If workspaceId provided, verify membership
    if (workspaceId) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_member_id')
        .eq('workspace_id', workspaceId)
        .eq('workspace_member_id', user.id)
        .single();

      if (!member) {
        return NextResponse.json(
          { error: 'Not a member of this workspace' },
          { status: 403 }
        );
      }
    }

    // Fetch entitlement
    let entitlement = null;

    if (workspaceId) {
      console.log(`[Entitlements API] Fetching entitlement for workspace: ${workspaceId}`);
      
      // First try to find entitlement by workspace_id
      const { data: workspaceEntitlement, error: workspaceError } = await supabaseAdminClient
        .from('entitlements')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      
      if (workspaceEntitlement) {
        console.log(`[Entitlements API] Found entitlement by workspace_id: ${workspaceEntitlement.id}, plan: ${workspaceEntitlement.plan}`);
        entitlement = workspaceEntitlement;
      } else {
        console.log(`[Entitlements API] No entitlement found by workspace_id, checking shop...`);
        
        // Try to find via linked Shopify store
        const { data: store, error: storeError } = await supabaseAdminClient
          .from('shopify_stores')
          .select('shop_domain')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .maybeSingle();

        if (storeError) {
          console.error(`[Entitlements API] Error fetching store:`, storeError);
        }

        if (store?.shop_domain) {
          console.log(`[Entitlements API] Found shop: ${store.shop_domain}, checking entitlement...`);
          
          const { data: shopEntitlement, error: shopEntitlementError } = await supabaseAdminClient
            .from('entitlements')
            .select('*')
            .eq('shop_domain', store.shop_domain)
            .maybeSingle();
          
          if (shopEntitlementError) {
            console.error(`[Entitlements API] Error fetching shop entitlement:`, shopEntitlementError);
          }
          
          if (shopEntitlement) {
            console.log(`[Entitlements API] Found entitlement by shop_domain: ${shopEntitlement.id}, plan: ${shopEntitlement.plan}, workspace_id: ${shopEntitlement.workspace_id || 'NULL'}`);
            
            // Auto-fix: If entitlement exists but isn't linked to workspace, link it now
            if (!shopEntitlement.workspace_id) {
              console.log(`[Entitlements API] Entitlement not linked to workspace, auto-linking...`);
              try {
                const { ensureEntitlementsLinkedToWorkspace } = await import('@/lib/entitlements');
                await ensureEntitlementsLinkedToWorkspace(store.shop_domain, workspaceId);
                console.log(`[Entitlements API] Auto-link completed, re-fetching...`);
                
                // Re-fetch by workspace_id to get the properly linked entitlement
                const { data: updatedEntitlement, error: updateError } = await supabaseAdminClient
                  .from('entitlements')
                  .select('*')
                  .eq('workspace_id', workspaceId)
                  .maybeSingle();
                
                if (updateError) {
                  console.error(`[Entitlements API] Error re-fetching after link:`, updateError);
                }
                
                if (updatedEntitlement) {
                  entitlement = updatedEntitlement;
                  console.log(`[Entitlements API] ✅ Auto-linked entitlement to workspace ${workspaceId} for shop ${store.shop_domain}, plan: ${updatedEntitlement.plan}`);
                } else {
                  // Fallback: fetch by shop_domain if workspace_id query fails
                  console.log(`[Entitlements API] Re-fetch by workspace_id failed, using fallback...`);
                  const { data: fallbackEntitlement } = await supabaseAdminClient
                    .from('entitlements')
                    .select('*')
                    .eq('shop_domain', store.shop_domain)
                    .maybeSingle();
                  entitlement = fallbackEntitlement || shopEntitlement;
                  console.log(`[Entitlements API] Using fallback entitlement, plan: ${entitlement?.plan}`);
                }
              } catch (linkError) {
                console.error('[Entitlements API] ❌ Failed to auto-link entitlement:', linkError);
                entitlement = shopEntitlement;
              }
            } else {
              console.log(`[Entitlements API] Entitlement already linked to workspace`);
              entitlement = shopEntitlement;
            }
          } else {
            console.log(`[Entitlements API] No entitlement found for shop_domain: ${store.shop_domain}`);
          }
        } else {
          console.log(`[Entitlements API] No shop found for workspace: ${workspaceId}`);
        }
      }
    } else if (shopDomain) {
      const { data } = await supabaseAdminClient
        .from('entitlements')
        .select('*')
        .eq('shop_domain', shopDomain)
        .single();
      
      entitlement = data;
    }

    if (!entitlement) {
      return NextResponse.json(
        { entitlement: null, plan: 'free' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      entitlement,
      plan: entitlement.plan,
      status: entitlement.status,
      provider: entitlement.provider,
    });

  } catch (error) {
    console.error('[Entitlements API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
