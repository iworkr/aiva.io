import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';

/**
 * Delete a user by email address and all related records
 * This is for admin use only - deletes everything to allow fresh subscription
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log(`[Delete User] Starting deletion for: ${email}`);

    // 1. Find user ID by email
    const { data: userSettings, error: settingsError } = await supabaseAdminClient
      .from('user_application_settings')
      .select('id')
      .eq('email_readonly', email)
      .single();

    if (settingsError || !userSettings) {
      // Also try to find in auth.users directly
      const { data: { users }, error: listError } = await supabaseAdminClient.auth.admin.listUsers();
      const user = users?.find(u => u.email === email);
      
      if (!user) {
        return NextResponse.json(
          { error: `User with email ${email} not found` },
          { status: 404 }
        );
      }

      // Delete user (this will cascade delete related records)
      const { error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error('[Delete User] Error deleting user:', deleteError);
        return NextResponse.json(
          { error: `Failed to delete user: ${deleteError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `User ${email} deleted successfully`,
        userId: user.id,
      });
    }

    const userId = userSettings.id;
    console.log(`[Delete User] Found user ID: ${userId}`);

    // 2. Get all workspaces for this user
    const { data: workspaceMembers, error: membersError } = await supabaseAdminClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_member_id', userId);

    if (membersError) {
      console.error('[Delete User] Error fetching workspaces:', membersError);
    }

    const workspaceIds = workspaceMembers?.map(w => w.workspace_id) || [];
    console.log(`[Delete User] Found ${workspaceIds.length} workspaces`);

    // 3. Delete entitlements linked to these workspaces
    if (workspaceIds.length > 0) {
      const { error: entitlementsError } = await supabaseAdminClient
        .from('entitlements')
        .delete()
        .in('workspace_id', workspaceIds);

      if (entitlementsError) {
        console.warn('[Delete User] Error deleting entitlements:', entitlementsError);
      } else {
        console.log(`[Delete User] Deleted entitlements for ${workspaceIds.length} workspaces`);
      }
    }

    // 4. Get Shopify stores linked to this user
    const { data: shops, error: shopsError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('shop_domain, id')
      .eq('linked_user_id', userId);

    if (shopsError) {
      console.warn('[Delete User] Error fetching shops:', shopsError);
    }

    const shopDomains = shops?.map(s => s.shop_domain) || [];
    console.log(`[Delete User] Found ${shopDomains.length} Shopify stores`);

    // 5. Delete entitlements linked to these shop domains
    if (shopDomains.length > 0) {
      const { error: shopEntitlementsError } = await supabaseAdminClient
        .from('entitlements')
        .delete()
        .in('shop_domain', shopDomains);

      if (shopEntitlementsError) {
        console.warn('[Delete User] Error deleting shop entitlements:', shopEntitlementsError);
      } else {
        console.log(`[Delete User] Deleted entitlements for ${shopDomains.length} shops`);
      }
    }

    // 6. Delete the user (this will cascade delete related records via foreign keys)
    const { error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[Delete User] Error deleting user:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete user: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`[Delete User] Successfully deleted user ${email}`);

    return NextResponse.json({
      success: true,
      message: `User ${email} and all related records deleted successfully`,
      userId,
      deletedWorkspaces: workspaceIds.length,
      deletedShops: shopDomains.length,
      deletedEntitlements: workspaceIds.length + shopDomains.length,
    });
  } catch (error) {
    console.error('[Delete User] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
