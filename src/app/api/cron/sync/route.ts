/**
 * Cron Job: Automatic Message Sync
 * Runs periodically to sync all active channel connections
 * 
 * Vercel Cron Configuration:
 * - Schedule: Every 5 minutes
 * - Route: /api/cron/sync
 * 
 * This ensures messages are synced automatically even when users aren't logged in
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllWorkspacesInBackground } from '@/lib/workers/background-sync';

/**
 * Verify the request is from Vercel Cron
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, verify it
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  // Otherwise, check for Vercel's cron header
  const cronHeader = request.headers.get('x-vercel-cron');
  return cronHeader === '1';
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    if (!verifyCronRequest(request)) {
      console.warn('Unauthorized cron request attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Automatic sync cron job started');

    // Use the background worker to sync all workspaces
    const result = await syncAllWorkspacesInBackground({
      maxMessages: 50,
      autoClassify: true,
    });

    if (!result.success) {
      console.error('❌ Cron job failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log('🔄 Automatic sync cron job completed', {
      workspacesProcessed: result.workspacesProcessed,
      connectionsProcessed: result.connectionsProcessed,
      totalNewMessages: result.totalNewMessages,
      totalErrors: result.totalErrors,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers (with auth)
export async function POST(request: NextRequest) {
  return GET(request);
}

