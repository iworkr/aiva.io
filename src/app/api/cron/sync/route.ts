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
import { PlanType, PLAN_SYNC_LIMITS } from '@/utils/subscriptions';

type SyncTier = 'free' | 'basic' | 'pro' | 'all';

/**
 * Verify the request is from Vercel Cron or an authorized source
 * 
 * Vercel automatically sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET env var is set.
 * This works on all Vercel plans (Hobby, Pro, Enterprise).
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCron = request.headers.get('x-vercel-cron');
  
  // Debug logging (will show in Vercel logs)
  console.log('🔐 Cron auth check:', {
    hasAuthHeader: !!authHeader,
    hasCronSecret: !!cronSecret,
    hasVercelCronHeader: !!vercelCron,
    authHeaderPrefix: authHeader?.substring(0, 20) + '...',
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
 * 
 * Queries billing_customers and billing_subscriptions to determine plan type.
 * Falls back to 'free' tier for workspaces without active subscriptions.
 */
async function getWorkspacesForTier(tier: SyncTier): Promise<Array<{ id: string; planType: PlanType }>> {
  const supabase = supabaseAdminClient;

  // Get all workspaces with their billing info
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select(`
      id,
      billing_customers!billing_customers_workspace_id_fkey (
        gateway_customer_id,
        billing_subscriptions (
          status,
          billing_products (
            name,
            active
          )
        )
      )
    `);

  if (workspacesError || !workspaces) {
    console.error('Failed to fetch workspaces:', workspacesError);
    return [];
  }

  console.log(`📊 Found ${workspaces.length} total workspaces`);

  // Determine plan type for each workspace
  const workspacesWithPlan = workspaces.map(workspace => {
    let planType: PlanType = 'free';
    let workspaceTier: SyncTier = 'free';
    
    // Check billing data
    const billingCustomers = workspace.billing_customers as any[];
    if (billingCustomers && billingCustomers.length > 0) {
      for (const customer of billingCustomers) {
        const subscriptions = customer.billing_subscriptions as any[];
        if (subscriptions && subscriptions.length > 0) {
          for (const sub of subscriptions) {
            // Check for active subscription
            if (sub.status === 'active' && sub.billing_products?.active) {
              const productName = (sub.billing_products.name || '').toLowerCase();
              
              if (productName.includes('enterprise')) {
                planType = 'enterprise';
                workspaceTier = 'pro'; // enterprise uses pro tier sync frequency
              } else if (productName.includes('pro') || productName.includes('professional')) {
                planType = 'pro';
                workspaceTier = 'pro';
              } else if (productName.includes('basic')) {
                planType = 'basic';
                workspaceTier = 'basic';
              }
              // Break once we find an active subscription
              break;
            }
          }
        }
      }
    }
    
    return {
      id: workspace.id,
      planType,
      tier: workspaceTier,
    };
  });

  // Log plan distribution
  const planCounts = workspacesWithPlan.reduce((acc, w) => {
    acc[w.planType] = (acc[w.planType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`📊 Plan distribution:`, planCounts);

  // If tier is 'all', return all workspaces
  if (tier === 'all') {
    return workspacesWithPlan.map(w => ({ id: w.id, planType: w.planType }));
  }

  // Filter by requested tier
  const filtered = workspacesWithPlan
    .filter(w => w.tier === tier)
    .map(w => ({ id: w.id, planType: w.planType }));
  
  console.log(`📊 Found ${filtered.length} workspaces for tier: ${tier}`);
  
  return filtered;
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
