# Billing & Subscriptions

Complete guide to billing and subscription management in Nextbase Ultimate.

## Overview

Nextbase includes a comprehensive billing system integrated with Stripe, supporting subscriptions, one-time payments, invoices, and usage tracking. The system is designed to be extensible to support multiple payment gateways.

## Architecture

### Payment Gateway Abstraction

The billing system uses an abstraction layer (`PaymentGateway` interface) allowing multiple payment providers:

- **Stripe**: Currently implemented
- **LemonSqueezy**: Can be added
- **Custom Gateways**: Extensible architecture

### Core Tables

- **`billing_products`**: Product catalog
- **`billing_prices`**: Pricing tiers
- **`billing_customers`**: Workspace-customer mapping
- **`billing_subscriptions`**: Active subscriptions
- **`billing_invoices`**: Invoice history
- **`billing_one_time_payments`**: One-time charges
- **`billing_payment_methods`**: Payment methods
- **`billing_usage_logs`**: Usage tracking

## Stripe Integration

### Configuration

**Environment Variables**:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Webhook Setup

**Webhook Route**:
```typescript
// src/app/api/stripe/webhooks/route.ts
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  
  const gateway = new StripePaymentGateway();
  await gateway.gateway.handleGatewayWebhook(Buffer.from(body), sig);
  
  return Response.json({ received: true });
}
```

**Webhook Events Handled**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_method.attached`

## Products & Prices

### Creating Products

Products are typically created in Stripe Dashboard and synced:

```typescript
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";

const gateway = new StripePaymentGateway();

// Create product in Stripe
const product = await gateway.gateway.createProduct({
  name: "Pro Plan",
  description: "Professional features"
});

// Sync to database (via webhook or manual)
```

### Creating Prices

```typescript
// Create price in Stripe
const price = await gateway.gateway.createPrice({
  productId: product.id,
  amount: 2900, // $29.00 in cents
  currency: "usd",
  recurring: {
    interval: "month"
  }
});
```

### Getting Products & Prices

```typescript
import { getBillingProducts } from "@/data/user/billing";

const products = await getBillingProducts();
// Returns products with prices
```

## Customers

### Creating Customers

Customers are created automatically when needed:

```typescript
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";

const gateway = new StripePaymentGateway();
const customer = await gateway.util.createCustomerForWorkspace(workspaceId);
```

**What Happens**:
1. Customer created in Stripe
2. Customer record created in database
3. Linked to workspace

### Getting Customer

```typescript
import { getCustomerByWorkspaceId } from "@/data/user/billing";

const customer = await getCustomerByWorkspaceId(workspaceId);
```

## Subscriptions

### Creating Subscriptions

**Checkout Session** (Recommended):
```typescript
import { createCheckoutSessionAction } from "@/data/user/billing";

const { url } = await createCheckoutSessionAction({
  workspaceId: "workspace-id",
  priceId: "price_xxx",
  options: {
    freeTrialDays: 14 // Optional trial
  }
});

// Redirect user to url
window.location.href = url;
```

**Direct Subscription**:
```typescript
import { StripePaymentGateway } from "@/payments/StripePaymentGateway";

const gateway = new StripePaymentGateway();
const subscription = await gateway.gateway.createSubscription({
  customerId: customer.id,
  priceId: "price_xxx"
});
```

### Getting Subscriptions

```typescript
import { getWorkspaceSubscriptions } from "@/data/user/billing";

const subscriptions = await getWorkspaceSubscriptions(workspaceId);
```

### Subscription Status

Status values:
- **`trialing`**: In trial period
- **`active`**: Active subscription
- **`canceled`**: Cancelled
- **`past_due`**: Payment overdue
- **`unpaid`**: Unpaid
- **`paused`**: Paused

### Canceling Subscriptions

```typescript
import { cancelSubscriptionAction } from "@/data/user/billing";

await cancelSubscriptionAction({
  subscriptionId: "sub_xxx",
  cancelAtPeriodEnd: true // Cancel at end of period
});
```

### Reactivating Subscriptions

```typescript
import { reactivateSubscriptionAction } from "@/data/user/billing";

await reactivateSubscriptionAction({
  subscriptionId: "sub_xxx"
});
```

## Invoices

### Getting Invoices

```typescript
import { getWorkspaceInvoices } from "@/data/user/billing";

const invoices = await getWorkspaceInvoices(workspaceId);
```

### Invoice Details

```typescript
import { getInvoiceById } from "@/data/user/billing";

