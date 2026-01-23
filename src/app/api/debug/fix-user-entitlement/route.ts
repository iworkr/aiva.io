import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { ensureEntitlementsLinkedToWorkspace } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

/**
 * Fix user entitlement by linking it to workspace
 * Usage: POST /api/debug/fix-user-entitlement?email=apprevtest1@shopify.com
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Fix Entitlement] Fixing entitlement for: ${email}`);

    // 1. Find user by email from user_application_settings
    const { data: userSettings, error: settingsError } = await supabaseAdminClient
      .from('user_application_settings')
      .select('id')
      .eq('email_readonly', email)
      .single();

    if (settingsError || !userSettings) {
      // Try auth.users as fallback
      const { data: { users }, error: usersError } = await supabaseAdminClient.auth.admin.listUsers();
      const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return NextResponse.json({
          error: 'User not found',
          email,
        }, { status: 404 });
      }

      // Use user from auth
      const userId = user.id;
      return await fixEntitlementForUser(userId, email);
    }

    const userId = userSettings.id;
    return await fixEntitlementForUser(userId, email);

  } catch (error) {
    console.error('[Fix Entitlement] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fixEntitlementForUser(userId: string, email: string) {
  // 2. Get user's workspaces
  const { data: workspaceMembers, error: membersError } = await supabaseAdminClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_member_id', userId);

  if (membersError) {
    return NextResponse.json({
      error: 'Error fetching workspace members',
      details: membersError.message,
    }, { status: 500 });
  }

  const workspaceIds = workspaceMembers?.map(w => w.workspace_id) || [];
  
  if (workspaceIds.length === 0) {
    return NextResponse.json({
      error: 'No workspaces found for user',
      userId,
    }, { status: 404 });
  }

  const workspaceId = workspaceIds[0]; // Use first workspace

  // 3. Get Shopify stores linked to this user
  const { data: shops, error: shopsError } = await supabaseAdminClient
    .from('shopify_stores')
    .select('id, shop_domain, workspace_id')
    .eq('linked_user_id', userId);

  if (shopsError) {
    return NextResponse.json({
      error: 'Error fetching shops',
      details: shopsError.message,
    }, { status: 500 });
  }

  if (!shops || shops.length === 0) {
    return NextResponse.json({
      error: 'No Shopify stores found for user',
      userId,
    }, { status: 404 });
  }

  const shop = shops[0];
  const shopDomain = shop.shop_domain;

  // 4. Get entitlement by shop domain
  const { data: entitlement, error: entitlementError } = await supabaseAdminClient
    .from('entitlements')
    .select('*')
    .eq('shop_domain', shopDomain)
    .single();

  if (entitlementError || !entitlement) {
    return NextResponse.json({
      error: 'No entitlement found for shop domain',
      shopDomain,
      details: entitlementError?.message,
    }, { status: 404 });
  }

  // 5. Check if already linked
  if (entitlement.workspace_id === workspaceId) {
    return NextResponse.json({
      success: true,
      message: 'Entitlement is already linked to workspace',
      entitlement: {
        id: entitlement.id,
        plan: entitlement.plan,
        status: entitlement.status,
        workspace_id: entitlement.workspace_id,
      },
    });
  }

    // 6. Ensure entitlement is linked to workspace (this handles both existing and future entitlements)
    try {
      // First ensure shop is linked to workspace
      if (shop.workspace_id !== workspaceId) {
        await supabaseAdminClient
          .from('shopify_stores')
          .update({ workspace_id: workspaceId })
          .eq('id', shop.id);
      }

      // Then ensure entitlement is linked
      await ensureEntitlementsLinkedToWorkspace(shopDomain, workspaceId);

      // Re-fetch to get updated entitlement
      const { data: updatedEntitlement, error: fetchError } = await supabaseAdminClient
        .from('entitlements')
        .select('*')
        .eq('shop_domain', shopDomain)
        .single();

      if (fetchError || !updatedEntitlement) {
        return NextResponse.json({
          error: 'Failed to fetch updated entitlement',
          details: fetchError?.message,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Entitlement successfully linked to workspace',
        before: {
          entitlement_id: entitlement.id,
          plan: entitlement.plan,
          status: entitlement.status,
          workspace_id: entitlement.workspace_id,
        },
        after: {
          entitlement_id: updatedEntitlement.id,
          plan: updatedEntitlement.plan,
          status: updatedEntitlement.status,
          workspace_id: updatedEntitlement.workspace_id,
        },
        shop: {
          shop_domain: shopDomain,
          workspace_id: workspaceId,
        },
      });
    } catch (linkError) {
      return NextResponse.json({
        error: 'Failed to link entitlement',
        details: linkError instanceof Error ? linkError.message : 'Unknown error',
      }, { status: 500 });
    }
}
