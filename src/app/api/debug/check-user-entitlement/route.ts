import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';

/**
 * Debug route to check user entitlement status
 * Usage: /api/debug/check-user-entitlement?email=apprevtest1@shopify.com
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Debug] Checking entitlement for: ${email}`);

    // 1. Find user by email
    const { data: { users }, error: usersError } = await supabaseAdminClient.auth.admin.listUsers();
    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        email,
      });
    }

    console.log(`[Debug] Found user: ${user.id}`);

    // 2. Get user's workspaces
    const { data: workspaceMembers, error: membersError } = await supabaseAdminClient
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('workspace_member_id', user.id);

    const workspaceIds = workspaceMembers?.map(w => w.workspace_id) || [];

    // 3. Get Shopify stores linked to this user
    const { data: shops, error: shopsError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('id, shop_domain, shop_name, workspace_id, linked_user_id, is_active')
      .eq('linked_user_id', user.id);

    const shopDomains = shops?.map(s => s.shop_domain) || [];

    // 4. Get entitlements by workspace
    const entitlementsByWorkspace: any[] = [];
    if (workspaceIds.length > 0) {
      const { data: workspaceEntitlements, error: workspaceEntitlementsError } = await supabaseAdminClient
        .from('entitlements')
        .select('*')
        .in('workspace_id', workspaceIds);

      if (!workspaceEntitlementsError && workspaceEntitlements) {
        entitlementsByWorkspace.push(...workspaceEntitlements);
      }
    }

    // 5. Get entitlements by shop domain
    const entitlementsByShop: any[] = [];
    if (shopDomains.length > 0) {
      const { data: shopEntitlements, error: shopEntitlementsError } = await supabaseAdminClient
        .from('entitlements')
        .select('*')
        .in('shop_domain', shopDomains);

      if (!shopEntitlementsError && shopEntitlements) {
        entitlementsByShop.push(...shopEntitlements);
      }
    }

    // 6. Get all workspaces details
    const workspaces: any[] = [];
    if (workspaceIds.length > 0) {
      const { data: workspaceData, error: workspaceError } = await supabaseAdminClient
        .from('workspaces')
        .select('id, name, created_at')
        .in('id', workspaceIds);

      if (!workspaceError && workspaceData) {
        workspaces.push(...workspaceData);
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      workspaces: workspaces.map(w => ({
        ...w,
        member_role: workspaceMembers?.find(m => m.workspace_id === w.id)?.role,
      })),
      shopify_stores: shops || [],
      entitlements: {
        by_workspace: entitlementsByWorkspace,
        by_shop_domain: entitlementsByShop,
        all: [...entitlementsByWorkspace, ...entitlementsByShop],
      },
      analysis: {
        has_workspace: workspaceIds.length > 0,
        has_shop: shopDomains.length > 0,
        has_entitlement: entitlementsByWorkspace.length > 0 || entitlementsByShop.length > 0,
        entitlement_linked_to_workspace: entitlementsByWorkspace.length > 0,
        entitlement_linked_to_shop_only: entitlementsByShop.length > 0 && entitlementsByWorkspace.length === 0,
        active_entitlements: [...entitlementsByWorkspace, ...entitlementsByShop].filter(
          e => e.status === 'active' || e.status === 'trialing'
        ),
      },
    });
  } catch (error) {
    console.error('[Debug] Error checking user entitlement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
