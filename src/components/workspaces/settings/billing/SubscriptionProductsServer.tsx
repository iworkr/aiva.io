import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";
import { WorkspaceWithMembershipType } from "@/types";
import { AlertCircle } from "lucide-react";
import { SubscriptionProductsClient } from "./SubscriptionProductsClient";

export async function SubscriptionProductsServer({
  workspace,
}: {
  workspace: WorkspaceWithMembershipType;
}) {
  try {
    const stripePaymentGateway = new StripePaymentGateway();
    const productWithPriceListGroup =
      await stripePaymentGateway.anonScope.listAllSubscriptionProducts();

    return (
      <SubscriptionProductsClient
        monthlyProducts={productWithPriceListGroup["month"] ?? []}
        yearlyProducts={productWithPriceListGroup["year"] ?? []}
        workspaceId={workspace.id}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("SubscriptionProductsServer error:", message, error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Subscription plans
          </CardTitle>
          <CardDescription>
            Unable to load subscription plans right now
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
