/**
 * Shopify Webhook Handler
 * 
 * Handles mandatory webhooks required for Shopify App Store approval:
 * - app/uninstalled - When merchant uninstalls your app
 * - app_subscriptions/update - When subscription status changes
 * - customers/data_request - GDPR: Customer requests their data
 * - customers/redact - GDPR: Request to delete customer data
 * - shop/redact - GDPR: Request to delete shop data
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { 
  cancelEntitlement, 
  syncShopifySubscriptionToEntitlement,
  logBillingEvent,
  hasBillingEventBeenProcessed
} from '@/lib/entitlements';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Verify Shopify webhook signature
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hmac)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const topic = request.headers.get('x-shopify-topic');
    const shopDomain = request.headers.get('x-shopify-shop-domain');
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');

    console.log('🔵 Shopify webhook received:', { topic, shopDomain });

    // MANDATORY: Verify webhook HMAC signature
    // Shopify requires returning 401 Unauthorized for invalid signatures
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    
    // Always verify HMAC if the header is present
    if (hmacHeader) {
      if (!apiSecret) {
        console.error('SHOPIFY_API_SECRET not configured - cannot verify webhook');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const isValid = verifyWebhookSignature(body, hmacHeader, apiSecret);
      if (!isValid) {
        console.error('Shopify webhook signature verification failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // No HMAC header = reject the request
      console.error('Missing x-shopify-hmac-sha256 header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const supabase = supabaseAdminClient;

    // Log webhook for audit trail
    await supabase.from('shopify_webhook_logs').insert({
      shop_domain: shopDomain || 'unknown',
      topic: topic || 'unknown',
      payload,
    });

    // Handle different webhook topics
    switch (topic) {
      case 'app/uninstalled':
        await handleAppUninstalled(supabase, shopDomain!, payload);
        break;

      case 'app_subscriptions/update':
        await handleAppSubscriptionUpdate(supabase, shopDomain!, payload);
        break;

      case 'customers/data_request':
        await handleCustomerDataRequest(supabase, shopDomain!, payload);
        break;

      case 'customers/redact':
        await handleCustomerRedact(supabase, shopDomain!, payload);
        break;

      case 'shop/redact':
        await handleShopRedact(supabase, shopDomain!, payload);
        break;

      case 'orders/updated': // Shopify uses 'orders/updated' not 'orders/update'
      case 'orders/paid':
      case 'orders/fulfilled':
      case 'orders/partially_fulfilled':
      case 'orders/cancelled':
      case 'refunds/create': // Refunds use 'refunds/create' not 'orders/refunded'
        await handleOrderUpdate(supabase, shopDomain!, payload);
        break;

      default:
        console.log('Unhandled Shopify webhook topic:', topic);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle app/uninstalled webhook
 * Called when a merchant uninstalls your app
 */
async function handleAppUninstalled(
  supabase: typeof supabaseAdminClient,
  shopDomain: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _payload: unknown
) {
  console.log('🔴 App uninstalled for shop:', shopDomain);

  // Mark store as inactive (don't delete - preserve for potential reinstall)
  const { error } = await supabase
    .from('shopify_stores')
    .update({
      is_active: false,
      uninstalled_at: new Date().toISOString(),
      access_token: '', // Clear token for security
    })
    .eq('shop_domain', shopDomain);

  if (error) {
    console.error('Failed to mark store as uninstalled:', error);
    throw error;
  }

  // Cancel any active entitlement for this shop
  try {
    await cancelEntitlement(shopDomain);
    console.log('✅ Entitlement canceled for shop:', shopDomain);
  } catch (entitlementError) {
    // Log but don't throw - entitlement might not exist
    console.warn('Could not cancel entitlement:', entitlementError);
  }

  // Log the billing event
  await logBillingEvent(
    'app_uninstalled',
    'shopify',
    { shop: shopDomain },
    { shopDomain }
  );

  console.log('✅ Store marked as uninstalled');
}

/**
 * Handle app_subscriptions/update webhook
 * Called when a subscription status changes (activated, cancelled, etc.)
 */
