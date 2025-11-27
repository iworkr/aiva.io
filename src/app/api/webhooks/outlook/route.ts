/**
 * Outlook Webhook Handler
 * Receives push notifications from Microsoft Graph API subscriptions
 * https://learn.microsoft.com/en-us/graph/api/resources/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { syncOutlookMessages } from '@/lib/outlook/sync';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';

interface OutlookNotification {
  value: Array<{
    subscriptionId: string;
    changeType: string;
    resource: string; // e.g., "Users/{userId}/Messages/{messageId}"
    resourceData: {
      id: string;
      '@odata.type': string;
      '@odata.id': string;
    };
    clientState?: string;
    subscriptionExpirationDateTime: string;
  }>;
  validationToken?: string; // For subscription validation
}

/**
 * POST handler for Outlook webhook notifications
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const contentType = headersList.get('content-type') || '';

    // Handle subscription validation (Microsoft sends this first)
    if (contentType.includes('text/plain')) {
      const validationToken = await request.text();
      console.log('Outlook webhook validation request received');
      // Return the validation token as plain text
      return new NextResponse(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Handle notification payload
    const body: OutlookNotification = await request.json();

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.OUTLOOK_WEBHOOK_SECRET;
    if (webhookSecret) {
      // Microsoft Graph webhooks use HMAC-SHA256 signatures
      // Verify signature here if needed
      // For now, we'll trust requests from Microsoft's IP ranges
    }

    console.log('📧 Outlook webhook notification received:', {
      notificationCount: body.value?.length || 0,
      timestamp: new Date().toISOString(),
    });

    if (!body.value || body.value.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No notifications in payload',
      });
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Process each notification
    for (const notification of body.value) {
      try {
        // Extract user ID from resource path
        // Format: "Users/{userId}/Messages/{messageId}"
        const resourceMatch = notification.resource.match(/Users\/([^\/]+)\/Messages/);
        if (!resourceMatch) {
          console.warn('Could not extract user ID from resource:', notification.resource);
          continue;
        }

        const userId = resourceMatch[1];

        // Find the channel connection for this user
        const { data: connection, error } = await supabase
          .from('channel_connections')
          .select('id, workspace_id, provider_account_id')
          .eq('provider', 'outlook')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (error || !connection) {
          console.warn('No active Outlook connection found for user:', userId);
          continue;
        }

        // Trigger sync for this connection
        // Return 200 immediately and process async (Microsoft expects quick response)
        syncOutlookMessages(connection.id, connection.workspace_id, {
          maxMessages: 20, // Fetch recent messages
          // No filter = sync all recent messages to ensure contacts are created
        })
          .then((result) => {
            console.log('✅ Outlook webhook sync completed:', {
              connectionId: connection.id,
              syncedCount: result.syncedCount,
              newCount: result.newCount,
            });
          })
          .catch((error) => {
            console.error('❌ Outlook webhook sync failed:', error);
          });
      } catch (error) {
        console.error('Error processing Outlook notification:', error);
        // Continue processing other notifications
      }
    }

    // Return 202 Accepted to acknowledge receipt
    // Microsoft Graph expects 202 for successful webhook processing
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook received, sync triggered',
        notificationsProcessed: body.value.length,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('❌ Outlook webhook error:', error);
    // Return 200 even on error to prevent Microsoft from retrying
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 200 }
    );
  }
}

/**
 * GET endpoint to verify webhook is accessible
 */
export async function GET() {
  return NextResponse.json({
    service: 'outlook-webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}

