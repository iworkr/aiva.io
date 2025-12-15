import {
  InvoiceData,
  OneTimePaymentData,
  SubscriptionData,
} from "@/payments/AbstractPaymentGateway";
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";
import { WorkspaceWithMembershipType } from "@/types";
import { CustomerDetailsClient } from "./CustomerDetailsClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

async function getInvoices(workspaceId: string): Promise<InvoiceData[]> {
  try {
    const stripePaymentGateway = new StripePaymentGateway();
    const invoices =
      await stripePaymentGateway.userScope.getWorkspaceDatabaseInvoices(
        workspaceId,
      );
    return invoices.data;
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return [];
  }
}

async function getOneTimePurchases(
  workspaceId: string,
): Promise<OneTimePaymentData[]> {
  try {
    const stripePaymentGateway = new StripePaymentGateway();
    return await stripePaymentGateway.userScope.getWorkspaceDatabaseOneTimePurchases(
      workspaceId,
    );
  } catch (error) {
    console.error("Failed to fetch one-time purchases:", error);
    return [];
  }
}

async function getSubscriptions(
  workspaceId: string,
): Promise<SubscriptionData[]> {
  try {
    const stripePaymentGateway = new StripePaymentGateway();
    return await stripePaymentGateway.userScope.getWorkspaceDatabaseSubscriptions(
      workspaceId,
    );
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return [];
  }
}

export async function CustomerDetailsServer({
  workspace,
}: {
  workspace: WorkspaceWithMembershipType;
}) {
  try {
    const stripePaymentGateway = new StripePaymentGateway();
    await stripePaymentGateway.userScope.getWorkspaceDatabaseCustomer(
      workspace.id,
    );

    const [invoices, oneTimePurchases, subscriptions] = await Promise.all([
      getInvoices(workspace.id),
      getOneTimePurchases(workspace.id),
      getSubscriptions(workspace.id),
    ]);

    return (
      <CustomerDetailsClient
        invoices={invoices}
        oneTimePurchases={oneTimePurchases}
        subscriptions={subscriptions}
      />
    );
  } catch (error) {
    console.error("Billing error:", error);
    // Show user-friendly error message instead of crashing
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Billing Information
          </CardTitle>
          <CardDescription>
            Unable to load billing information at this time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We're having trouble loading your billing information. Please try again later or contact support if the issue persists.
          </p>
        </CardContent>
      </Card>
    );
  }
}
