import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const dynamic = 'force-dynamic';

/**
 * Unlink a Shopify store from the current user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId } = body;
    
    if (!storeId) {
      return NextResponse.json(
        { error: 'Missing store ID' },
        { status: 400 }
      );
    }
    
    const supabase = await createSupabaseUserRouteHandlerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify this store belongs to the user
    const { data: store, error: fetchError } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, linked_user_id')
      .eq('id', storeId)
      .single();
    
    if (fetchError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    if (store.linked_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to unlink this store' },
        { status: 403 }
      );
    }
    
    // Unlink the store (don't delete, just remove user association)
    // The store data remains for if they want to reconnect
    console.log('[Shopify Unlink] Attempting to unlink store:', {
      storeId,
      shopDomain: store.shop_domain,
      currentLinkedUserId: store.linked_user_id,
      requestingUserId: user.id,
    });

    const { error: updateError, data: updateData } = await supabaseAdminClient
      .from('shopify_stores')
      .update({
        linked_user_id: null,
        link_method: null,
        workspace_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId)
      .select('id, linked_user_id, workspace_id')
      .single();
    
    if (updateError) {
      console.error('[Shopify Unlink] Error unlinking store:', updateError);
      return NextResponse.json(
        { error: 'Failed to unlink store' },
        { status: 500 }
      );
    }

    console.log('[Shopify Unlink] Successfully unlinked store:', {
      storeId,
      shopDomain: store.shop_domain,
      newLinkedUserId: updateData?.linked_user_id,
      newWorkspaceId: updateData?.workspace_id,
    });
    
    return NextResponse.json({
      success: true,
      message: `Store ${store.shop_domain} unlinked successfully`,
    });
  } catch (error) {
    console.error('Unlink error:', error);
    return NextResponse.json(
      { error: 'Failed to unlink store' },
      { status: 500 }
    );
  }
}
