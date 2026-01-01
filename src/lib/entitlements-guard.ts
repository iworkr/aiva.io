/**
 * Entitlements Guard
 * Unified enforcement layer for subscription/plan status and usage limits
 * Works for both Shopify and Stripe billing providers
 */

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import {
  Entitlement,
  getEntitlementByWorkspaceId,
  getEntitlementByShopDomain,
  getPlanFeaturesFromEntitlement,
  PlanFeatures,
} from './entitlements';
import { PLAN_FEATURES, PlanType } from '@/utils/subscriptions';

// =====================================================
// TYPES
// =====================================================

export interface EntitlementCheckResult {
  isValid: boolean;
  entitlement: Entitlement | null;
  planFeatures: PlanFeatures;
  reason?: string;
}

export interface UsageLimitsResult {
  withinLimits: boolean;
  currentUsage: {
    messages: number;
    aiDrafts: number;
    autoSends: number;
    channels: number;
  };
  limits: {
    maxMessages: number;
    maxChannels: number;
  };
  reason?: string;
}

export interface IncrementUsageResult {
  success: boolean;
  newCount: number;
  limitReached: boolean;
  limit: number;
}

// =====================================================
// ENTITLEMENT VALIDATION
// =====================================================

/**
 * Check if an entitlement is currently active
 */
export function isEntitlementActive(entitlement: Entitlement | null): boolean {
  if (!entitlement) {
    return false;
  }

  // Check status
  if (entitlement.status !== 'active' && entitlement.status !== 'trialing') {
    // For canceled subscriptions, check if still within the current period
    if (entitlement.status === 'canceled' && entitlement.current_period_end) {
      const periodEnd = new Date(entitlement.current_period_end);
      if (periodEnd > new Date()) {
        return true; // Still within the paid period
      }
    }
    return false;
  }

  // For trialing, check if trial hasn't expired
  if (entitlement.status === 'trialing' && entitlement.trial_ends_at) {
    const trialEnd = new Date(entitlement.trial_ends_at);
    if (trialEnd < new Date()) {
      return false; // Trial expired
    }
  }

  return true;
}

/**
 * Require an active entitlement for a workspace
 * This is the main function to check subscription status
 */
export async function requireActiveEntitlement(
  workspaceId: string
): Promise<EntitlementCheckResult> {
  try {
    // First check the unified entitlements table
    const entitlement = await getEntitlementByWorkspaceId(workspaceId);

    if (!entitlement) {
      // No entitlement found - check if there's a linked shop
      const { data: workspace } = await supabaseAdminClient
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .single();

      if (!workspace) {
        return {
          isValid: false,
          entitlement: null,
          planFeatures: { plan: 'free', ...PLAN_FEATURES.free },
          reason: 'Workspace not found',
        };
      }

      // Check if there's a Shopify store linked to this workspace
      const { data: store } = await supabaseAdminClient
        .from('shopify_stores')
        .select('shop_domain')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .single();

      if (store?.shop_domain) {
        // Check entitlement by shop domain
        const shopEntitlement = await getEntitlementByShopDomain(store.shop_domain);
        if (shopEntitlement && isEntitlementActive(shopEntitlement)) {
          return {
            isValid: true,
            entitlement: shopEntitlement,
            planFeatures: getPlanFeaturesFromEntitlement(shopEntitlement),
          };
        }
      }

      return {
        isValid: false,
        entitlement: null,
        planFeatures: { plan: 'free', ...PLAN_FEATURES.free },
        reason: 'No active subscription found',
      };
    }

    // Check if entitlement is active
    if (!isEntitlementActive(entitlement)) {
      let reason = 'Subscription is not active';
      
      if (entitlement.status === 'canceled') {
        if (entitlement.current_period_end) {
          const periodEnd = new Date(entitlement.current_period_end);
          if (periodEnd <= new Date()) {
            reason = 'Subscription has expired';
          } else {
            // Still within the paid period
            return {
              isValid: true,
              entitlement,
              planFeatures: getPlanFeaturesFromEntitlement(entitlement),
            };
          }
        } else {
          reason = 'Subscription has been canceled';
        }
      } else if (entitlement.status === 'past_due') {
        reason = 'Payment is past due';
      } else if (entitlement.status === 'trialing') {
        reason = 'Trial has expired';
      }

      return {
        isValid: false,
        entitlement,
        planFeatures: { plan: 'free', ...PLAN_FEATURES.free },
        reason,
      };
    }

    return {
      isValid: true,
      entitlement,
      planFeatures: getPlanFeaturesFromEntitlement(entitlement),
    };
  } catch (error) {
    console.error('[Entitlements Guard] Error checking entitlement:', error);
    // Fail closed - deny access on error
    return {
      isValid: false,
      entitlement: null,
      planFeatures: { plan: 'free', ...PLAN_FEATURES.free },
      reason: 'Error checking subscription status',
    };
  }
}

