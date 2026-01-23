/**
 * Entitlements Service
 * Single source of truth for subscription/plan status across Shopify and Stripe
 */

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { PLAN_FEATURES, PlanType } from '@/utils/subscriptions';
import { getPlanFromSubscriptionName } from './shopify/billing';

// =====================================================
// TYPES
// =====================================================

export type EntitlementProvider = 'shopify' | 'stripe';
export type EntitlementStatus = 'active' | 'trialing' | 'past_due' | 'canceled';
export type EntitlementPlan = 'free' | 'basic' | 'pro' | 'enterprise';

export interface Entitlement {
  id: string;
  shop_domain: string | null;
  workspace_id: string | null;
  plan: EntitlementPlan;
  provider: EntitlementProvider;
  status: EntitlementStatus;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EntitlementUpdate {
  shop_domain?: string;
  workspace_id?: string;
  plan: EntitlementPlan;
  provider: EntitlementProvider;
  status: EntitlementStatus;
  provider_subscription_id?: string;
  current_period_end?: string;
  trial_ends_at?: string;
  metadata?: Record<string, unknown>;
}

export interface PlanFeatures {
  plan: EntitlementPlan;
  // Feature flags
  autoClassify: boolean;
  basicAI: boolean;
  aiDrafts: boolean;
  autoResponses: boolean;
  advancedSearch: boolean;
  customPrompts: boolean;
  unlimitedChannels: boolean;
  teamWorkspaces: boolean;
  voiceChat: boolean;
  schedulingAssistant: boolean;
  ssoEnabled: boolean;
  apiAccess: boolean;
  // Numeric limits (-1 = unlimited)
  maxChannels: number;
  maxMessagesPerMonth: number;
  maxWorkspaces: number;
  maxTeamMembers: number;
}

// =====================================================
// ENTITLEMENT CRUD OPERATIONS
// =====================================================

/**
 * Get entitlement by shop domain (for Shopify merchants)
 */
export async function getEntitlementByShopDomain(shopDomain: string): Promise<Entitlement | null> {
  const { data, error } = await supabaseAdminClient
    .from('entitlements')
    .select('*')
    .eq('shop_domain', shopDomain)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[Entitlements] Error fetching by shop domain:', error);
    throw new Error('Failed to fetch entitlement');
  }

  return data as Entitlement;
}

/**
 * Get entitlement by workspace ID (for all merchants)
 */
export async function getEntitlementByWorkspaceId(workspaceId: string): Promise<Entitlement | null> {
  const { data, error } = await supabaseAdminClient
    .from('entitlements')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[Entitlements] Error fetching by workspace ID:', error);
    throw new Error('Failed to fetch entitlement');
  }

  return data as Entitlement;
}

/**
 * Get entitlement by provider subscription ID
 */
export async function getEntitlementBySubscriptionId(
  provider: EntitlementProvider,
  subscriptionId: string
): Promise<Entitlement | null> {
  const { data, error } = await supabaseAdminClient
    .from('entitlements')
    .select('*')
    .eq('provider', provider)
    .eq('provider_subscription_id', subscriptionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Entitlements] Error fetching by subscription ID:', error);
    throw new Error('Failed to fetch entitlement');
  }

  return data as Entitlement;
}

/**
 * Create or update an entitlement
 */
export async function upsertEntitlement(data: EntitlementUpdate): Promise<Entitlement> {
  // Determine the conflict column based on what's provided
  const conflictColumn = data.shop_domain ? 'shop_domain' : 'workspace_id';
  
  const { data: result, error } = await supabaseAdminClient
    .from('entitlements')
    .upsert(
      {
        shop_domain: data.shop_domain || null,
        workspace_id: data.workspace_id || null,
        plan: data.plan,
        provider: data.provider,
        status: data.status,
        provider_subscription_id: data.provider_subscription_id || null,
        current_period_end: data.current_period_end || null,
        trial_ends_at: data.trial_ends_at || null,
        metadata: (data.metadata || {}) as unknown as Record<string, never>,
      },
      {
        onConflict: conflictColumn,
      }
    )
    .select('*')
    .single();

  if (error) {
    console.error('[Entitlements] Error upserting entitlement:', error);
    throw new Error('Failed to upsert entitlement');
  }

  console.log('[Entitlements] Upserted entitlement:', {
    id: result.id,
    shop_domain: result.shop_domain,
    workspace_id: result.workspace_id,
    plan: result.plan,
    provider: result.provider,
    status: result.status,
  });

  return result as Entitlement;
}

