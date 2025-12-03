/**
 * Webhook Renewal Cron Job
 * Renews Gmail and Outlook webhooks before they expire
 * 
 * Gmail webhooks expire after 7 days
 * Outlook subscriptions expire after 3 days
 * 
 * This cron job should run daily to ensure continuous notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { renewAllExpiringGmailWebhooks } from '@/lib/gmail/webhooks';
import { renewAllExpiringOutlookWebhooks } from '@/lib/outlook/webhooks';

/**
 * Verify the request is from a legitimate cron job
 */
function verifyCronRequest(request: NextRequest): boolean {
  // Check for Vercel cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check for Vercel cron job header
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron) {
    return true;
  }

  // In development, allow without authentication
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    if (!verifyCronRequest(request)) {
      console.warn('Unauthorized webhook renewal cron request attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Webhook renewal cron job started');

    // Renew Gmail webhooks (threshold: 24 hours before expiration)
    const gmailResult = await renewAllExpiringGmailWebhooks(24);
    console.log('📧 Gmail webhook renewal:', gmailResult);

    // Renew Outlook webhooks (threshold: 12 hours before expiration)
    const outlookResult = await renewAllExpiringOutlookWebhooks(12);
    console.log('📧 Outlook webhook renewal:', outlookResult);

    const totalRenewed = gmailResult.renewed + outlookResult.renewed;
    const totalFailed = gmailResult.failed + outlookResult.failed;

    console.log('🔄 Webhook renewal cron job completed:', {
      gmailRenewed: gmailResult.renewed,
      gmailFailed: gmailResult.failed,
      outlookRenewed: outlookResult.renewed,
      outlookFailed: outlookResult.failed,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      gmail: gmailResult,
      outlook: outlookResult,
      summary: {
        totalRenewed,
        totalFailed,
      },
    });
  } catch (error) {
    console.error('❌ Webhook renewal cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

