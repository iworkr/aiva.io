/**
 * Cron Job: Automatic Message Sync
 * Runs periodically to sync all active channel connections
 * 
 * Vercel Cron Configuration (tiered by plan):
 * - Pro/Enterprise: Every 5 minutes  (/api/cron/sync?tier=pro)
 * - Basic: Every 30 minutes          (/api/cron/sync?tier=basic)
 * - Free: Every hour                 (/api/cron/sync?tier=free)
 * 
 * This ensures messages are synced automatically based on subscription tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { syncWorkspaceInBackground, BackgroundSyncResult } from '@/lib/workers/background-sync';
import { getPlanType, PlanType, PLAN_SYNC_LIMITS } from '@/utils/subscriptions';
import { SubscriptionData } from '@/payments/AbstractPaymentGateway';

type SyncTier = 'free' | 'basic' | 'pro' | 'all';

/**
 * Verify the request is from Vercel Cron or an authorized source
 * 
 * Vercel cron jobs are authenticated in several ways:
 * 1. CRON_SECRET env var (recommended for Pro/Enterprise)
 * 2. Vercel's internal cron header (automatic for vercel.json crons)
 * 3. In development, allow all requests if no secret is set
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Method 1: Check CRON_SECRET if it's configured
  if (cronSecret && cronSecret !== 'your-cron-secret-here') {
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  }
  
  // Method 2: Check for Vercel's internal cron header
  // This is automatically set by Vercel when running crons defined in vercel.json
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron) {
    return true;
  }
  
  // Method 3: Check for Vercel deployment URL pattern (internal request)
  const host = request.headers.get('host') || '';
  const isVercelInternal = host.includes('.vercel.app') || host.includes('vercel.app');
  const userAgent = request.headers.get('user-agent') || '';
  const isVercelCronAgent = userAgent.includes('vercel-cron');
  
  if (isVercelInternal && isVercelCronAgent) {
    return true;
  }
  
  // Method 4: In development or if no CRON_SECRET is set, allow the request
  // This enables the cron to work on Vercel Hobby plan without extra configuration
  if (!cronSecret || cronSecret === 'your-cron-secret-here') {
    // Only allow in production from Vercel or in development
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction || isVercelInternal) {
      return true;
    }
  }
  
  return false;
}

/**
 * Map plan types to sync tiers
 */
function getPlanTier(planType: PlanType): SyncTier {
  switch (planType) {
    case 'enterprise':
    case 'pro':
      return 'pro';
    case 'basic':
      return 'basic';
    case 'free':
    default:
      return 'free';
  }
}

/**
 * Get workspaces that should be synced for a given tier
 */
async function getWorkspacesForTier(tier: SyncTier): Promise<Array<{ id: string; planType: PlanType }>> {
  const supabase = supabaseAdminClient;

  // Get all active workspaces with their subscriptions
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select(`
      id,
      billing_subscriptions (
        billing_products (
          name,
          active
        )
      )
    `)
    .eq('is_active', true);

  if (workspacesError || !workspaces) {
    console.error('Failed to fetch workspaces:', workspacesError);
    return [];
  }

  // Filter workspaces by tier
  const workspacesWithPlan = workspaces.map(workspace => {
    // Cast to handle Supabase nested join typing
    const workspaceData = workspace as unknown as { 
      id: string; 
      billing_subscriptions: SubscriptionData[] | null 
    };
    const subscriptions = workspaceData.billing_subscriptions || [];
    const planType = getPlanType(subscriptions);
    const workspaceTier = getPlanTier(planType);
    
    return {
      id: workspaceData.id,
      planType,
      tier: workspaceTier,
    };
  });

  // If tier is 'all', return all workspaces
  if (tier === 'all') {
    return workspacesWithPlan.map(w => ({ id: w.id, planType: w.planType }));
  }

  // Filter by requested tier
  return workspacesWithPlan
    .filter(w => w.tier === tier)
    .map(w => ({ id: w.id, planType: w.planType }));
}

