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
 * 
 * Vercel automatically sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET env var is set.
 * This works on all Vercel plans (Hobby, Pro, Enterprise).
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCron = request.headers.get('x-vercel-cron');
  
  // Debug logging (will show in Vercel logs)
  console.log('🔐 Webhook renewal cron auth check:', {
    hasAuthHeader: !!authHeader,
    hasCronSecret: !!cronSecret,
    hasVercelCronHeader: !!vercelCron,
  });
  
  // Method 1: Check CRON_SECRET Bearer token (Vercel sends this automatically)
  if (cronSecret && authHeader) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader === expectedAuth) {
      console.log('✅ Cron auth: Valid CRON_SECRET');
      return true;
    }
  }
  
  // Method 2: Check for Vercel's internal cron header
  if (vercelCron === '1') {
    console.log('✅ Cron auth: Valid x-vercel-cron header');
    return true;
  }
  
  // Method 3: In development, allow without auth
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Cron auth: Development mode');
    return true;
  }
  
  console.log('❌ Cron auth failed');
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


