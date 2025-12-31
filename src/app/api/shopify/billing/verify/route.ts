/**
 * Verify Shopify Subscription API Route
 * Called after merchant approves/declines subscription on Shopify's confirmation page
 * Verifies the subscription status and updates entitlements
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { 
  getCurrentSubscriptions, 
  getPlanFromSubscriptionName 
} from '@/lib/shopify/billing';
import { 
  syncShopifySubscriptionToEntitlement,
  logBillingEvent,
  hasBillingEventBeenProcessed 
} from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const shop = request.nextUrl.searchParams.get('shop');
    const host = request.nextUrl.searchParams.get('host') || '';
    const chargeId = request.nextUrl.searchParams.get('charge_id');

    console.log('[Shopify Billing Verify] Request:', { shop, host, chargeId });

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Get shop data
    const { data: shopData, error: shopError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('id, access_token, workspace_id')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();

    if (shopError || !shopData || !shopData.access_token) {
      console.error('[Shopify Billing Verify] Shop not found:', shopError);
      return redirectToBilling(shop, host, false, 'Shop not found');
    }

    // Check for idempotency if we have a charge_id
    if (chargeId) {
      const idempotencyKey = `verify-${shop}-${chargeId}`;
      const alreadyProcessed = await hasBillingEventBeenProcessed(idempotencyKey);
      
      if (alreadyProcessed) {
        console.log('[Shopify Billing Verify] Already processed:', idempotencyKey);
        return redirectToBilling(shop, host, true);
      }
    }

    // Query current subscriptions from Shopify
    const { subscription, allSubscriptions } = await getCurrentSubscriptions(
      shop,
      shopData.access_token
    );

    console.log('[Shopify Billing Verify] Subscription status:', {
      hasActive: !!subscription,
      total: allSubscriptions.length,
      subscription: subscription ? {
        id: subscription.id,
        name: subscription.name,
        status: subscription.status,
      } : null,
    });

    // Check if subscription was approved
    if (!subscription || subscription.status !== 'ACTIVE') {
      // Subscription was declined or canceled
      await logBillingEvent(
        'subscription_declined',
        'shopify',
        {
          shop,
          chargeId,
          subscriptions: allSubscriptions.map(s => ({
            id: s.id,
            name: s.name,
            status: s.status,
          })),
        },
        {
          shopDomain: shop,
          idempotencyKey: chargeId ? `verify-${shop}-${chargeId}` : undefined,
        }
      );

      return redirectToBilling(shop, host, false, 'Subscription was declined or canceled');
    }

    // Subscription is active - sync to entitlements
    const entitlement = await syncShopifySubscriptionToEntitlement(shop, {
      id: subscription.id,
      name: subscription.name,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialDays: subscription.trialDays,
      test: subscription.test,
    });

    // Log the successful verification
    await logBillingEvent(
      'subscription_verified',
      'shopify',
      {
        shop,
        chargeId,
        subscriptionId: subscription.id,
        subscriptionName: subscription.name,
        plan: getPlanFromSubscriptionName(subscription.name),
        entitlementId: entitlement.id,
      },
      {
        shopDomain: shop,
        entitlementId: entitlement.id,
        idempotencyKey: chargeId ? `verify-${shop}-${chargeId}` : undefined,
      }
    );

    console.log('[Shopify Billing Verify] Subscription verified:', {
      subscriptionId: subscription.id,
      entitlementId: entitlement.id,
      plan: entitlement.plan,
      status: entitlement.status,
    });

    // Redirect back to billing page with success
    return redirectToBilling(shop, host, true);

  } catch (error) {
    console.error('[Shopify Billing Verify] Error:', error);
    
    const shop = request.nextUrl.searchParams.get('shop') || '';
    const host = request.nextUrl.searchParams.get('host') || '';
    
    return redirectToBilling(shop, host, false, 'Verification failed');
  }
}

/**
 * Redirect to the billing page with success/error status
 */
function redirectToBilling(
  shop: string,
  host: string,
  success: boolean,
  error?: string
): NextResponse {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
  // Use the API route for billing to work in Shopify iframe
  const redirectUrl = new URL('/api/shopify/billing', appUrl);
  
  redirectUrl.searchParams.set('shop', shop);
  redirectUrl.searchParams.set('host', host);
  
  if (success) {
    redirectUrl.searchParams.set('success', 'true');
  } else {
    redirectUrl.searchParams.set('canceled', 'true');
    if (error) {
      redirectUrl.searchParams.set('error', error);
    }
  }

  return NextResponse.redirect(redirectUrl);
}