/**
 * Require an active entitlement for a Shopify shop
 */
export async function requireActiveEntitlementForShop(
  shopDomain: string
): Promise<EntitlementCheckResult> {
  try {
    const entitlement = await getEntitlementByShopDomain(shopDomain);

    if (!entitlement) {
      return {
        isValid: false,
        entitlement: null,
        planFeatures: { plan: 'free', ...PLAN_FEATURES.free },
        reason: 'No subscription found for this shop',
      };
    }

    if (!isEntitlementActive(entitlement)) {
      return {
        isValid: false,
        entitlement,
        planFeatures: { plan: 'free', ...PLAN_FEATURES.free },
        reason: 'Subscription is not active',
      };
    }

    return {
      isValid: true,
      entitlement,
      planFeatures: getPlanFeaturesFromEntitlement(entitlement),
    };
  } catch (error) {
    console.error('[Entitlements Guard] Error checking shop entitlement:', error);
    return {
      isValid: false,
      entitlement: null,
      planFeatures: { plan: 'free', ...PLAN_FEATURES.free },
      reason: 'Error checking subscription status',
    };
  }
}

// =====================================================
// USAGE LIMITS
// =====================================================

/**
 * Get current usage for a workspace
 */
export async function getCurrentUsage(workspaceId: string): Promise<{
  messages: number;
  aiDrafts: number;
  autoSends: number;
  aiClassifications: number;
}> {
  try {
    // Get current billing period
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data } = await supabaseAdminClient
      .from('workspace_usage')
      .select('messages_synced, ai_drafts_generated, auto_sends_count, ai_classifications')
      .eq('workspace_id', workspaceId)
      .eq('billing_period_start', periodStart.toISOString().split('T')[0])
      .single();

    if (!data) {
      return { messages: 0, aiDrafts: 0, autoSends: 0, aiClassifications: 0 };
    }

    return {
      messages: data.messages_synced || 0,
      aiDrafts: data.ai_drafts_generated || 0,
      autoSends: data.auto_sends_count || 0,
      aiClassifications: data.ai_classifications || 0,
    };
  } catch (error) {
    console.error('[Entitlements Guard] Error getting current usage:', error);
    return { messages: 0, aiDrafts: 0, autoSends: 0, aiClassifications: 0 };
  }
}

/**
 * Get channel count for a workspace
 */
export async function getChannelCount(workspaceId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdminClient
      .from('channel_connections')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    if (error) {
      console.error('[Entitlements Guard] Error getting channel count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[Entitlements Guard] Error getting channel count:', error);
    return 0;
  }
}

/**
 * Check if workspace is within usage limits
 */
export async function checkUsageLimits(workspaceId: string): Promise<UsageLimitsResult> {
  try {
    // Get entitlement and plan features
    const entitlementCheck = await requireActiveEntitlement(workspaceId);
    const planFeatures = entitlementCheck.planFeatures;

    // Get current usage
    const currentUsage = await getCurrentUsage(workspaceId);
    const channelCount = await getChannelCount(workspaceId);

    // Check limits
    const messageLimit = planFeatures.maxMessagesPerMonth;
    const channelLimit = planFeatures.maxChannels;

    const messagesWithinLimit = messageLimit === -1 || currentUsage.messages < messageLimit;
    const channelsWithinLimit = channelLimit === -1 || channelCount < channelLimit;

    const withinLimits = messagesWithinLimit && channelsWithinLimit;

    let reason: string | undefined;
    if (!messagesWithinLimit) {
      reason = `Message limit reached (${currentUsage.messages}/${messageLimit})`;
    } else if (!channelsWithinLimit) {
      reason = `Channel limit reached (${channelCount}/${channelLimit})`;
    }

    return {
      withinLimits,
      currentUsage: {
        messages: currentUsage.messages,
        aiDrafts: currentUsage.aiDrafts,
        autoSends: currentUsage.autoSends,
        channels: channelCount,
      },
      limits: {
        maxMessages: messageLimit,
        maxChannels: channelLimit,
      },
      reason,
    };
  } catch (error) {
    console.error('[Entitlements Guard] Error checking usage limits:', error);
    // Fail closed - assume limit reached on error
    return {
      withinLimits: false,
      currentUsage: { messages: 0, aiDrafts: 0, autoSends: 0, channels: 0 },
      limits: { maxMessages: 0, maxChannels: 0 },
      reason: 'Error checking usage limits',
    };
  }
}

