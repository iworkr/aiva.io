/**
 * Outlook/Microsoft Graph Webhook Subscription Management
 * Handles setting up and renewing Microsoft Graph change notifications
 * https://learn.microsoft.com/en-us/graph/webhooks
 */

import { getOutlookAccessToken } from './client';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

interface SubscriptionResponse {
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
}

/**
 * Create a Microsoft Graph subscription for inbox changes
 * @param connectionId - The channel connection ID
 * @param notificationUrl - The webhook URL to receive notifications
 * @returns Subscription details or null on failure
 */
export async function createOutlookSubscription(
  connectionId: string,
  notificationUrl?: string
): Promise<SubscriptionResponse | null> {
  try {
    const accessToken = await getOutlookAccessToken(connectionId);

    // Use environment variable or construct default webhook URL
    const webhookUrl =
      notificationUrl ||
      process.env.OUTLOOK_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/outlook`;

    if (!webhookUrl || webhookUrl.includes('undefined') || webhookUrl.includes('localhost')) {
      console.warn('Outlook webhook URL not properly configured for production');
      return null;
    }

    // Generate a random client state for verification
    const clientState = crypto.randomUUID();

    // Microsoft Graph subscriptions expire after 3 days max for mail
    const expirationDateTime = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000 // 3 days minus 1 minute
    ).toISOString();

    const response = await fetch(
      'https://graph.microsoft.com/v1.0/subscriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeType: 'created',
          notificationUrl: webhookUrl,
          resource: 'me/mailFolders/Inbox/messages',
          expirationDateTime,
          clientState,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create Outlook subscription:', errorText);
      throw new Error(`Outlook subscription failed: ${response.status} - ${errorText}`);
    }

    const data: SubscriptionResponse = await response.json();

    // Update connection with webhook details
    const supabase = supabaseAdminClient;
    await supabase
      .from('channel_connections')
      .update({
        webhook_enabled: true,
        webhook_subscription_id: data.id,
        webhook_expires_at: data.expirationDateTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    // Store client state for verification (in a secure way)
    // For now, we'll store it in the connection metadata
    await supabase
      .from('channel_connections')
      .update({
        metadata: { webhook_client_state: clientState },
      })
      .eq('id', connectionId);

    console.log('✅ Outlook subscription created successfully:', {
      connectionId,
      subscriptionId: data.id,
      expiresAt: data.expirationDateTime,
    });

    return data;
  } catch (error) {
    console.error('Error creating Outlook subscription:', error);
    return null;
  }
}

/**
 * Delete an Outlook subscription
 * @param connectionId - The channel connection ID
 * @param subscriptionId - The subscription ID to delete
 */
export async function deleteOutlookSubscription(
  connectionId: string,
  subscriptionId: string
): Promise<boolean> {
  try {
    const accessToken = await getOutlookAccessToken(connectionId);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      console.error('Failed to delete Outlook subscription:', response.statusText);
      return false;
    }

    // Update connection to remove webhook details
    const supabase = supabaseAdminClient;
    await supabase
      .from('channel_connections')
      .update({
        webhook_enabled: false,
        webhook_subscription_id: null,
        webhook_expires_at: null,
        metadata: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    console.log('✅ Outlook subscription deleted:', connectionId);
    return true;
  } catch (error) {
    console.error('Error deleting Outlook subscription:', error);
    return false;
  }
}

/**
 * Renew an Outlook subscription
 * Subscriptions must be renewed before they expire (max 3 days for mail)
 * @param connectionId - The channel connection ID
 * @param subscriptionId - The subscription ID to renew
 */
export async function renewOutlookSubscription(
  connectionId: string,
  subscriptionId: string
): Promise<SubscriptionResponse | null> {
  try {
    const accessToken = await getOutlookAccessToken(connectionId);

    // Extend expiration by another 3 days
    const expirationDateTime = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000 // 3 days minus 1 minute
    ).toISOString();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expirationDateTime,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to renew Outlook subscription:', errorText);
      
      // If subscription is gone, try to create a new one
      if (response.status === 404) {
        console.log('Subscription expired or deleted, creating new subscription...');
        return await createOutlookSubscription(connectionId);
      }
      
      return null;
    }

    const data: SubscriptionResponse = await response.json();

    // Update connection with new expiration
    const supabase = supabaseAdminClient;
    await supabase
      .from('channel_connections')
      .update({
        webhook_expires_at: data.expirationDateTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    console.log('✅ Outlook subscription renewed:', {
      connectionId,
      subscriptionId: data.id,
      expiresAt: data.expirationDateTime,
    });

    return data;
  } catch (error) {
    console.error('Error renewing Outlook subscription:', error);
    return null;
  }
}

/**
 * Renew Outlook subscription if expiring soon
 * @param connectionId - The channel connection ID
 * @param subscriptionId - The subscription ID
 * @param expiresAt - Current expiration timestamp
 * @param renewalThresholdHours - Hours before expiration to renew (default: 12)
 */
export async function renewOutlookSubscriptionIfNeeded(
  connectionId: string,
  subscriptionId: string | null,
  expiresAt: Date | string | null,
  renewalThresholdHours: number = 12
): Promise<boolean> {
  if (!subscriptionId || !expiresAt) {
    // No current subscription, create one
    const result = await createOutlookSubscription(connectionId);
    return result !== null;
  }

  const expiration = new Date(expiresAt);
  const now = new Date();
  const hoursUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilExpiration <= renewalThresholdHours) {
    console.log(`Outlook subscription expiring in ${hoursUntilExpiration.toFixed(1)} hours, renewing...`);
    const result = await renewOutlookSubscription(connectionId, subscriptionId);
    return result !== null;
  }

  return false; // No renewal needed
}

/**
 * Register Outlook webhook for a new connection
 * Called when a user connects their Outlook account
 * @param connectionId - The channel connection ID
 */
export async function registerOutlookWebhook(connectionId: string): Promise<boolean> {
  try {
    // First, check if the connection is for Outlook
    const supabase = supabaseAdminClient;
    const { data: connection, error } = await supabase
      .from('channel_connections')
      .select('provider, workspace_id')
      .eq('id', connectionId)
      .single();

    if (error || !connection) {
      console.error('Connection not found:', connectionId);
      return false;
    }

    if (connection.provider !== 'outlook') {
      console.warn('Connection is not Outlook:', connectionId);
      return false;
    }

    // Check if workspace plan supports webhooks
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('billing_subscriptions(billing_products(name, active))')
      .eq('id', connection.workspace_id)
      .single();

    // Only enable webhooks for Pro and Enterprise plans (cast to handle Supabase nested join typing)
    const workspaceData = workspace as unknown as { 
      billing_subscriptions: Array<{ billing_products: { name: string; active: boolean } | null }> | null 
    } | null;
    const subscriptions = workspaceData?.billing_subscriptions || [];
    const hasActiveSubscription = subscriptions.some((sub) =>
      sub?.billing_products?.active && ['pro', 'professional', 'enterprise'].includes(sub?.billing_products?.name?.toLowerCase() || '')
    );

    if (!hasActiveSubscription) {
      console.log('Workspace does not have a plan that supports webhooks:', connection.workspace_id);
      // Still return true, as we successfully processed (just didn't enable webhook)
      return true;
    }

    // Create the subscription
    const result = await createOutlookSubscription(connectionId);
    return result !== null;
  } catch (error) {
    console.error('Error registering Outlook webhook:', error);
    return false;
  }
}

/**
 * Unregister Outlook webhook for a connection
 * Called when a user disconnects their Outlook account
 * @param connectionId - The channel connection ID
 * 
 * Note: This function requires the sync_tracking migration to be applied
 * which adds webhook_subscription_id column.
 */
export async function unregisterOutlookWebhook(connectionId: string): Promise<boolean> {
  try {
    const supabase = supabaseAdminClient;
    const { data: connection } = await supabase
      .from('channel_connections')
      .select('id')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return true; // Connection doesn't exist, nothing to unregister
    }

    // Cast to include optional webhook fields (may not exist if migration not applied)
    type ConnectionWithWebhook = { 
      id: string;
      webhook_subscription_id?: string | null;
    };
    const typedConnection = connection as unknown as ConnectionWithWebhook;

    if (typedConnection?.webhook_subscription_id) {
      return await deleteOutlookSubscription(connectionId, typedConnection.webhook_subscription_id);
    }

    return true; // No subscription to delete
  } catch (error) {
    console.error('Error unregistering Outlook webhook:', error);
    return false;
  }
}

/**
 * Renew all expiring Outlook webhooks
 * Called by a cron job to ensure continuous notifications
 * 
 * Note: This function requires the sync_tracking migration to be applied
 * which adds webhook_enabled, webhook_subscription_id, and webhook_expires_at columns.
 */
export async function renewAllExpiringOutlookWebhooks(
  renewalThresholdHours: number = 12
): Promise<{ renewed: number; failed: number }> {
  const supabase = supabaseAdminClient;

  // Find all Outlook connections with webhooks enabled
  // Note: Using raw query to handle case where columns don't exist yet
  try {
    const { data: connections, error } = await supabase
      .from('channel_connections')
      .select('id, workspace_id')
      .eq('provider', 'outlook')
      .eq('status', 'active');

    if (error || !connections) {
      console.error('Failed to fetch Outlook connections:', error);
      return { renewed: 0, failed: 0 };
    }

    // Cast to include optional webhook fields (may not exist if migration not applied)
    type ConnectionWithWebhook = { 
      id: string; 
      workspace_id: string;
      webhook_enabled?: boolean;
      webhook_subscription_id?: string | null;
      webhook_expires_at?: string | null;
    };
    const typedConnections = connections as unknown as ConnectionWithWebhook[];

    let renewed = 0;
    let failed = 0;

    for (const connection of typedConnections) {
      // Skip if webhook not enabled or no subscription (migration not applied or webhook not set up)
      if (!connection.webhook_enabled || !connection.webhook_subscription_id || !connection.webhook_expires_at) {
        continue;
      }

      try {
        const wasRenewed = await renewOutlookSubscriptionIfNeeded(
          connection.id,
          connection.webhook_subscription_id,
          connection.webhook_expires_at,
          renewalThresholdHours
        );
        if (wasRenewed) {
          renewed++;
        }
      } catch (error) {
        console.error(`Failed to renew Outlook webhook for ${connection.id}:`, error);
        failed++;
      }
    }

    console.log(`Outlook webhook renewal complete: ${renewed} renewed, ${failed} failed`);
    return { renewed, failed };
  } catch (err) {
    // Handle case where columns don't exist (migration not applied)
    console.log('Outlook webhook renewal skipped: columns may not exist yet');
    return { renewed: 0, failed: 0 };
  }
}