/**
 * Update entitlement status
 */
export async function updateEntitlementStatus(
  entitlementId: string,
  status: EntitlementStatus,
  additionalData?: Partial<EntitlementUpdate>
): Promise<Entitlement> {
  const updateData: Record<string, unknown> = {
    status,
    ...additionalData,
  };

  const { data, error } = await supabaseAdminClient
    .from('entitlements')
    .update(updateData)
    .eq('id', entitlementId)
    .select('*')
    .single();

  if (error) {
    console.error('[Entitlements] Error updating entitlement status:', error);
    throw new Error('Failed to update entitlement status');
  }

  return data as Entitlement;
}

/**
 * Link a shop domain entitlement to a workspace
 */
export async function linkEntitlementToWorkspace(
  shopDomain: string,
  workspaceId: string
): Promise<Entitlement | null> {
  const entitlement = await getEntitlementByShopDomain(shopDomain);
  
  if (!entitlement) {
    return null;
  }

  const { data, error } = await supabaseAdminClient
    .from('entitlements')
    .update({ workspace_id: workspaceId })
    .eq('id', entitlement.id)
    .select('*')
    .single();

  if (error) {
    console.error('[Entitlements] Error linking entitlement to workspace:', error);
    throw new Error('Failed to link entitlement to workspace');
  }

  return data as Entitlement;
}

/**
 * Cancel an entitlement (set status to canceled)
 */
export async function cancelEntitlement(
  shopDomain?: string,
  workspaceId?: string
): Promise<Entitlement | null> {
  let query = supabaseAdminClient
    .from('entitlements')
    .update({ status: 'canceled' as EntitlementStatus });

  if (shopDomain) {
    query = query.eq('shop_domain', shopDomain);
  } else if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  } else {
    throw new Error('Either shop_domain or workspace_id must be provided');
  }

  const { data, error } = await query.select('*').single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Entitlements] Error canceling entitlement:', error);
    throw new Error('Failed to cancel entitlement');
  }

  return data as Entitlement;
}

// =====================================================
// PLAN/FEATURE LOOKUPS
// =====================================================

/**
 * Get plan features for a shop domain
 */
export async function getPlanFeaturesForShop(shopDomain: string): Promise<PlanFeatures> {
  const entitlement = await getEntitlementByShopDomain(shopDomain);
  return getPlanFeaturesFromEntitlement(entitlement);
}

/**
 * Get plan features for a workspace
 */
export async function getPlanFeaturesForWorkspace(workspaceId: string): Promise<PlanFeatures> {
  const entitlement = await getEntitlementByWorkspaceId(workspaceId);
  return getPlanFeaturesFromEntitlement(entitlement);
}

/**
 * Get plan features from an entitlement
 */
export function getPlanFeaturesFromEntitlement(entitlement: Entitlement | null): PlanFeatures {
  // Default to free if no entitlement or not active
  if (!entitlement || (entitlement.status !== 'active' && entitlement.status !== 'trialing')) {
    return {
      plan: 'free',
      ...PLAN_FEATURES.free,
    };
  }

  const plan = entitlement.plan as PlanType;
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  return {
    plan: entitlement.plan,
    ...features,
  };
}

/**
 * Check if a shop has an active entitlement
 */
export async function hasActiveEntitlement(shopDomain: string): Promise<boolean> {
  const entitlement = await getEntitlementByShopDomain(shopDomain);
  return entitlement !== null && 
    (entitlement.status === 'active' || entitlement.status === 'trialing');
}

/**
 * Check if a workspace has an active entitlement
 */
export async function workspaceHasActiveEntitlement(workspaceId: string): Promise<boolean> {
  const entitlement = await getEntitlementByWorkspaceId(workspaceId);
  return entitlement !== null && 
    (entitlement.status === 'active' || entitlement.status === 'trialing');
}

// =====================================================
// SHOPIFY-SPECIFIC FUNCTIONS
// =====================================================

/**
 * Create or update entitlement from Shopify subscription data
 */
