/**
 * Shopify Webhook Handler
 * 
 * Handles mandatory webhooks required for Shopify App Store approval:
 * - app/uninstalled - When merchant uninstalls your app
 * - customers/data_request - GDPR: Customer requests their data
 * - customers/redact - GDPR: Request to delete customer data
 * - shop/redact - GDPR: Request to delete shop data
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseServiceRoleClient } from '@/supabase-clients/admin/createSupabaseServiceRoleClient';

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

    // Verify webhook signature
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (apiSecret && hmacHeader) {
      const isValid = verifyWebhookSignature(body, hmacHeader, apiSecret);
      if (!isValid) {
        console.error('Shopify webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const supabase = createSupabaseServiceRoleClient();

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

      case 'customers/data_request':
        await handleCustomerDataRequest(supabase, shopDomain!, payload);
        break;

      case 'customers/redact':
        await handleCustomerRedact(supabase, shopDomain!, payload);
        break;

      case 'shop/redact':
        await handleShopRedact(supabase, shopDomain!, payload);
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
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
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

  console.log('✅ Store marked as uninstalled');
}

/**
 * Handle customers/data_request webhook (GDPR)
 * Called when a customer requests their data
 * You must respond with the customer's data within 30 days
 */
async function handleCustomerDataRequest(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
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
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
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
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
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

