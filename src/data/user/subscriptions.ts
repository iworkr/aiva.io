/**
 * Subscription Server Actions
 * Handles subscription checks for client components
 */

'use server';

import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import {
  getHasProSubscription,
  getWorkspacePlanType,
  getHasFeature,
} from '@/rsc-data/user/subscriptions';
import { PlanType } from '@/utils/subscriptions';

// ============================================================================
// SCHEMAS
// ============================================================================

const checkFeatureSchema = z.object({
  workspaceId: z.string().uuid(),
  feature: z.string(),
});

const checkPlanSchema = z.object({
  workspaceId: z.string().uuid(),
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Check if workspace has Pro subscription
 * Safe to call from client components
 */
export const checkProSubscriptionAction = authActionClient
  .schema(checkPlanSchema)
  .action(async ({ parsedInput }) => {
    const { workspaceId } = parsedInput;
    const hasPro = await getHasProSubscription(workspaceId);
    return { hasPro };
  });

/**
 * Get workspace plan type
 * Safe to call from client components
 */
export const getWorkspacePlanAction = authActionClient
  .schema(checkPlanSchema)
  .action(async ({ parsedInput }) => {
    const { workspaceId } = parsedInput;
    const planType = await getWorkspacePlanType(workspaceId);
    return { planType };
  });

/**
 * Check if workspace has a specific feature
 * Safe to call from client components
 */
export const checkFeatureAccessAction = authActionClient
  .schema(checkFeatureSchema)
  .action(async ({ parsedInput }) => {
    const { workspaceId, feature } = parsedInput;
    const hasAccess = await getHasFeature(workspaceId, feature as any);
    return { hasAccess };
  });

// ============================================================================
// NON-ACTION UTILITIES (for server components)
// ============================================================================

/**
 * Get workspace subscription info
 * For use in server components only
 */
export async function getWorkspaceSubscriptionInfo(workspaceId: string): Promise<{
  planType: PlanType;
  hasPro: boolean;
}> {
  const [planType, hasPro] = await Promise.all([
    getWorkspacePlanType(workspaceId),
    getHasProSubscription(workspaceId),
  ]);

  return { planType, hasPro };
}

