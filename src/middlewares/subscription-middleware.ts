/**
 * Subscription Middleware
 * Checks if the user has an active subscription before allowing access to protected routes
 * 
 * This middleware runs after auth middleware and before dashboard routes
 * It checks if the user has at least one active entitlement
 */

import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "../supabase-clients/user/createSupabaseMiddlewareClient";
import { toSiteURL } from "../utils/helpers";
import { middlewareLogger } from "../utils/logger";
import { dashboardRoutesWithLocale } from "./paths";
import { MiddlewareConfig } from "./types";
import { withMaybeLocale } from "./utils";

// Routes that don't require subscription (billing, settings, etc.)
const SUBSCRIPTION_EXEMPT_PATHS = [
  '/settings/billing',
  '/settings',
  '/billing',
  '/upgrade',
  '/user/settings',
  '/user/notifications',
  '/onboarding',
  '/logout',
];

// Regex to extract workspace slug from URL paths like /workspace/[slug]/...
const WORKSPACE_PATH_REGEX = /\/workspace\/([^\/]+)/;

// Check if path is exempt from subscription check
function isExemptPath(pathname: string): boolean {
  // Remove locale prefix if present
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, '');
  
  return SUBSCRIPTION_EXEMPT_PATHS.some(exemptPath => 
    pathWithoutLocale === exemptPath || 
    pathWithoutLocale.startsWith(exemptPath + '/')
  );
}

