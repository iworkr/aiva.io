import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { T, Typography } from "@/components/ui/Typography";
import { getCachedWorkspaceBySlug } from "@/rsc-data/user/workspaces";
import { Suspense } from "react";
import { CustomerDetailsServer } from "./CustomerDetailsServer";
import { OneTimeProductsServer } from "./OneTimeProductsServer";
import { SubscriptionProductsServer } from "./SubscriptionProductsServer";
import { CreditCard, AlertCircle } from "lucide-react";

export async function WorkspaceBilling({
  workspaceSlug,
  subscriptionRequiredMessage,
}: {
  workspaceSlug: string;
  subscriptionRequiredMessage?: boolean;
}) {
  const workspace = await getCachedWorkspaceBySlug(workspaceSlug);

  return (
    <div className="container mx-auto p-4 space-y-8 max-w-5xl">
      {subscriptionRequiredMessage && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="size-4" />
          <AlertTitle>Subscription required to connect channels</AlertTitle>
          <AlertDescription>
            An active subscription is required to connect Gmail, Outlook, or other channels. Choose a plan below to connect your email and get started.
          </AlertDescription>
        </Alert>
      )}
      <Suspense
        fallback={
          <Card>
            <CardContent>
              <T.Subtle>Loading customer details...</T.Subtle>
            </CardContent>
          </Card>
        }
      >
        <CustomerDetailsServer workspace={workspace} />
      </Suspense>

      <Suspense
        fallback={
          <Card>
            <CardContent>
              <T.Subtle>Loading subscription products...</T.Subtle>
            </CardContent>
          </Card>
        }
      >
        <SubscriptionProductsServer workspace={workspace} />
      </Suspense>

      <Suspense
        fallback={
          <Card>
            <CardContent>
              <T.Subtle>Loading one-time products...</T.Subtle>
            </CardContent>
          </Card>
        }
      >
        <OneTimeProductsServer workspace={workspace} />
      </Suspense>
    </div>
  );
}
