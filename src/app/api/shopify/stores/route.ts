import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';

export const dynamic = 'force-dynamic';

/**
 * Get all Shopify stores linked to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Fetch stores linked to this user
    const { data: stores, error } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, shop_name, shop_email, link_method, is_active, created_at')
      .eq('linked_user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching Shopify stores:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stores' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ stores: stores || [] });
  } catch (error) {
    console.error('Shopify stores error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
