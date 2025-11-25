import { Card, CardContent } from "@/components/ui/card";
import { T, Typography } from "@/components/ui/Typography";
import { getCachedWorkspaceBySlug } from "@/rsc-data/user/workspaces";
import { Suspense } from "react";
import { CustomerDetailsServer } from "./CustomerDetailsServer";
import { OneTimeProductsServer } from "./OneTimeProductsServer";
import { SubscriptionProductsServer } from "./SubscriptionProductsServer";

export async function WorkspaceBilling({
  workspaceSlug,
}: {
  workspaceSlug: string;
}) {
  const workspace = await getCachedWorkspaceBySlug(workspaceSlug);

  return (
    <div className="container mx-auto p-4 space-y-8 max-w-5xl">
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
