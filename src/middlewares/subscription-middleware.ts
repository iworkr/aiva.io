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
