/**
 * ProFeatureGateServer Component
 * Server component wrapper for Pro-restricted pages/features
 */

import { getHasProSubscription } from "@/rsc-data/user/subscriptions";
import { getCachedSoloWorkspace } from "@/rsc-data/user/workspaces";
import { getWorkspaceSubPath } from "@/utils/workspaces";
import { ProFeatureGateDialog } from "./ProFeatureGateDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Link } from "./intl-link";
import { Lock } from "lucide-react";

interface ProFeatureGateServerProps {
  workspaceId: string;
  children: React.ReactNode;
  featureName?: string;
  featureDescription?: string;
}

export async function ProFeatureGateServer({
  workspaceId,
  children,
  featureName = "This feature",
  featureDescription = "This feature is available for Pro subscribers.",
}: ProFeatureGateServerProps) {
  const hasPro = await getHasProSubscription(workspaceId);
  const workspace = await getCachedSoloWorkspace();

  if (hasPro) {
    return <>{children}</>;
  }

  // Show upgrade prompt for free users
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Pro Feature</CardTitle>
          </div>
          <CardDescription>
            {featureName} {featureDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Link
              href={getWorkspaceSubPath(workspace, "/settings/billing")}
              className="w-full"
            >
              <Button className="w-full">Upgrade to Pro</Button>
            </Link>
            <Link
              href={getWorkspaceSubPath(workspace, "/home")}
              className="w-full"
            >
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

