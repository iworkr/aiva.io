/**
 * Cancel Shopify Subscription API Route
 * Cancels the active Shopify app subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { cancelShopifySubscription, getCurrentSubscriptions } from '@/lib/shopify/billing';
import { updateEntitlementStatus, logBillingEvent } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

// CORS headers for Shopify embedded app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204,
    headers: corsHeaders 
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop } = body;

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing required field: shop' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[Shopify Billing Cancel] Request:', { shop });

    // Get shop data including access token
    const { data: shopData, error: shopError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('id, access_token, workspace_id')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();

    if (shopError || !shopData) {
      console.error('[Shopify Billing Cancel] Shop not found:', shopError);
      return NextResponse.json(
        { error: 'Shop not found or not authorized' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!shopData.access_token) {
      return NextResponse.json(
        { error: 'Shop access token not found' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get current subscription
    const { subscription } = await getCurrentSubscriptions(shop, shopData.access_token);

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('[Shopify Billing Cancel] Cancelling subscription:', subscription.id);

    // Cancel the subscription via Shopify GraphQL API
    await cancelShopifySubscription(shop, shopData.access_token, subscription.id);

    // Update entitlement status
    const { data: entitlement } = await supabaseAdminClient
      .from('entitlements')
      .select('id')
      .eq('shop_domain', shop)
      .single();

    if (entitlement) {
      await updateEntitlementStatus(entitlement.id, 'canceled');
    }

    // Log the cancellation
    await logBillingEvent(
      'subscription_cancelled',
      'shopify',
      {
        shop,
        subscriptionId: subscription.id,
        subscriptionName: subscription.name,
      },
      {
        shopDomain: shop,
        entitlementId: entitlement?.id,
      }
    );

    console.log('[Shopify Billing Cancel] Subscription cancelled successfully');

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[Shopify Billing Cancel] Error:', error);
    
    let errorMessage = 'Failed to cancel subscription';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
