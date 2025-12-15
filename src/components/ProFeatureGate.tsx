/**
 * ProFeatureGate Component
 * Wraps Pro-restricted features and shows upgrade dialog for free users
 */

"use client";

import { useState, useEffect, type ReactNode } from "react";
import { ProFeatureGateDialog } from "./ProFeatureGateDialog";
import { SlimWorkspace } from "@/types";
import { checkProSubscriptionAction } from "@/data/user/subscriptions";

interface ProFeatureGateProps {
  workspace: SlimWorkspace;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProFeatureGate({
  workspace,
  children,
  fallback,
}: ProFeatureGateProps) {
  const [hasPro, setHasPro] = useState<boolean | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      setLoading(true);
      try {
        // Only check if Stripe is configured
        if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          const result = await checkProSubscriptionAction({
            workspaceId: workspace.id,
          });
          setHasPro(result?.data?.hasPro ?? true);
        } else {
          // If Stripe not configured, allow access (for development)
          setHasPro(true);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        // On error, allow access (fail open)
        setHasPro(true);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [workspace.id]);

  // Show loading state
  if (loading) {
    return <>{fallback || <div>Loading...</div>}</>;
  }

  // If user has Pro, show the feature
  if (hasPro) {
    return <>{children}</>;
  }

  // If user doesn't have Pro, intercept clicks and show upgrade dialog
  return (
    <>
      <div onClick={() => setShowDialog(true)} className="cursor-pointer">
        {fallback || children}
      </div>
      <ProFeatureGateDialog
        workspace={workspace}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </>
  );
}

/**
 * Hook to check if workspace has Pro subscription
 */
export function useProSubscription(workspaceId: string) {
  const [hasPro, setHasPro] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      setLoading(true);
      try {
        if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          const result = await checkProSubscriptionAction({ workspaceId });
          setHasPro(result?.data?.hasPro ?? true);
        } else {
          setHasPro(true);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        setHasPro(true);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [workspaceId]);

  return { hasPro, loading };
}

/**
 * Hook to check if workspace has a specific feature
 */
export function useFeatureAccess(workspaceId: string, feature: string) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFeature = async () => {
      setLoading(true);
      try {
        if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          const { checkFeatureAccessAction } = await import("@/data/user/subscriptions");
          const result = await checkFeatureAccessAction({ workspaceId, feature });
          setHasAccess(result?.data?.hasAccess ?? false);
        } else {
          // Development mode - allow all features
          setHasAccess(true);
        }
      } catch (error) {
        console.error("Error checking feature access:", error);
        // Fail open for basic features
        const basicFeatures = ["autoClassify", "basicAI"];
        setHasAccess(basicFeatures.includes(feature));
      } finally {
        setLoading(false);
      }
    };

    checkFeature();
  }, [workspaceId, feature]);

  return { hasAccess, loading };
}

