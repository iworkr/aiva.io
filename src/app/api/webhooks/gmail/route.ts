/**
 * Gmail Webhook Handler
 * Receives push notifications from Gmail API (Cloud Pub/Sub)
 * https://developers.google.com/gmail/api/guides/push
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { syncGmailMessages } from '@/lib/gmail/sync';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';

interface GmailPushNotification {
  message: {
    data: string; // base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface GmailHistoryData {
  emailAddress: string;
  historyId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Google
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';

    if (!userAgent.includes('Google')) {
      console.warn('Webhook received from non-Google user agent:', userAgent);
      // In production, you should verify the JWT token from Google
    }

    const body: GmailPushNotification = await request.json();

    if (!body.message?.data) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Decode the message data
    const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8');
    const notification: GmailHistoryData = JSON.parse(decodedData);

    console.log('Gmail push notification received:', {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      publishTime: body.message.publishTime,
    });

    // Find the channel connection for this email address
    const supabase = await createSupabaseUserServerActionClient();

    const { data: connection, error } = await supabase
      .from('channel_connections')
      .select('id, workspace_id, provider_account_id, sync_cursor')
      .eq('provider', 'gmail')
      .eq('provider_account_id', notification.emailAddress)
      .eq('status', 'active')
      .single();

    if (error || !connection) {
      console.warn('No active connection found for email:', notification.emailAddress);
      return NextResponse.json({ success: true, message: 'No connection found' });
    }

    // Trigger sync for this connection
    // Note: We're returning 200 immediately and processing async
    // Gmail expects a quick response
    syncGmailMessages(connection.id, connection.workspace_id, {
      maxMessages: 10, // Only fetch recent messages
      query: 'is:unread',
    })
      .then((result) => {
        console.log('Gmail webhook sync completed:', result);
      })
      .catch((error) => {
        console.error('Gmail webhook sync failed:', error);
      });

    return NextResponse.json({
      success: true,
      message: 'Webhook received, sync triggered',
    });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    // Return 200 even on error to prevent Gmail from retrying
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET endpoint to verify webhook is accessible
 */
export async function GET() {
  return NextResponse.json({
    service: 'gmail-webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}