async function handleAppSubscriptionUpdate(
  supabase: typeof supabaseAdminClient,
  shopDomain: string,
  payload: {
    app_subscription: {
      admin_graphql_api_id: string;
      name: string;
      status: string;
      created_at: string;
      updated_at: string;
      currency: string;
      capped_amount?: string;
      trial_days?: number;
      test?: boolean;
    };
  }
) {
  console.log('💳 App subscription update for shop:', shopDomain);
  console.log('Subscription:', payload.app_subscription);

  const subscription = payload.app_subscription;
  
  // Create idempotency key
  const idempotencyKey = `sub-update-${shopDomain}-${subscription.admin_graphql_api_id}-${subscription.updated_at}`;
  
  // Check if already processed
  const alreadyProcessed = await hasBillingEventBeenProcessed(idempotencyKey);
  if (alreadyProcessed) {
    console.log('Subscription update already processed:', idempotencyKey);
    return;
  }

  try {
    // Sync the subscription to entitlements
    const entitlement = await syncShopifySubscriptionToEntitlement(shopDomain, {
      id: subscription.admin_graphql_api_id,
      name: subscription.name,
      status: subscription.status,
      trialDays: subscription.trial_days,
      test: subscription.test,
    });

    // Ensure entitlement is linked to workspace if shop is linked
    // This handles the case where subscription webhook comes in after shop is linked
    if (entitlement && !entitlement.workspace_id) {
      try {
        const { data: shop } = await supabaseAdminClient
          .from('shopify_stores')
          .select('workspace_id')
          .eq('shop_domain', shopDomain)
          .eq('is_active', true)
          .single();
        
        if (shop?.workspace_id) {
          const { ensureEntitlementsLinkedToWorkspace } = await import('@/lib/entitlements');
          await ensureEntitlementsLinkedToWorkspace(shopDomain, shop.workspace_id);
          console.log(`[Webhook] Auto-linked entitlement to workspace ${shop.workspace_id} for shop ${shopDomain}`);
        }
      } catch (linkError) {
        console.warn('[Webhook] Failed to auto-link entitlement (non-blocking):', linkError);
      }
    }

    // Log the billing event
    await logBillingEvent(
      'subscription_updated',
      'shopify',
      {
        shop: shopDomain,
        subscriptionId: subscription.admin_graphql_api_id,
        subscriptionName: subscription.name,
        status: subscription.status,
        entitlementPlan: entitlement.plan,
        entitlementStatus: entitlement.status,
      },
      {
        shopDomain,
        entitlementId: entitlement.id,
        idempotencyKey,
      }
    );

    console.log('✅ Subscription update processed:', {
      subscriptionId: subscription.admin_graphql_api_id,
      status: subscription.status,
      entitlementPlan: entitlement.plan,
      entitlementStatus: entitlement.status,
    });
  } catch (error) {
    console.error('Failed to process subscription update:', error);
    
    // Still log the event for debugging
    await logBillingEvent(
      'subscription_update_failed',
      'shopify',
      {
        shop: shopDomain,
        subscription: payload.app_subscription,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { shopDomain, idempotencyKey }
    );
    
    throw error;
  }
}

/**
 * Handle customers/data_request webhook (GDPR)
 * Called when a customer requests their data
 * You must respond with the customer's data within 30 days
 */
async function handleCustomerDataRequest(
  supabase: typeof supabaseAdminClient,
  shopDomain: string,
  payload: {
    shop_id: number;
    shop_domain: string;
    customer: { id: number; email: string; phone: string };
    orders_requested: number[];
  }
) {
  console.log('📧 Customer data request for shop:', shopDomain);
  console.log('Customer:', payload.customer?.email);

  // For Aiva, we primarily store messages/communications
  // In a real implementation, you would:
  // 1. Query all data associated with this customer
  // 2. Compile it into a report
  // 3. Email it to the shop owner or customer

  // For now, just log it - you can implement data export later
  const { error } = await supabase.from('shopify_webhook_logs').insert({
    shop_domain: shopDomain,
    topic: 'customers/data_request_processed',
    payload: {
      customer_email: payload.customer?.email,
      status: 'acknowledged',
      note: 'Data request received - implement export as needed',
    },
  });

  if (error) {
    console.error('Failed to log data request:', error);
  }

  console.log('✅ Customer data request logged');
}

/**
 * Handle customers/redact webhook (GDPR)
 * Called when a shop requests deletion of a customer's data
 */
async function handleCustomerRedact(
  supabase: typeof supabaseAdminClient,
  shopDomain: string,
  payload: {
    shop_id: number;
    shop_domain: string;
    customer: { id: number; email: string; phone: string };
    orders_to_redact: number[];
  }
) {
  console.log('🗑️ Customer redact request for shop:', shopDomain);
  console.log('Customer to redact:', payload.customer?.email);

  // In a real implementation, you would:
  // 1. Find all data associated with this customer
  // 2. Delete or anonymize it

  // For Aiva, this might mean:
  // - Deleting messages from this customer
  // - Removing their contact info
  // - Anonymizing any analytics

  const { error } = await supabase.from('shopify_webhook_logs').insert({
    shop_domain: shopDomain,
    topic: 'customers/redact_processed',
    payload: {
      customer_email: payload.customer?.email,
      status: 'processed',
      note: 'Customer data redaction request received',
    },
  });

  if (error) {
    console.error('Failed to log redact request:', error);
  }

  console.log('✅ Customer redact request logged');
}

/**
 * Handle shop/redact webhook (GDPR)
 * Called 48 hours after a shop uninstalls your app
 * You must delete ALL data associated with this shop
 */
async function handleShopRedact(
  supabase: typeof supabaseAdminClient,
  shopDomain: string,
  payload: {
    shop_id: number;
    shop_domain: string;
  }
) {
  console.log('🗑️ Shop redact request for:', shopDomain);

  // Delete all shop data
  // This is called 48 hours after uninstall - must comply

  // 1. Delete shop record
  const { error: deleteError } = await supabase
    .from('shopify_stores')
    .delete()
    .eq('shop_domain', shopDomain);

  if (deleteError) {
    console.error('Failed to delete shop:', deleteError);
    throw deleteError;
  }

  // 2. Clean up webhook logs (optional - keep for 30 days for compliance)
  // You might want to keep logs for a period for compliance verification

  // 3. Delete any other shop-related data
  // Add more cleanup here as you add more Shopify-specific tables

  // Log the successful redaction
  await supabase.from('shopify_webhook_logs').insert({
    shop_domain: shopDomain,
    topic: 'shop/redact_processed',
    payload: {
      shop_id: payload.shop_id,
      status: 'deleted',
      deleted_at: new Date().toISOString(),
    },
  });

  console.log('✅ Shop data deleted');
}

/**
 * Handle order update webhooks
 * Called when an order is created, updated, paid, fulfilled, cancelled, or refunded
 * This provides real-time order status updates
 */
async function handleOrderUpdate(
  supabase: typeof supabaseAdminClient,
  shopDomain: string,
  payload: {
    id: number;
    name?: string;
    email?: string;
    financial_status?: string;
    fulfillment_status?: string;
    updated_at?: string;
    [key: string]: unknown;
  }
) {
  console.log('📦 Order update webhook for shop:', shopDomain);
  console.log('Order ID:', payload.id, 'Status:', payload.financial_status, payload.fulfillment_status);

  try {
    // Get the store
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('id, workspace_id, sync_enabled')
      .eq('shop_domain', shopDomain)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      console.error('Store not found for order webhook:', shopDomain);
      return;
    }

    if (!store.workspace_id) {
      console.error('Store has no workspace_id, skipping order update');
      return;
    }

    if (!store.sync_enabled) {
      console.log('Sync disabled for store, skipping order update');
      return;
    }

    // Import sync function dynamically to avoid circular dependencies
    const { syncShopifyOrders } = await import('@/lib/shopify/sync');

    // Sync just this order (or recent orders if we can't sync a single order)
    // The sync function will use incremental sync to get recent updates
    const syncResult = await syncShopifyOrders(store.id, store.workspace_id, {
      maxRecords: 10, // Only sync a few recent orders
      sinceDate: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Last 5 minutes
    });

    console.log('✅ Order update synced:', {
      orderId: payload.id,
      synced: syncResult.recordsSynced,
      updated: syncResult.recordsUpdated,
    });
  } catch (error) {
    console.error('Failed to sync order update:', error);
    // Don't throw - webhook should still return 200
  }
}

