"use server";
import { authActionClient } from "@/lib/safe-action";
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";
import { canSubscribeViaProvider } from "@/lib/entitlements";
import { z } from "zod";
import { returnValidationErrors } from "next-safe-action";

const createCheckoutSessionSchema = z.object({
  priceId: z.string(),
  workspaceId: z.string(),
});

export const createWorkspaceCheckoutSession = authActionClient
  .schema(createCheckoutSessionSchema)
  .action(async ({ parsedInput: { priceId, workspaceId } }) => {
    // Check for double billing prevention
    // If user has an active Shopify subscription, prevent Stripe checkout
    const canSubscribe = await canSubscribeViaProvider(
      'stripe',
      undefined, // no shop domain for direct Stripe checkout
      workspaceId
    );

    if (!canSubscribe.allowed) {
      returnValidationErrors(createCheckoutSessionSchema, {
        _errors: [
          canSubscribe.reason || 
          `You already have an active subscription via ${canSubscribe.existingProvider}. ` +
          `Please manage your billing through ${canSubscribe.existingProvider === 'shopify' ? 'your Shopify admin' : 'the billing portal'}.`
        ],
      });
    }

    const stripePaymentGateway = new StripePaymentGateway();
    return await stripePaymentGateway.userScope.createGatewayCheckoutSession({
      workspaceId,
      priceId,
    });
  });
