/**
 * Gmail Pub/Sub Webhook Registration
 * Handles setting up and renewing Gmail push notifications via Cloud Pub/Sub
 * https://developers.google.com/gmail/api/guides/push
 */

import { getGmailAccessToken } from './client';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

interface WatchResponse {
  historyId: string;
  expiration: string; // Unix timestamp in milliseconds
}

/**
 * Watch for changes to the user's Gmail inbox
 * Sets up Cloud Pub/Sub push notifications
 * @param connectionId - The channel connection ID
 * @param topicName - The Cloud Pub/Sub topic name (projects/{project}/topics/{topic})
 * @returns Watch response with expiration time
 */
export async function watchGmailInbox(
  connectionId: string,
  topicName?: string
): Promise<WatchResponse | null> {
  try {
    const accessToken = await getGmailAccessToken(connectionId);

    // Use environment variable or default topic name
    const pubsubTopic =
      topicName ||
      process.env.GMAIL_PUBSUB_TOPIC ||
      `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/aiva-gmail-notifications`;

    if (!pubsubTopic || pubsubTopic.includes('undefined')) {
      console.warn('Gmail Pub/Sub topic not configured');
      return null;
    }

    // Set up watch on the inbox
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/watch',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicName: pubsubTopic,
          labelIds: ['INBOX'],
          labelFilterBehavior: 'include',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to set up Gmail watch:', errorText);
      throw new Error(`Gmail watch failed: ${response.status} - ${errorText}`);
    }

    const data: WatchResponse = await response.json();

    // Update connection with webhook details
    const supabase = supabaseAdminClient;
    await supabase
      .from('channel_connections')
      .update({
        webhook_enabled: true,
        webhook_subscription_id: data.historyId,
        webhook_expires_at: new Date(parseInt(data.expiration)).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    console.log('✅ Gmail watch set up successfully:', {
      connectionId,
      historyId: data.historyId,
      expiresAt: new Date(parseInt(data.expiration)).toISOString(),
    });

    return data;
  } catch (error) {
    console.error('Error setting up Gmail watch:', error);
    return null;
  }
}

/**
 * Stop watching for changes to the user's Gmail inbox
 * @param connectionId - The channel connection ID
 */
export async function stopGmailWatch(connectionId: string): Promise<boolean> {
  try {
    const accessToken = await getGmailAccessToken(connectionId);

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/stop',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to stop Gmail watch:', response.statusText);
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    console.log('✅ Gmail watch stopped:', connectionId);
    return true;
  } catch (error) {
    console.error('Error stopping Gmail watch:', error);
    return false;
  }
}

/**
 * Renew Gmail watch if expiring soon
 * Gmail watches expire after 7 days
 * @param connectionId - The channel connection ID
 * @param expiresAt - Current expiration timestamp
 * @param renewalThresholdHours - Hours before expiration to renew (default: 24)
 */
export async function renewGmailWatchIfNeeded(
  connectionId: string,
  expiresAt: Date | string | null,
  renewalThresholdHours: number = 24
): Promise<boolean> {
  if (!expiresAt) {
    // No current watch, set one up
    const result = await watchGmailInbox(connectionId);
    return result !== null;
  }

  const expiration = new Date(expiresAt);
  const now = new Date();
  const hoursUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilExpiration <= renewalThresholdHours) {
    console.log(`Gmail watch expiring in ${hoursUntilExpiration.toFixed(1)} hours, renewing...`);
    const result = await watchGmailInbox(connectionId);
    return result !== null;
  }

  return false; // No renewal needed
}

/**
 * Register Gmail webhook for a new connection
 * Called when a user connects their Gmail account
 * @param connectionId - The channel connection ID
 */
export async function registerGmailWebhook(connectionId: string): Promise<boolean> {
  try {
    // First, check if the connection is for Gmail
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

    if (connection.provider !== 'gmail') {
      console.warn('Connection is not Gmail:', connectionId);
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

    // Set up the watch
    const result = await watchGmailInbox(connectionId);
    return result !== null;
  } catch (error) {
    console.error('Error registering Gmail webhook:', error);
    return false;
  }
}

/**
 * Unregister Gmail webhook for a connection
 * Called when a user disconnects their Gmail account
 * @param connectionId - The channel connection ID
 */
export async function unregisterGmailWebhook(connectionId: string): Promise<boolean> {
  return await stopGmailWatch(connectionId);
}

/**
 * Renew all expiring Gmail webhooks
 * Called by a cron job to ensure continuous notifications
 * 
 * Note: This function requires the sync_tracking migration to be applied
 * which adds webhook_enabled and webhook_expires_at columns.
 */
export async function renewAllExpiringGmailWebhooks(
  renewalThresholdHours: number = 24
): Promise<{ renewed: number; failed: number }> {
  const supabase = supabaseAdminClient;

  // Find all Gmail connections with webhooks enabled
  // Note: Using raw query to handle case where columns don't exist yet
  try {
    const { data: connections, error } = await supabase
      .from('channel_connections')
      .select('id, workspace_id')
      .eq('provider', 'gmail')
      .eq('status', 'active');

    if (error || !connections) {
      console.error('Failed to fetch Gmail connections:', error);
      return { renewed: 0, failed: 0 };
    }

    // Cast to include optional webhook fields (may not exist if migration not applied)
    type ConnectionWithWebhook = { 
      id: string; 
      workspace_id: string; 
      webhook_enabled?: boolean; 
      webhook_expires_at?: string | null;
    };
    const typedConnections = connections as unknown as ConnectionWithWebhook[];

    let renewed = 0;
    let failed = 0;

    for (const connection of typedConnections) {
      // Skip if webhook not enabled or no expiration (migration not applied or webhook not set up)
      if (!connection.webhook_enabled || !connection.webhook_expires_at) {
        continue;
      }

      try {
        const wasRenewed = await renewGmailWatchIfNeeded(
          connection.id,
          connection.webhook_expires_at,
          renewalThresholdHours
        );
        if (wasRenewed) {
          renewed++;
        }
      } catch (error) {
        console.error(`Failed to renew Gmail webhook for ${connection.id}:`, error);
        failed++;
      }
    }

    console.log(`Gmail webhook renewal complete: ${renewed} renewed, ${failed} failed`);
    return { renewed, failed };
  } catch (err) {
    // Handle case where columns don't exist (migration not applied)
    console.log('Gmail webhook renewal skipped: columns may not exist yet');
    return { renewed: 0, failed: 0 };
  }
}

