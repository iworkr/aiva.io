/**
 * Server-side subscription utilities
 * For use in Server Components and Server Actions
 * 
 * Uses the unified entitlements table (supports both Shopify and Stripe)
 * FAIL CLOSED: Denies access on errors for premium features
 */

import { PLAN_FEATURES, PlanType } from "@/utils/subscriptions";
import { 
  requireActiveEntitlement, 
  hasFeatureAccess,
  isEntitlementActive 
} from "@/lib/entitlements-guard";
import { 
  getEntitlementByWorkspaceId,
  getPlanFeaturesFromEntitlement 
} from "@/lib/entitlements";

/**
 * Check if a workspace has Pro subscription (server-side)
 * Uses unified entitlements table
 */
export async function getHasProSubscription(
  workspaceId: string
): Promise<boolean> {
  try {
    const entitlementCheck = await requireActiveEntitlement(workspaceId);
    
    if (!entitlementCheck.isValid) {
      return false;
    }
    
    // Pro or Enterprise counts as "pro subscription"
    const plan = entitlementCheck.planFeatures.plan;
    return plan === "pro" || plan === "enterprise";
  } catch (error) {
    console.error("[Subscriptions] Error checking pro subscription:", error);
    // FAIL CLOSED: Deny pro access on error
    return false;
  }
}

/**
 * Get workspace plan type (server-side)
 * Uses unified entitlements table
 */
export async function getWorkspacePlanType(
  workspaceId: string
): Promise<PlanType> {
  try {
    const entitlement = await getEntitlementByWorkspaceId(workspaceId);
    
    if (!entitlement || !isEntitlementActive(entitlement)) {
      return "free";
    }
    
    return entitlement.plan as PlanType;
  } catch (error) {
    console.error("[Subscriptions] Error getting plan type:", error);
    // FAIL CLOSED: Return free on error
    return "free";
  }
}

/**
 * Check if workspace has a specific feature (server-side)
 * Uses unified entitlements table
 * FAIL CLOSED for premium features
 */
export async function getHasFeature(
  workspaceId: string,
  feature: keyof typeof PLAN_FEATURES.free
): Promise<boolean> {
  try {
    const entitlementCheck = await requireActiveEntitlement(workspaceId);
    
    if (!entitlementCheck.isValid) {
      // No active subscription - only allow basic features
      const basicFeatures: string[] = ["autoClassify", "basicAI"];
      return basicFeatures.includes(feature);
    }
    
    // Check if the plan includes this feature
    const planFeatures = entitlementCheck.planFeatures;
    const featureValue = planFeatures[feature as keyof typeof planFeatures];
    
    return Boolean(featureValue);
  } catch (error) {
    console.error("[Subscriptions] Error checking feature:", error);
    // FAIL CLOSED for premium features, ALLOW for basic features
    const basicFeatures: string[] = ["autoClassify", "basicAI"];
    return basicFeatures.includes(feature);
  }
}

/**
 * Get full plan features for a workspace
 */
export async function getWorkspacePlanFeatures(workspaceId: string) {
  try {
    const entitlement = await getEntitlementByWorkspaceId(workspaceId);
    return getPlanFeaturesFromEntitlement(entitlement);
  } catch (error) {
    console.error("[Subscriptions] Error getting plan features:", error);
    // Return free plan features on error
    return {
      plan: "free" as const,
      ...PLAN_FEATURES.free,
    };
  }
}

/**
 * Check if workspace has an active subscription (any plan)
 */
export async function getHasActiveSubscription(
  workspaceId: string
): Promise<boolean> {
  try {
    const entitlementCheck = await requireActiveEntitlement(workspaceId);
    return entitlementCheck.isValid;
  } catch (error) {
    console.error("[Subscriptions] Error checking active subscription:", error);
    return false;
  }
}
