import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check entitlement state for a user
 * Usage: /api/debug/check-entitlement-state?email=apprevtest1@shopify.com
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

    console.log(`[Debug] Checking entitlement state for: ${email}`);

    // 1. Find user by email
    const { data: userSettings, error: settingsError } = await supabaseAdminClient
      .from('user_application_settings')
      .select('id')
      .eq('email_readonly', email)
      .single();

    let userId: string | null = null;
    
    if (settingsError || !userSettings) {
      // Try auth.users as fallback
      const { data: { users }, error: usersError } = await supabaseAdminClient.auth.admin.listUsers();
      const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (user) {
        userId = user.id;
      }
    } else {
      userId = userSettings.id;
    }

    if (!userId) {
      return NextResponse.json({
        error: 'User not found',
        email,
      }, { status: 404 });
    }

    console.log(`[Debug] Found user ID: ${userId}`);

    // 2. Get user's workspaces
    const { data: workspaceMembers, error: membersError } = await supabaseAdminClient
      .from('workspace_members')
      .select('workspace_id, workspace_member_role')
      .eq('workspace_member_id', userId);

    const workspaceIds = workspaceMembers?.map(w => w.workspace_id) || [];
    const primaryWorkspaceId = workspaceIds[0] || null;

    console.log(`[Debug] Found ${workspaceIds.length} workspaces, primary: ${primaryWorkspaceId}`);

    // 3. Get Shopify stores linked to this user
    const { data: shops, error: shopsError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('id, shop_domain, shop_name, workspace_id, linked_user_id, is_active')
      .eq('linked_user_id', userId);

    const shopDomains = shops?.map(s => s.shop_domain) || [];

    console.log(`[Debug] Found ${shops?.length || 0} shops`);

    // 4. Check entitlements by workspace_id
    let entitlementByWorkspace = null;
    if (primaryWorkspaceId) {
      const { data, error } = await supabaseAdminClient
        .from('entitlements')
        .select('*')
        .eq('workspace_id', primaryWorkspaceId)
        .single();
      
      if (!error && data) {
        entitlementByWorkspace = data;
      }
    }

    // 5. Check entitlements by shop_domain
    const entitlementsByShop: any[] = [];
    if (shopDomains.length > 0) {
      const { data, error } = await supabaseAdminClient
        .from('entitlements')
        .select('*')
        .in('shop_domain', shopDomains);

      if (!error && data) {
        entitlementsByShop.push(...data);
      }
    }

    // 6. Try to simulate what the /api/entitlements endpoint does
    let apiEndpointResult = null;
    if (primaryWorkspaceId) {
      // Simulate the exact logic from /api/entitlements
      const { data: store } = await supabaseAdminClient
        .from('shopify_stores')
        .select('shop_domain')
        .eq('workspace_id', primaryWorkspaceId)
        .eq('is_active', true)
        .single();

      if (store?.shop_domain) {
        const { data: shopEntitlement } = await supabaseAdminClient
          .from('entitlements')
          .select('*')
          .eq('shop_domain', store.shop_domain)
          .single();

        if (shopEntitlement) {
          apiEndpointResult = {
            found: true,
            entitlement: shopEntitlement,
            isLinkedToWorkspace: shopEntitlement.workspace_id === primaryWorkspaceId,
            needsAutoFix: !shopEntitlement.workspace_id,
          };
        } else {
          apiEndpointResult = {
            found: false,
            reason: 'No entitlement found for shop_domain',
            shop_domain: store.shop_domain,
          };
        }
      } else {
        apiEndpointResult = {
          found: false,
          reason: 'No shop found for workspace',
          workspace_id: primaryWorkspaceId,
        };
      }
    }

    return NextResponse.json({
      user: {
        id: userId,
        email,
      },
      workspaces: {
        count: workspaceIds.length,
        ids: workspaceIds,
        primary: primaryWorkspaceId,
      },
      shops: shops || [],
      entitlements: {
        by_workspace: entitlementByWorkspace,
        by_shop_domain: entitlementsByShop,
      },
      api_endpoint_simulation: apiEndpointResult,
      diagnosis: {
        has_workspace: workspaceIds.length > 0,
        has_shop: shopDomains.length > 0,
        has_entitlement_by_workspace: !!entitlementByWorkspace,
        has_entitlement_by_shop: entitlementsByShop.length > 0,
        entitlement_needs_linking: apiEndpointResult?.needsAutoFix || false,
        would_show_free: !entitlementByWorkspace && (!apiEndpointResult?.found || !apiEndpointResult?.isLinkedToWorkspace),
      },
    });
  } catch (error) {
    console.error('[Debug] Error checking entitlement state:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
