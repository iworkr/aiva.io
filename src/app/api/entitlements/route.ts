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
      // First try to find entitlement by workspace_id
      const { data } = await supabaseAdminClient
        .from('entitlements')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();
      
      if (data) {
        entitlement = data;
      } else {
        // Try to find via linked Shopify store
        const { data: store } = await supabaseAdminClient
          .from('shopify_stores')
          .select('shop_domain')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .single();

        if (store?.shop_domain) {
          const { data: shopEntitlement } = await supabaseAdminClient
            .from('entitlements')
            .select('*')
            .eq('shop_domain', store.shop_domain)
            .single();
          
          if (shopEntitlement) {
            entitlement = shopEntitlement;
          }
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