export const subscriptionMiddleware: MiddlewareConfig = {
  matcher: dashboardRoutesWithLocale,
  middleware: async (req, maybeUser) => {
    middlewareLogger.log(
      "middleware subscription check",
      req.nextUrl.pathname,
    );

    const res = NextResponse.next();

    // If no user, let auth middleware handle it
    if (!maybeUser) {
      return [res, maybeUser];
    }

    // Check if this path is exempt from subscription check
    if (isExemptPath(req.nextUrl.pathname)) {
      middlewareLogger.log(
        "Path exempt from subscription check",
        req.nextUrl.pathname,
      );
      return [res, maybeUser];
    }

    try {
      const { supabase } = createSupabaseMiddlewareClient(req);

      // Check if user has any active entitlement
      // First, get user's workspaces
      const { data: memberships, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('workspace_member_id', maybeUser.id)
        .limit(10);

      if (membershipError) {
        middlewareLogger.log(
          "Error fetching workspace memberships",
          membershipError.message,
        );
        // Allow access on error to prevent lockout
        return [res, maybeUser];
      }

      if (!memberships || memberships.length === 0) {
        // User has no workspaces, let them continue (they'll need to create one)
        return [res, maybeUser];
      }

      // Check if any workspace has an active entitlement
      const workspaceIds = memberships.map(m => m.workspace_id);
      
      const { data: entitlements, error: entitlementError } = await supabase
        .from('entitlements')
        .select('id, status, current_period_end')
        .in('workspace_id', workspaceIds)
        .in('status', ['active', 'trialing']);

      if (entitlementError) {
        middlewareLogger.log(
          "Error fetching entitlements",
          entitlementError.message,
        );
        // Allow access on error to prevent lockout
        return [res, maybeUser];
      }

      // Check for active entitlements
      const hasActiveEntitlement = entitlements && entitlements.some(e => {
        if (e.status === 'active' || e.status === 'trialing') {
          return true;
        }
        // For canceled, check if still within period
        if (e.current_period_end) {
          const periodEnd = new Date(e.current_period_end);
          return periodEnd > new Date();
        }
        return false;
      });

      // Also check for canceled subscriptions still in their period
      if (!hasActiveEntitlement) {
        const { data: canceledEntitlements } = await supabase
          .from('entitlements')
          .select('id, status, current_period_end')
          .in('workspace_id', workspaceIds)
          .eq('status', 'canceled');

        const hasCanceledButActive = canceledEntitlements && canceledEntitlements.some(e => {
          if (e.current_period_end) {
            const periodEnd = new Date(e.current_period_end);
            return periodEnd > new Date();
          }
          return false;
        });

        if (hasCanceledButActive) {
          return [res, maybeUser];
        }
      }

      // Also check for Shopify store entitlements (linked via shop_domain)
      if (!hasActiveEntitlement) {
        const { data: stores } = await supabase
          .from('shopify_stores')
          .select('shop_domain')
          .in('workspace_id', workspaceIds)
          .eq('is_active', true);

        if (stores && stores.length > 0) {
          const shopDomains = stores.map(s => s.shop_domain).filter(Boolean);
          
          if (shopDomains.length > 0) {
            const { data: shopEntitlements } = await supabase
              .from('entitlements')
              .select('id, status, current_period_end')
              .in('shop_domain', shopDomains)
              .in('status', ['active', 'trialing']);

            if (shopEntitlements && shopEntitlements.length > 0) {
              return [res, maybeUser];
            }
          }
        }
      }

      if (!hasActiveEntitlement) {
        middlewareLogger.log(
          "User has no active subscription, redirecting to billing",
          req.nextUrl.pathname,
        );
        
        // Redirect to billing page
        return [
          NextResponse.redirect(toSiteURL(withMaybeLocale(req, "/settings?tab=billing&reason=subscription_required"))),
          maybeUser,
        ];
      }

      // STRICT WORKSPACE LIMIT CHECK
      // Check if user is accessing a specific workspace and whether they have access
      const pathWithoutLocale = req.nextUrl.pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, '');
      const workspaceMatch = pathWithoutLocale.match(WORKSPACE_PATH_REGEX);
      
      if (workspaceMatch) {
        const requestedWorkspaceSlug = workspaceMatch[1];
        
        // Get user's workspaces with their entitlements, ordered by creation date
        const { data: userWorkspaces, error: workspacesError } = await supabase
          .from('workspace_members')
          .select(`
            workspace_id,
            workspaces!inner (
              id,
              slug,
              created_at
            )
          `)
          .eq('workspace_member_id', maybeUser.id)
          .order('created_at', { ascending: true, referencedTable: 'workspaces' });

        if (!workspacesError && userWorkspaces && userWorkspaces.length > 0) {
          // Find the best plan across user's entitled workspaces
          let maxWorkspaces = 1; // Default to 1

          for (const membership of userWorkspaces) {
            const ws = membership.workspaces as unknown as { id: string; slug: string; created_at: string };
            if (!ws) continue;

            // Check entitlement for this workspace
            const { data: wsEntitlement } = await supabase
              .from('entitlements')
              .select('plan, status, current_period_end')
              .eq('workspace_id', ws.id)
              .in('status', ['active', 'trialing'])
              .single();

            if (wsEntitlement) {
              const planLimits: Record<string, number> = {
                'free': 1,
                'basic': 1,
                'pro': -1, // Unlimited
                'enterprise': -1, // Unlimited
              };
              const planMax = planLimits[wsEntitlement.plan] ?? 1;
              if (planMax === -1) {
                maxWorkspaces = -1;
                break;
              }
              maxWorkspaces = Math.max(maxWorkspaces, planMax);
            }
          }

          // If limited, check if the requested workspace is within the allowed ones
          if (maxWorkspaces !== -1) {
            // Sort workspaces by creation date and get only the allowed ones
            const sortedWorkspaces = userWorkspaces
              .map(m => m.workspaces as unknown as { id: string; slug: string; created_at: string })
              .filter(Boolean)
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const allowedWorkspaces = sortedWorkspaces.slice(0, maxWorkspaces);
            const isAllowed = allowedWorkspaces.some(ws => ws.slug === requestedWorkspaceSlug);

            if (!isAllowed) {
              middlewareLogger.log(
                "User trying to access workspace beyond limit",
                { requestedSlug: requestedWorkspaceSlug, maxWorkspaces, allowedCount: allowedWorkspaces.length },
              );
              
              // Redirect to billing page with upgrade message
              return [
                NextResponse.redirect(toSiteURL(withMaybeLocale(req, "/settings?tab=billing&reason=workspace_limit_exceeded"))),
                maybeUser,
              ];
            }
          }
        }
      }

      return [res, maybeUser];
    } catch (error) {
      middlewareLogger.log(
        "Error in subscription middleware",
        error instanceof Error ? error.message : "Unknown error",
      );
      // Allow access on error to prevent lockout
      return [res, maybeUser];
    }
  },
};
