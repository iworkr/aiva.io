/**
 * Debug endpoint to check Shopify context generation
 * Shows what stores are found and why context might be missing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }
    
    const debug: any = {
      userId: user.id,
      workspaceId,
      timestamp: new Date().toISOString(),
    };

    // Check stores by workspace_id
    const { data: workspaceStores, error: workspaceError } = await supabase
      .from('shopify_stores')
      .select('id, shop_name, shop_domain, currency, is_active, workspace_id, linked_user_id, created_at')
      .eq('workspace_id', workspaceId);

    debug.workspaceStores = {
      count: workspaceStores?.length || 0,
      stores: workspaceStores || [],
      error: workspaceError?.message,
    };

    // Check stores by linked_user_id
    const { data: userStores, error: userError } = await supabase
      .from('shopify_stores')
      .select('id, shop_name, shop_domain, currency, is_active, workspace_id, linked_user_id, created_at')
      .eq('linked_user_id', user.id);

    debug.userStores = {
      count: userStores?.length || 0,
      stores: userStores || [],
      error: userError?.message,
    };

    // Check if any store has data synced
    if (workspaceStores && workspaceStores.length > 0) {
      const storeId = workspaceStores[0].id;
      
      const { count: ordersCount } = await supabase
        .from('shopify_orders')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      
      const { count: customersCount } = await supabase
        .from('shopify_customers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      
      const { count: productsCount } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      debug.syncedData = {
        orders: ordersCount || 0,
        customers: customersCount || 0,
        products: productsCount || 0,
      };
    }

    return NextResponse.json(debug, { status: 200 });
  } catch (error) {
    console.error('[Debug Shopify Context] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

