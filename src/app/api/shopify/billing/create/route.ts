/**
 * Create Shopify Subscription API Route
 * Initiates a Shopify app subscription and returns the confirmation URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { 
  createShopifySubscription, 
  getSubscriptionReturnUrl,
  ShopifyPlanType 
} from '@/lib/shopify/billing';
import { 
  canSubscribeViaProvider, 
  logBillingEvent 
} from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, plan, interval = 'monthly' } = body;

    // Validate required fields
    if (!shop || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields: shop and plan' },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans: ShopifyPlanType[] = ['basic', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate interval
    if (interval !== 'monthly' && interval !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid interval. Must be "monthly" or "annual"' },
        { status: 400 }
      );
    }

    console.log('[Shopify Billing Create] Request:', { shop, plan, interval });

    // Get shop data including access token
    const { data: shopData, error: shopError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('id, access_token, workspace_id')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();

    if (shopError || !shopData) {
      console.error('[Shopify Billing Create] Shop not found:', shopError);
      return NextResponse.json(
        { error: 'Shop not found or not authorized' },
        { status: 404 }
      );
    }

    if (!shopData.access_token) {
      return NextResponse.json(
        { error: 'Shop access token not found. Please reinstall the app.' },
        { status: 401 }
      );
    }

    // Check if they can subscribe via Shopify (prevent double billing)
    const canSubscribe = await canSubscribeViaProvider(
      'shopify',
      shop,
      shopData.workspace_id || undefined
    );

    if (!canSubscribe.allowed) {
      console.log('[Shopify Billing Create] Cannot subscribe:', canSubscribe.reason);
      return NextResponse.json(
        { 
          error: canSubscribe.reason || 'Cannot subscribe via Shopify',
          existingProvider: canSubscribe.existingProvider,
        },
        { status: 409 }
      );
    }

    // Determine if we're in test mode
    const isTestMode = process.env.NODE_ENV === 'development' || 
      process.env.SHOPIFY_TEST_MODE === 'true';

    // Get the return URL (where Shopify redirects after approval)
    const host = request.headers.get('x-shopify-host') || '';
    const returnUrl = getSubscriptionReturnUrl(shop, host);

    console.log('[Shopify Billing Create] Creating subscription:', {
      shop,
      plan,
      interval,
      returnUrl,
      isTestMode,
    });

    // Create the subscription via Shopify GraphQL API
    const result = await createShopifySubscription(
      shop,
      shopData.access_token,
      plan as ShopifyPlanType,
      interval,
      returnUrl,
      isTestMode
    );

    // Log the billing event
    await logBillingEvent(
      'subscription_initiated',
      'shopify',
      {
        shop,
        plan,
        interval,
        subscriptionId: result.subscriptionId,
        isTestMode,
      },
      {
        shopDomain: shop,
        idempotencyKey: `create-${shop}-${result.subscriptionId}`,
      }
    );

    console.log('[Shopify Billing Create] Subscription created:', {
      subscriptionId: result.subscriptionId,
      confirmationUrl: result.confirmationUrl,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: result.subscriptionId,
      confirmationUrl: result.confirmationUrl,
    });

  } catch (error) {
    console.error('[Shopify Billing Create] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
