/**
 * Debug endpoint to check Shopify store link status
 * GET /api/debug/check-store-link?shop=store.myshopify.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');
  
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  // Query ALL records for this shop (not just active)
  const { data: allStores, error } = await supabaseAdminClient
    .from('shopify_stores')
    .select('id, shop_domain, shop_name, linked_user_id, workspace_id, is_active, updated_at')
    .eq('shop_domain', shop);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    shop,
    totalRecords: allStores?.length || 0,
    stores: allStores?.map(s => ({
      id: s.id,
      shop_domain: s.shop_domain,
      shop_name: s.shop_name,
      linked_user_id: s.linked_user_id,
      workspace_id: s.workspace_id,
      is_active: s.is_active,
      updated_at: s.updated_at,
      isLinked: !!s.linked_user_id,
    })),
  });
}
