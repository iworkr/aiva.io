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
    console.log('[Shopify Billing Verify] Querying subscriptions from Shopify...');
    let subscription, allSubscriptions;
    try {
      const result = await getCurrentSubscriptions(
        shop,
        shopData.access_token
      );
      subscription = result.subscription;
      allSubscriptions = result.allSubscriptions;
    } catch (graphqlError) {
      console.error('[Shopify Billing Verify] GraphQL error:', graphqlError);
      return redirectToBilling(shop, host, false, 'Failed to verify subscription with Shopify');
    }

    console.log('[Shopify Billing Verify] Subscription status:', {
      hasActive: !!subscription,
      total: allSubscriptions.length,
      allStatuses: allSubscriptions.map(s => ({ id: s.id, name: s.name, status: s.status })),
      subscription: subscription ? {
        id: subscription.id,
        name: subscription.name,
        status: subscription.status,
      } : null,
    });

    // Check if subscription was approved - accept ACTIVE or any subscription if just approved
    // Sometimes there's a delay before the subscription shows as ACTIVE
    const anySubscription = allSubscriptions.length > 0 ? allSubscriptions[0] : null;
    const targetSubscription = subscription || anySubscription;
    
    if (!targetSubscription) {
      // No subscriptions found at all
      console.log('[Shopify Billing Verify] No subscriptions found');
      await logBillingEvent(
        'subscription_declined',
        'shopify',
        {
          shop,
          chargeId,
          subscriptions: [],
        },
        {
          shopDomain: shop,
          idempotencyKey: chargeId ? `verify-${shop}-${chargeId}` : undefined,
        }
      );

      return redirectToBilling(shop, host, false, 'No subscription found');
    }
    
    // If we have a subscription but it's not ACTIVE, it might be pending or just approved
    if (targetSubscription.status !== 'ACTIVE') {
      console.log('[Shopify Billing Verify] Subscription not active:', targetSubscription.status);
      // Log but still try to process it
      await logBillingEvent(
        'subscription_pending',
        'shopify',
        {
          shop,
          chargeId,
          subscriptionId: targetSubscription.id,
          subscriptionName: targetSubscription.name,
          status: targetSubscription.status,
        },
        {
          shopDomain: shop,
          idempotencyKey: chargeId ? `verify-pending-${shop}-${chargeId}` : undefined,
        }
      );
      
      // For now, still redirect with success since they approved
      // The webhook will update the status when it becomes ACTIVE
    }

    // Sync subscription to entitlements
    console.log('[Shopify Billing Verify] Syncing to entitlements...');
    let entitlement;
    try {
      entitlement = await syncShopifySubscriptionToEntitlement(shop, {
        id: targetSubscription.id,
        name: targetSubscription.name,
        status: targetSubscription.status,
        currentPeriodEnd: targetSubscription.currentPeriodEnd,
        trialDays: targetSubscription.trialDays,
        test: targetSubscription.test,
      });

      // Ensure entitlement is linked to workspace if shop is linked
      if (entitlement && !entitlement.workspace_id) {
        try {
          const { data: shopData } = await supabaseAdminClient
            .from('shopify_stores')
            .select('workspace_id')
            .eq('shop_domain', shop)
            .eq('is_active', true)
            .single();
          
          if (shopData?.workspace_id) {
            const { ensureEntitlementsLinkedToWorkspace } = await import('@/lib/entitlements');
            await ensureEntitlementsLinkedToWorkspace(shop, shopData.workspace_id);
            console.log(`[Shopify Billing Verify] Auto-linked entitlement to workspace ${shopData.workspace_id}`);
          }
        } catch (linkError) {
          console.warn('[Shopify Billing Verify] Failed to auto-link entitlement (non-blocking):', linkError);
        }
      }
    } catch (syncError) {
      console.error('[Shopify Billing Verify] Sync error:', syncError);
      return redirectToBilling(shop, host, false, 'Failed to save subscription');
    }

    // Log the successful verification
    try {
      await logBillingEvent(
        'subscription_verified',
        'shopify',
        {
          shop,
          chargeId,
          subscriptionId: targetSubscription.id,
          subscriptionName: targetSubscription.name,
          plan: getPlanFromSubscriptionName(targetSubscription.name),
          entitlementId: entitlement.id,
        },
        {
          shopDomain: shop,
          entitlementId: entitlement.id,
          idempotencyKey: chargeId ? `verify-${shop}-${chargeId}` : undefined,
        }
      );
    } catch (logError) {
      console.error('[Shopify Billing Verify] Log error (non-fatal):', logError);
      // Don't fail on logging errors
    }

    console.log('[Shopify Billing Verify] Subscription verified:', {
      subscriptionId: targetSubscription.id,
      entitlementId: entitlement.id,
      plan: entitlement.plan,
      status: entitlement.status,
    });

    // Redirect back to billing page with success
    return redirectToBilling(shop, host, true);

  } catch (error) {
    console.error('[Shopify Billing Verify] Error:', error);
    
    // Log more detailed error info
    let errorMessage = 'Verification failed';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('[Shopify Billing Verify] Error message:', error.message);
      console.error('[Shopify Billing Verify] Error stack:', error.stack);
    }
    
    const shop = request.nextUrl.searchParams.get('shop') || '';
    const host = request.nextUrl.searchParams.get('host') || '';
    
    return redirectToBilling(shop, host, false, errorMessage);
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
