import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";
import { WorkspaceWithMembershipType } from "@/types";
import { AlertCircle } from "lucide-react";
import { OneTimeProductsClient } from "./OneTimeProductsClient";

export async function OneTimeProductsServer({
  workspace,
}: {
  workspace: WorkspaceWithMembershipType;
}) {
  try {
    const stripePaymentGateway = new StripePaymentGateway();
    const productWithPriceListGroup =
      await stripePaymentGateway.anonScope.listAllOneTimeProducts();

    return (
      <OneTimeProductsClient
        products={productWithPriceListGroup}
        workspaceId={workspace.id}
      />
    );
  } catch (error) {
    console.error("OneTimeProductsServer error:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            One-time purchases
          </CardTitle>
          <CardDescription>
            Unable to load one-time products right now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please try again in a moment. If the problem continues, contact support.
          </p>
        </CardContent>
      </Card>
    );
  }
}
