/**
 * Shopify Webhook Registration
 * Registers webhooks for order updates and other events
 */

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

const WEBHOOK_BASE_URL = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
const WEBHOOK_ENDPOINT = `${WEBHOOK_BASE_URL}/api/shopify/webhooks`;

/**
 * Register all webhooks for a Shopify store
 * This should be called after app installation or when webhooks need to be updated
 */
export async function registerShopifyWebhooks(storeId: string): Promise<boolean> {
  try {
    // Get store details
    const { data: store, error: storeError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('shop_domain, access_token')
      .eq('id', storeId)
      .eq('is_active', true)
      .single();

    if (storeError || !store || !store.access_token) {
      console.error('[Shopify Webhooks] Store not found or no access token:', storeError);
      return false;
    }

    // Webhook topics to register
    // Note: Shopify uses 'orders/updated' not 'orders/update'
    // Refunds use 'refunds/create' not 'orders/refunded'
    const webhookTopics = [
      'app/uninstalled',
      'orders/updated', // Changed from 'orders/update'
      'orders/paid',
      'orders/fulfilled',
      'orders/partially_fulfilled',
      'orders/cancelled',
      'refunds/create', // Changed from 'orders/refunded' - this covers all refunds
      // Note: 'orders/partially_refunded' doesn't exist - refunds/create covers all refunds
    ];

    console.log(`[Shopify Webhooks] Registering ${webhookTopics.length} webhooks for ${store.shop_domain}`);

    // Register each webhook
    const results = await Promise.allSettled(
      webhookTopics.map(async (topic) => {
        const response = await fetch(
          `https://${store.shop_domain}/admin/api/2024-01/webhooks.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': store.access_token,
            },
            body: JSON.stringify({
              webhook: {
                topic,
                address: WEBHOOK_ENDPOINT,
                format: 'json',
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          // Check if webhook already exists (409 conflict)
          if (response.status === 422) {
            // Try to get existing webhooks and update if needed
            const existingResponse = await fetch(
              `https://${store.shop_domain}/admin/api/2024-01/webhooks.json?topic=${topic}`,
              {
                headers: {
                  'X-Shopify-Access-Token': store.access_token,
                },
              }
            );

            if (existingResponse.ok) {
              const existing = await existingResponse.json();
              const webhook = existing.webhooks?.find((w: any) => w.topic === topic);
              if (webhook && webhook.address !== WEBHOOK_ENDPOINT) {
                // Update existing webhook
                await fetch(
                  `https://${store.shop_domain}/admin/api/2024-01/webhooks/${webhook.id}.json`,
                  {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Shopify-Access-Token': store.access_token,
                    },
                    body: JSON.stringify({
                      webhook: {
                        id: webhook.id,
                        address: WEBHOOK_ENDPOINT,
                      },
                    }),
                  }
                );
                console.log(`[Shopify Webhooks] Updated webhook: ${topic}`);
                return { topic, status: 'updated' };
              } else if (webhook) {
                console.log(`[Shopify Webhooks] Webhook already registered: ${topic}`);
                return { topic, status: 'exists' };
              }
            }
          }
          throw new Error(`Failed to register ${topic}: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Shopify Webhooks] Registered webhook: ${topic} (ID: ${data.webhook?.id})`);
        return { topic, status: 'registered', id: data.webhook?.id };
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[Shopify Webhooks] Registration complete: ${successful} successful, ${failed} failed`);

    if (failed > 0) {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`[Shopify Webhooks] Failed to register ${webhookTopics[index]}:`, result.reason);
        }
      });
    }

    return successful > 0;
  } catch (error) {
    console.error('[Shopify Webhooks] Error registering webhooks:', error);
    return false;
  }
}

/**
 * Check if webhooks are registered for a store
 */
export async function checkShopifyWebhooks(storeId: string): Promise<{
  registered: string[];
  missing: string[];
}> {
  try {
    const { data: store } = await supabaseAdminClient
      .from('shopify_stores')
      .select('shop_domain, access_token')
      .eq('id', storeId)
      .eq('is_active', true)
      .single();

    if (!store || !store.access_token) {
      return { registered: [], missing: [] };
    }

    const response = await fetch(
      `https://${store.shop_domain}/admin/api/2024-01/webhooks.json`,
      {
        headers: {
          'X-Shopify-Access-Token': store.access_token,
        },
      }
    );

    if (!response.ok) {
      return { registered: [], missing: [] };
    }

    const data = await response.json();
    const registeredTopics = (data.webhooks || []).map((w: any) => w.topic);

    const requiredTopics = [
      'app/uninstalled',
      'orders/updated',
      'orders/paid',
      'orders/fulfilled',
      'orders/partially_fulfilled',
      'orders/cancelled',
      'refunds/create',
    ];

    const missing = requiredTopics.filter((topic) => !registeredTopics.includes(topic));

    return {
      registered: registeredTopics,
      missing,
    };
  } catch (error) {
    console.error('[Shopify Webhooks] Error checking webhooks:', error);
    return { registered: [], missing: [] };
  }
}