const invoice = await getInvoiceById(invoiceId);
// Returns: { id, amount, currency, status, due_date, paid_date, hosted_invoice_url }
```

### Downloading Invoices

```typescript
// Use hosted_invoice_url from invoice
window.open(invoice.hosted_invoice_url);
```

## Payment Methods

### Getting Payment Methods

```typescript
import { getWorkspacePaymentMethods } from "@/data/user/billing";

const methods = await getWorkspacePaymentMethods(workspaceId);
```

### Setting Default Payment Method

```typescript
import { setDefaultPaymentMethodAction } from "@/data/user/billing";

await setDefaultPaymentMethodAction({
  paymentMethodId: "pm_xxx"
});
```

### Customer Portal

For managing payment methods, use Stripe Customer Portal:

```typescript
import { createCustomerPortalSessionAction } from "@/data/user/billing";

const { url } = await createCustomerPortalSessionAction({
  workspaceId: "workspace-id"
});

window.location.href = url;
```

## Usage Tracking

### Logging Usage

```typescript
import { logUsageAction } from "@/data/user/billing";

await logUsageAction({
  workspaceId: "workspace-id",
  feature: "api_calls",
  usageAmount: 100
});
```

### Getting Usage Logs

```typescript
import { getWorkspaceUsageLogs } from "@/data/user/billing";

const logs = await getWorkspaceUsageLogs(workspaceId);
```

## Pricing Display

### Formatting Prices

```typescript
import { formatGatewayPrice } from "@/utils/formatGatewayPrice";

const formatted = formatGatewayPrice({
  amount: 2900,
  currency: "usd",
  recurringInterval: "month"
});
// Returns: "$29.00/month"
```

### Pricing Component

```tsx
import { PricingCard } from "@/components/pricing/PricingCard";

<PricingCard
  product={product}
  prices={prices}
  currentSubscription={subscription}
/>
```

## Billing UI

### Billing Settings Page

```tsx
// src/app/[locale]/.../workspace/[slug]/settings/billing/page.tsx
export default async function BillingPage({ params }) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const subscriptions = await getWorkspaceSubscriptions(workspace.id);
  const invoices = await getWorkspaceInvoices(workspace.id);
  
  return (
    <BillingSettings
      workspace={workspace}
      subscriptions={subscriptions}
      invoices={invoices}
    />
  );
}
```

### Subscription Management

```tsx
import { SubscriptionCard } from "@/components/billing/SubscriptionCard";

<SubscriptionCard
  subscription={subscription}
  onCancel={() => cancelSubscription(subscription.id)}
  onReactivate={() => reactivateSubscription(subscription.id)}
/>
```

## Webhook Handling

### Event Processing

Webhooks automatically update:
- Subscription status
- Invoice records
- Payment methods
- Customer information

### Custom Webhook Handlers

```typescript
// src/payments/StripePaymentGateway.ts
async handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
      await this.handleSubscriptionCreated(event);
      break;
    case "invoice.paid":
      await this.handleInvoicePaid(event);
      break;
    // ... other events
  }
}
```

## Best Practices

### 1. Always Check Subscription Status

Before granting access:
```typescript
const subscription = await getActiveSubscription(workspaceId);
if (subscription?.status !== "active" && subscription?.status !== "trialing") {
  throw new Error("Subscription required");
}
```

### 2. Handle Webhooks Securely

```typescript
// Verify webhook signature
const sig = req.headers.get("stripe-signature");
const isValid = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

### 3. Track Usage

Log feature usage:
```typescript
await logUsageAction({
  workspaceId,
  feature: "feature_name",
  usageAmount: 1
});
```

### 4. Handle Failed Payments

Monitor subscription status:
```typescript
if (subscription.status === "past_due") {
  // Notify user
  // Restrict access if needed
}
```

## Testing

### Test Mode

Use Stripe test mode for development:
- Test cards: `4242 4242 4242 4242`
- Test API keys: `sk_test_...`

### Webhook Testing

Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

## API Reference

### Server Actions

- `createCheckoutSessionAction`
- `createCustomerPortalSessionAction`
- `cancelSubscriptionAction`
- `reactivateSubscriptionAction`
- `setDefaultPaymentMethodAction`
- `logUsageAction`

### Queries

- `getBillingProducts`
- `getWorkspaceSubscriptions`
- `getWorkspaceInvoices`
- `getWorkspacePaymentMethods`
- `getWorkspaceUsageLogs`
- `getCustomerByWorkspaceId`

## Further Reading

- [Workspaces & Multi-Tenancy](./workspaces.md) - Workspace context
- [Development Guide](../development.md) - Development workflow
- [Stripe Documentation](https://stripe.com/docs)

---

**Next Steps**:
- [Workspaces & Multi-Tenancy](./workspaces.md) - Understand workspace billing
- [Development Guide](../development.md) - Build billing features