/**
 * Check if a workspace should be synced based on last sync time
 */
async function shouldSyncWorkspace(workspaceId: string, planType: PlanType): Promise<boolean> {
  const supabase = supabaseAdminClient;
  const limits = PLAN_SYNC_LIMITS[planType];
  
  // Get workspace settings to check last sync time
  const { data: settings } = await supabase
    .from('workspace_settings')
    .select('workspace_settings')
    .eq('workspace_id', workspaceId)
    .single();

  const workspaceSettings = (settings?.workspace_settings || {}) as Record<string, unknown>;
  const lastSyncAt = workspaceSettings.lastSyncAt as string | undefined;
  const syncFrequency = (workspaceSettings.syncFrequency as number) || limits.minSyncIntervalMinutes;
  
  // Use the maximum of configured frequency and plan minimum
  const effectiveFrequency = Math.max(syncFrequency, limits.minSyncIntervalMinutes);
  
  if (!lastSyncAt) {
    return true; // Never synced, should sync
  }
  
  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const minutesSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);
  
  return minutesSinceLastSync >= effectiveFrequency;
}

/**
 * Update last sync time for a workspace
 */
async function updateLastSyncTime(workspaceId: string): Promise<void> {
  const supabase = supabaseAdminClient;
  
  // Get existing settings
  const { data: existing } = await supabase
    .from('workspace_settings')
    .select('workspace_settings')
    .eq('workspace_id', workspaceId)
    .single();

  const currentSettings = (existing?.workspace_settings || {}) as Record<string, unknown>;

  await supabase
    .from('workspace_settings')
    .upsert({
      workspace_id: workspaceId,
      workspace_settings: {
        ...currentSettings,
        lastSyncAt: new Date().toISOString(),
      },
    });
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

    // Get tier from query params (defaults to 'all' for backward compatibility)
    const { searchParams } = new URL(request.url);
    const tier = (searchParams.get('tier') as SyncTier) || 'all';

    console.log(`🔄 Automatic sync cron job started for tier: ${tier}`);

    // Get workspaces for this tier
    const workspaces = await getWorkspacesForTier(tier);
    
    if (workspaces.length === 0) {
      console.log(`No workspaces found for tier: ${tier}`);
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        tier,
        workspacesProcessed: 0,
        message: 'No workspaces to sync',
      });
    }

    let totalConnections = 0;
    let totalNewMessages = 0;
    let totalErrors = 0;
    let workspacesSynced = 0;
    let workspacesSkipped = 0;

    // Sync each workspace
    for (const workspace of workspaces) {
      try {
        // Check if workspace should be synced based on frequency settings
        const shouldSync = await shouldSyncWorkspace(workspace.id, workspace.planType);
        
        if (!shouldSync) {
          workspacesSkipped++;
          continue;
        }

        const result: BackgroundSyncResult = await syncWorkspaceInBackground(workspace.id, {
          maxMessages: 50,
          autoClassify: true,
        });

        if (result.success) {
          totalConnections += result.connectionsProcessed || 0;
          totalNewMessages += result.totalNewMessages || 0;
          workspacesSynced++;
          
          // Update last sync time
          await updateLastSyncTime(workspace.id);
        } else {
          totalErrors++;
          console.error(`Failed to sync workspace ${workspace.id}:`, result.error);
        }
      } catch (error) {
        console.error(`Error syncing workspace ${workspace.id}:`, error);
        totalErrors++;
      }
    }

    console.log(`🔄 Automatic sync cron job completed for tier: ${tier}`, {
      workspacesEligible: workspaces.length,
      workspacesSynced,
      workspacesSkipped,
      totalConnections,
      totalNewMessages,
      totalErrors,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tier,
      workspacesEligible: workspaces.length,
      workspacesProcessed: workspacesSynced,
      workspacesSkipped,
      connectionsProcessed: totalConnections,
      totalNewMessages,
      totalErrors,
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
