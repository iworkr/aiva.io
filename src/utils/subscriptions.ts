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

