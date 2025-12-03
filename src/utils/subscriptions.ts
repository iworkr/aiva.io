/**
 * Subscription utility functions
 * Helper functions to check subscription status and feature permissions
 */

import { SubscriptionData } from "@/payments/AbstractPaymentGateway";
import { toLower } from "lodash";

/**
 * Plan types available in Aiva.io
 */
export type PlanType = "free" | "basic" | "pro" | "enterprise";

/**
 * Feature flags for different plan tiers
 */
export const PLAN_FEATURES = {
  free: {
    // No active subscription
    autoClassify: true,
    basicAI: true,
    aiDrafts: false,
    autoResponses: false,
    advancedSearch: false,
    customPrompts: false,
    unlimitedChannels: false,
    teamWorkspaces: false,
    maxChannels: 1,
    maxMessagesPerMonth: 100,
  },
  basic: {
    // Basic paid plan
    autoClassify: true,
    basicAI: true, // Deep history, linking, calendar functions
    aiDrafts: false, // NOT available
    autoResponses: false, // NOT available
    advancedSearch: false,
    customPrompts: false,
    unlimitedChannels: false,
    teamWorkspaces: false,
    maxChannels: 3,
    maxMessagesPerMonth: 1000,
  },
  pro: {
    // Professional plan
    autoClassify: true,
    basicAI: true,
    aiDrafts: true, // Available
    autoResponses: true, // Available
    advancedSearch: true,
    customPrompts: true,
    unlimitedChannels: true,
    teamWorkspaces: true,
    maxChannels: -1, // Unlimited
    maxMessagesPerMonth: -1, // Unlimited
  },
  enterprise: {
    // Enterprise plan - all features
    autoClassify: true,
    basicAI: true,
    aiDrafts: true,
    autoResponses: true,
    advancedSearch: true,
    customPrompts: true,
    unlimitedChannels: true,
    teamWorkspaces: true,
    maxChannels: -1,
    maxMessagesPerMonth: -1,
  },
} as const;

/**
 * Get the plan type from subscriptions
 */
export function getPlanType(subscriptions: SubscriptionData[]): PlanType {
  if (!subscriptions || subscriptions.length === 0) {
    return "free";
  }

  const activeSubscription = subscriptions.find(
    (sub) => sub.billing_products?.active
  );

  if (!activeSubscription) {
    return "free";
  }

  const planName = toLower(activeSubscription.billing_products?.name || "");

  if (planName.includes("enterprise")) {
    return "enterprise";
  }
  if (planName.includes("professional") || planName.includes("pro")) {
    return "pro";
  }
  if (planName.includes("starter") || planName.includes("basic")) {
    return "basic";
  }

  // Default to basic if has active subscription but name doesn't match
  return "basic";
}

/**
 * Check if a workspace has a Pro subscription
 */
export function hasProSubscription(subscriptions: SubscriptionData[]): boolean {
  const planType = getPlanType(subscriptions);
  return planType === "pro" || planType === "enterprise";
}

/**
 * Check if a workspace has any active subscription
 */
export function hasActiveSubscription(
  subscriptions: SubscriptionData[]
): boolean {
  return subscriptions.some((subscription) => subscription.billing_products?.active);
}

/**
 * Check if a specific feature is available for the plan
 */
export function hasFeature(
  subscriptions: SubscriptionData[],
  feature: keyof (typeof PLAN_FEATURES)["free"]
): boolean {
  const planType = getPlanType(subscriptions);
  const features = PLAN_FEATURES[planType];
  return Boolean(features[feature]);
}

/**
 * Get all features for a plan type
 */
export function getPlanFeatures(planType: PlanType) {
  return PLAN_FEATURES[planType];
}

/**
 * Get display name for plan type
 */
export function getPlanDisplayName(planType: PlanType): string {
  const displayNames: Record<PlanType, string> = {
    free: "Free",
    basic: "Basic",
    pro: "Professional",
    enterprise: "Enterprise",
  };
  return displayNames[planType];
}

/**
 * Plan-based sync frequency limits
 * Controls how often workspaces can sync based on their subscription tier
 */
export const PLAN_SYNC_LIMITS = {
  free: {
    minSyncIntervalMinutes: 60,  // Once per hour
    maxSyncIntervalMinutes: 60,
    webhooksEnabled: false,
    description: "Hourly sync",
  },
  basic: {
    minSyncIntervalMinutes: 30,  // Every 30 mins minimum
    maxSyncIntervalMinutes: 60,
    webhooksEnabled: false,
    description: "Every 30 minutes",
  },
  pro: {
    minSyncIntervalMinutes: 5,   // Every 5 mins minimum
    maxSyncIntervalMinutes: 60,
    webhooksEnabled: true,       // Real-time webhooks
    description: "Every 5 minutes + real-time",
  },
  enterprise: {
    minSyncIntervalMinutes: 1,   // Every 1 min minimum
    maxSyncIntervalMinutes: 60,
    webhooksEnabled: true,
    description: "Real-time",
  },
} as const;

/**
 * Get sync limits for a plan type
 */
export function getPlanSyncLimits(planType: PlanType) {
  return PLAN_SYNC_LIMITS[planType];
}

/**
 * Get available sync frequency options for a plan
 * Returns array of { value, label } for select dropdown
 */
export function getSyncFrequencyOptions(planType: PlanType): Array<{ value: string; label: string; disabled?: boolean }> {
  const limits = PLAN_SYNC_LIMITS[planType];
  const allOptions = [
    { value: "5", label: "Every 5 minutes" },
    { value: "15", label: "Every 15 minutes" },
    { value: "30", label: "Every 30 minutes" },
    { value: "60", label: "Every hour" },
  ];
  
  return allOptions.map(option => ({
    ...option,
    disabled: parseInt(option.value) < limits.minSyncIntervalMinutes,
  }));
}

/**
 * Validate if a sync frequency is allowed for a plan
 */
export function isValidSyncFrequency(planType: PlanType, frequencyMinutes: number): boolean {
  const limits = PLAN_SYNC_LIMITS[planType];
  return frequencyMinutes >= limits.minSyncIntervalMinutes && frequencyMinutes <= limits.maxSyncIntervalMinutes;
}

/**
 * Get the effective sync frequency for a plan (enforces minimum)
 */
export function getEffectiveSyncFrequency(planType: PlanType, requestedFrequency: number): number {
  const limits = PLAN_SYNC_LIMITS[planType];
  return Math.max(requestedFrequency, limits.minSyncIntervalMinutes);
}

