/**
 * Server-side subscription utilities
 * For use in Server Components and Server Actions
 */

import { SubscriptionData } from "@/payments/AbstractPaymentGateway";
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";
import {
  hasProSubscription,
  getPlanType,
  hasFeature,
  PlanType,
} from "@/utils/subscriptions";

/**
 * Check if a workspace has Pro subscription (server-side)
 */
export async function getHasProSubscription(
  workspaceId: string
): Promise<boolean> {
  try {
    // Only check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      // If Stripe not configured, allow access (for development)
      return true;
    }

    const paymentGateway = new StripePaymentGateway();
    const subscriptions =
      await paymentGateway.db.getSubscriptionsByWorkspaceId(workspaceId);
    return hasProSubscription(subscriptions);
  } catch (error) {
    console.error("Error checking subscription:", error);
    // On error, allow access (fail open)
    return true;
  }
}

/**
 * Get workspace plan type (server-side)
 */
export async function getWorkspacePlanType(
  workspaceId: string
): Promise<PlanType> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      // Development mode - return pro for testing
      return "pro";
    }

    const paymentGateway = new StripePaymentGateway();
    const subscriptions =
      await paymentGateway.db.getSubscriptionsByWorkspaceId(workspaceId);
    return getPlanType(subscriptions);
  } catch (error) {
    console.error("Error getting plan type:", error);
    return "free";
  }
}

/**
 * Check if workspace has a specific feature (server-side)
 */
export async function getHasFeature(
  workspaceId: string,
  feature: Parameters<typeof hasFeature>[1]
): Promise<boolean> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      // Development mode - allow all features
      return true;
    }

    const paymentGateway = new StripePaymentGateway();
    const subscriptions =
      await paymentGateway.db.getSubscriptionsByWorkspaceId(workspaceId);
    return hasFeature(subscriptions, feature);
  } catch (error) {
    console.error("Error checking feature:", error);
    // Fail open for basic features, closed for premium features
    const basicFeatures = ["autoClassify", "basicAI"];
    return basicFeatures.includes(feature);
  }
}

