/**
 * Debug endpoint to check Shopify token status
 * GET /api/debug/check-shopify-token?storeId=xxx
 */

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { NextRequest, NextResponse } from 'next/server';
import { verifyShopAccess, getShopInfo } from '@/lib/shopify/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userSupabase = await createSupabaseUserRouteHandlerClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Missing storeId parameter' }, { status: 400 });
    }

    // Get store with token
    const { data: store, error: storeError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('id, shop_domain, access_token, workspace_id, linked_user_id, is_active, updated_at, installed_at')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ 
        error: 'Store not found',
        details: storeError?.message 
      }, { status: 404 });
    }

    // Check if user has access
    if (store.linked_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Analyze token
    const tokenInfo = {
      exists: !!store.access_token,
      length: store.access_token?.length || 0,
      preview: store.access_token ? `${store.access_token.substring(0, 20)}...` : 'MISSING',
      startsWithShpat: store.access_token?.startsWith('shpat_') || false,
      fullToken: store.access_token, // Include full token for debugging
    };

    // Try to verify token
    let verificationResult: any = {
      attempted: false,
      valid: false,
      error: null,
    };

    if (store.access_token) {
      try {
        verificationResult.attempted = true;
        const isValid = await verifyShopAccess(store.shop_domain, store.access_token);
        verificationResult.valid = isValid;
        
        if (isValid) {
          // Try to get shop info to confirm
          const shopInfo = await getShopInfo(store.shop_domain, store.access_token);
          verificationResult.shopInfo = {
            name: shopInfo.name,
            email: shopInfo.email,
            domain: shopInfo.domain,
          };
        }
      } catch (error) {
        verificationResult.valid = false;
        verificationResult.error = error instanceof Error ? error.message : String(error);
      }
    }

    return NextResponse.json({
      store: {
        id: store.id,
        shop_domain: store.shop_domain,
        workspace_id: store.workspace_id,
        linked_user_id: store.linked_user_id,
        is_active: store.is_active,
        updated_at: store.updated_at,
        installed_at: store.installed_at,
      },
      token: tokenInfo,
      verification: verificationResult,
      recommendations: !store.access_token
        ? ['Token is missing. Re-install the Shopify app.']
        : !tokenInfo.startsWithShpat
        ? ['Token does not start with "shpat_". This is unusual - check if token format is correct.']
        : tokenInfo.length < 40
        ? ['Token is too short. Shopify tokens are typically 40+ characters. Token may be truncated.']
        : !verificationResult.valid
        ? [
            'Token verification failed. Possible causes:',
            '1. Token was revoked in Shopify',
            '2. App was uninstalled',
            '3. Token is corrupted or truncated',
            '4. Check OAuth callback logs to see what token Shopify returned',
          ]
        : ['Token is valid and working!'],
    });
  } catch (error) {
    console.error('Check Shopify token error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