export async function syncShopifySubscriptionToEntitlement(
  shopDomain: string,
  subscription: {
    id: string;
    name: string;
    status: string;
    currentPeriodEnd?: string;
    trialDays?: number;
    test?: boolean;
  }
): Promise<Entitlement> {
  // Determine the plan from subscription name
  const plan = getPlanFromSubscriptionName(subscription.name) || 'basic';
  
  // Map Shopify status to our status
  let status: EntitlementStatus = 'canceled';
  switch (subscription.status.toUpperCase()) {
    case 'ACTIVE':
      status = 'active';
      break;
    case 'PENDING':
      status = 'trialing'; // Pending usually means in trial
      break;
    case 'FROZEN':
      status = 'past_due';
      break;
    case 'CANCELLED':
    case 'DECLINED':
    case 'EXPIRED':
      status = 'canceled';
      break;
  }

  // Calculate trial end date if applicable
  let trialEndsAt: string | undefined;
  if (subscription.trialDays && subscription.trialDays > 0) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + subscription.trialDays);
    trialEndsAt = trialEnd.toISOString();
  }

  // Try to find workspace_id for this shop
  let workspaceId: string | undefined;
  try {
    const { data: shop } = await supabaseAdminClient
      .from('shopify_stores')
      .select('workspace_id')
      .eq('shop_domain', shopDomain)
      .eq('is_active', true)
      .single();
    
    if (shop?.workspace_id) {
      workspaceId = shop.workspace_id;
      console.log(`[Entitlements] Found workspace ${workspaceId} for shop ${shopDomain}`);
    }
  } catch (error) {
    // Shop might not be linked yet - that's okay
    console.log(`[Entitlements] No workspace found for shop ${shopDomain} (will be linked when shop is connected)`);
  }

  const entitlement = await upsertEntitlement({
    shop_domain: shopDomain,
    workspace_id: workspaceId,
    plan,
    provider: 'shopify',
    status,
    provider_subscription_id: subscription.id,
    current_period_end: subscription.currentPeriodEnd,
    trial_ends_at: trialEndsAt,
    metadata: {
      subscription_name: subscription.name,
      is_test: subscription.test || false,
    },
  });

  return entitlement;
}

// =====================================================
// BILLING EVENTS LOGGING
// =====================================================

/**
 * Log a billing event for audit purposes
 */
export async function logBillingEvent(
  eventType: string,
  provider: EntitlementProvider,
  payload: Record<string, unknown>,
  options?: {
    shopDomain?: string;
    workspaceId?: string;
    entitlementId?: string;
    idempotencyKey?: string;
  }
): Promise<void> {
  const { error } = await supabaseAdminClient
    .from('billing_events')
    .insert({
      event_type: eventType,
      provider,
      shop_domain: options?.shopDomain || null,
      workspace_id: options?.workspaceId || null,
      entitlement_id: options?.entitlementId || null,
      payload: payload as unknown as Record<string, never>,
      idempotency_key: options?.idempotencyKey || null,
    });

  if (error) {
    // Don't throw - logging failures shouldn't break the main flow
    console.error('[Entitlements] Failed to log billing event:', error);
  }
}

/**
 * Check if a billing event has already been processed (for idempotency)
 */
export async function hasBillingEventBeenProcessed(idempotencyKey: string): Promise<boolean> {
  const { data, error } = await supabaseAdminClient
    .from('billing_events')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return false;
    }
    console.error('[Entitlements] Error checking billing event:', error);
    return false; // Assume not processed on error to allow retry
  }

  return data !== null;
}

// =====================================================
// DOUBLE-BILLING PREVENTION
// =====================================================

/**
 * Check if a shop/workspace can subscribe via a given provider
 * Returns false if they already have an active subscription via the other provider
 */
export async function canSubscribeViaProvider(
  provider: EntitlementProvider,
  shopDomain?: string,
  workspaceId?: string
): Promise<{ allowed: boolean; reason?: string; existingProvider?: EntitlementProvider }> {
  let entitlement: Entitlement | null = null;

  if (shopDomain) {
    entitlement = await getEntitlementByShopDomain(shopDomain);
  }
  
  if (!entitlement && workspaceId) {
    entitlement = await getEntitlementByWorkspaceId(workspaceId);
  }

  // No existing entitlement - can subscribe via any provider
  if (!entitlement) {
    return { allowed: true };
  }

  // If canceled, can subscribe via any provider
  if (entitlement.status === 'canceled') {
    return { allowed: true };
  }

  // If active via different provider, cannot subscribe
  if (entitlement.provider !== provider && 
      (entitlement.status === 'active' || entitlement.status === 'trialing')) {
    return {
      allowed: false,
      reason: `Already subscribed via ${entitlement.provider}`,
      existingProvider: entitlement.provider,
    };
  }

  // Same provider or no conflict
  return { allowed: true };
}