/**
 * Check if a specific usage type is within limits
 */
export async function isWithinUsageLimit(
  workspaceId: string,
  usageType: 'messages' | 'channels'
): Promise<{ withinLimit: boolean; current: number; limit: number }> {
  const entitlementCheck = await requireActiveEntitlement(workspaceId);
  const planFeatures = entitlementCheck.planFeatures;

  if (usageType === 'messages') {
    const usage = await getCurrentUsage(workspaceId);
    const limit = planFeatures.maxMessagesPerMonth;
    return {
      withinLimit: limit === -1 || usage.messages < limit,
      current: usage.messages,
      limit,
    };
  } else if (usageType === 'channels') {
    const count = await getChannelCount(workspaceId);
    const limit = planFeatures.maxChannels;
    return {
      withinLimit: limit === -1 || count < limit,
      current: count,
      limit,
    };
  }

  return { withinLimit: true, current: 0, limit: -1 };
}

/**
 * Increment usage counter and check if still within limits
 */
export async function incrementUsage(
  workspaceId: string,
  usageType: 'messages' | 'ai_drafts' | 'auto_sends' | 'ai_classifications',
  amount: number = 1
): Promise<IncrementUsageResult> {
  try {
    // Get plan limits first
    const entitlementCheck = await requireActiveEntitlement(workspaceId);
    const planFeatures = entitlementCheck.planFeatures;

    // Map usage type to limit
    let limit = -1;
    if (usageType === 'messages') {
      limit = planFeatures.maxMessagesPerMonth;
    }
    // AI drafts and auto sends don't have specific limits in the current plan

    // Use the database function to increment atomically
    const { data, error } = await supabaseAdminClient.rpc('increment_usage', {
      p_workspace_id: workspaceId,
      p_usage_type: usageType,
      p_amount: amount,
    });

    if (error) {
      console.error('[Entitlements Guard] Error incrementing usage:', error);
      return {
        success: false,
        newCount: 0,
        limitReached: true,
        limit,
      };
    }

    const newCount = data || 0;
    const limitReached = limit !== -1 && newCount >= limit;

    return {
      success: true,
      newCount,
      limitReached,
      limit,
    };
  } catch (error) {
    console.error('[Entitlements Guard] Error incrementing usage:', error);
    return {
      success: false,
      newCount: 0,
      limitReached: true,
      limit: 0,
    };
  }
}

/**
 * Check if a specific feature is available for the workspace
 */
export async function hasFeatureAccess(
  workspaceId: string,
  feature: keyof typeof PLAN_FEATURES.free
): Promise<boolean> {
  try {
    const entitlementCheck = await requireActiveEntitlement(workspaceId);
    
    // If no active entitlement, only allow basic features
    if (!entitlementCheck.isValid) {
      return false;
    }

    return Boolean(entitlementCheck.planFeatures[feature as keyof PlanFeatures]);
  } catch (error) {
    console.error('[Entitlements Guard] Error checking feature access:', error);
    // Fail closed for premium features
    const basicFeatures = ['autoClassify', 'basicAI'];
    return basicFeatures.includes(feature);
  }
}

/**
 * Get full entitlement status for a workspace (for UI display)
 */
export async function getEntitlementStatus(workspaceId: string): Promise<{
  hasActiveSubscription: boolean;
  plan: PlanType;
  status: string;
  provider: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  usage: {
    messages: { current: number; limit: number };
    channels: { current: number; limit: number };
  };
}> {
  const entitlementCheck = await requireActiveEntitlement(workspaceId);
  const usageLimits = await checkUsageLimits(workspaceId);

  return {
    hasActiveSubscription: entitlementCheck.isValid,
    plan: entitlementCheck.planFeatures.plan as PlanType,
    status: entitlementCheck.entitlement?.status || 'none',
    provider: entitlementCheck.entitlement?.provider || null,
    currentPeriodEnd: entitlementCheck.entitlement?.current_period_end || null,
    trialEndsAt: entitlementCheck.entitlement?.trial_ends_at || null,
    usage: {
      messages: {
        current: usageLimits.currentUsage.messages,
        limit: usageLimits.limits.maxMessages,
      },
      channels: {
        current: usageLimits.currentUsage.channels,
        limit: usageLimits.limits.maxChannels,
      },
    },
  };
}
