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

// CORS headers for Shopify embedded app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Shop, X-Shopify-Host',
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
    const { shop, plan, interval = 'monthly' } = body;

    // Validate required fields
    if (!shop || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields: shop and plan' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate plan
    const validPlans: ShopifyPlanType[] = ['basic', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Must be one of: ${validPlans.join(', ')}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate interval
    if (interval !== 'monthly' && interval !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid interval. Must be "monthly" or "annual"' },
        { status: 400, headers: corsHeaders }
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
        { status: 404, headers: corsHeaders }
      );
    }

    if (!shopData.access_token) {
      return NextResponse.json(
        { error: 'Shop access token not found. Please reinstall the app.' },
        { status: 401, headers: corsHeaders }
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
        { status: 409, headers: corsHeaders }
      );
    }

    // Determine if we're in test mode
    // For dev stores, test mode must be true
    const isTestMode = process.env.NODE_ENV === 'development' || 
      process.env.SHOPIFY_TEST_MODE === 'true' ||
      shop.includes('test') || // dev stores often have 'test' in name
      true; // Always use test mode for now during development

    // Get the return URL (where Shopify redirects after approval)
    const host = request.headers.get('x-shopify-host') || 
                 request.headers.get('X-Shopify-Host') || '';
    const returnUrl = getSubscriptionReturnUrl(shop, host);

    console.log('[Shopify Billing Create] Host header:', host);

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
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[Shopify Billing Create] Error:', error);
    
    let errorMessage = 'Unknown error';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    // Check for common issues
    if (errorMessage.includes('Billing plan not found')) {
      errorMessage = 'Billing plans not configured. Please contact support.';
    } else if (errorMessage.includes('GraphQL error')) {
      errorMessage = 'Failed to connect to Shopify. Please try again.';
    }
    
    console.error('[Shopify Billing Create] Error details:', errorDetails);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
