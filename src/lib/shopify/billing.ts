/**
 * Shopify Billing API Client
 * Handles app subscription creation and management via Shopify GraphQL Admin API
 */

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

// =====================================================
// TYPES
// =====================================================

export type ShopifyPlanType = 'basic' | 'pro' | 'enterprise';
export type BillingInterval = 'EVERY_30_DAYS' | 'ANNUAL';

export interface ShopifyBillingPlan {
  plan: ShopifyPlanType;
  shopify_plan_name_monthly: string;
  shopify_amount_monthly: number;
  shopify_plan_name_annual: string | null;
  shopify_amount_annual: number | null;
  trial_days: number;
}

export interface AppSubscription {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CANCELLED' | 'DECLINED' | 'EXPIRED' | 'FROZEN' | 'PENDING';
  createdAt: string;
  currentPeriodEnd?: string;
  trialDays?: number;
  test: boolean;
  lineItems: {
    id: string;
    plan: {
      pricingDetails: {
        price: {
          amount: string;
          currencyCode: string;
        };
        interval: 'EVERY_30_DAYS' | 'ANNUAL';
      };
    };
  }[];
}

export interface CreateSubscriptionResult {
  confirmationUrl: string;
  subscriptionId: string;
}

export interface SubscriptionQueryResult {
  subscription: AppSubscription | null;
  allSubscriptions: AppSubscription[];
}

// =====================================================
// GRAPHQL QUERIES AND MUTATIONS
// =====================================================

const APP_SUBSCRIPTION_CREATE_MUTATION = `
  mutation appSubscriptionCreate(
    $name: String!
    $returnUrl: URL!
    $trialDays: Int
    $test: Boolean
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      trialDays: $trialDays
      test: $test
      lineItems: $lineItems
    ) {
      appSubscription {
        id
        name
        status
        createdAt
        test
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

const CURRENT_APP_INSTALLATION_QUERY = `
  query currentAppInstallation {
    currentAppInstallation {
      id
      activeSubscriptions {
        id
        name
        status
        createdAt
        currentPeriodEnd
        trialDays
        test
        lineItems {
          id
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

const APP_SUBSCRIPTION_CANCEL_MUTATION = `
  mutation appSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      appSubscription {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Make a GraphQL request to Shopify Admin API
 */
async function shopifyGraphQL<T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
  const url = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Shopify Billing] GraphQL request failed:', response.status, errorText);
    throw new Error(`Shopify GraphQL error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    console.error('[Shopify Billing] GraphQL errors:', result.errors);
    throw new Error(`Shopify GraphQL errors: ${result.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }

  return result.data;
}

/**
 * Get billing plans from database
 */
export async function getShopifyBillingPlans(): Promise<ShopifyBillingPlan[]> {
  const { data, error } = await supabaseAdminClient
    .from('shopify_billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[Shopify Billing] Failed to fetch billing plans:', error);
    throw new Error('Failed to fetch billing plans');
  }

  return data as ShopifyBillingPlan[];
}

/**
 * Get a specific billing plan
 */
export async function getShopifyBillingPlan(plan: ShopifyPlanType): Promise<ShopifyBillingPlan | null> {
  const { data, error } = await supabaseAdminClient
    .from('shopify_billing_plans')
    .select('*')
    .eq('plan', plan)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Shopify Billing] Failed to fetch billing plan:', error);
    throw new Error('Failed to fetch billing plan');
  }

  return data as ShopifyBillingPlan;
}

// =====================================================
// MAIN BILLING FUNCTIONS
// =====================================================

/**
 * Create a Shopify app subscription
 * Returns the confirmation URL that the merchant must visit to approve
 */
export async function createShopifySubscription(
  shopDomain: string,
  accessToken: string,
  plan: ShopifyPlanType,
  interval: 'monthly' | 'annual' = 'monthly',
  returnUrl: string,
  isTestMode: boolean = false
): Promise<CreateSubscriptionResult> {
  // Get the billing plan details
  const billingPlan = await getShopifyBillingPlan(plan);
  if (!billingPlan) {
    throw new Error(`Billing plan not found: ${plan}`);
  }

  // Determine pricing based on interval
  const isAnnual = interval === 'annual';
  const planName = isAnnual 
    ? billingPlan.shopify_plan_name_annual || billingPlan.shopify_plan_name_monthly
    : billingPlan.shopify_plan_name_monthly;
  const amount = isAnnual 
    ? billingPlan.shopify_amount_annual || billingPlan.shopify_amount_monthly
    : billingPlan.shopify_amount_monthly;
  const shopifyInterval: BillingInterval = isAnnual ? 'ANNUAL' : 'EVERY_30_DAYS';

  console.log('[Shopify Billing] Creating subscription:', {
    shopDomain,
    plan,
    planName,
    amount,
    interval: shopifyInterval,
    isTestMode,
  });

  const variables = {
    name: planName,
    returnUrl,
    trialDays: billingPlan.trial_days,
    test: isTestMode,
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: {
              amount: amount,
              currencyCode: 'USD',
            },
            interval: shopifyInterval,
          },
        },
      },
    ],
  };

  const data = await shopifyGraphQL<{
    appSubscriptionCreate: {
      appSubscription: { id: string; name: string; status: string } | null;
      confirmationUrl: string | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(shopDomain, accessToken, APP_SUBSCRIPTION_CREATE_MUTATION, variables);

  const { appSubscription, confirmationUrl, userErrors } = data.appSubscriptionCreate;

  if (userErrors && userErrors.length > 0) {
    console.error('[Shopify Billing] User errors:', userErrors);
    throw new Error(`Shopify billing error: ${userErrors.map(e => e.message).join(', ')}`);
  }

  if (!confirmationUrl || !appSubscription) {
    throw new Error('Failed to create subscription: no confirmation URL returned');
  }

  console.log('[Shopify Billing] Subscription created:', {
    subscriptionId: appSubscription.id,
    status: appSubscription.status,
    confirmationUrl,
  });

  return {
    confirmationUrl,
    subscriptionId: appSubscription.id,
  };
}

/**
 * Get current active subscriptions for a shop
 */
export async function getCurrentSubscriptions(
  shopDomain: string,
  accessToken: string
): Promise<SubscriptionQueryResult> {
  console.log('[Shopify Billing] Fetching current subscriptions for:', shopDomain);

  const data = await shopifyGraphQL<{
    currentAppInstallation: {
      id: string;
      activeSubscriptions: Array<{
        id: string;
        name: string;
        status: string;
        createdAt: string;
        currentPeriodEnd?: string;
        trialDays?: number;
        test: boolean;
        lineItems: Array<{
          id: string;
          plan: {
            pricingDetails: {
              price: {
                amount: string;
                currencyCode: string;
              };
              interval: 'EVERY_30_DAYS' | 'ANNUAL';
            };
          };
        }>;
      }>;
    };
  }>(shopDomain, accessToken, CURRENT_APP_INSTALLATION_QUERY);

  const activeSubscriptions = data.currentAppInstallation?.activeSubscriptions || [];

  // Transform the data
  const allSubscriptions: AppSubscription[] = activeSubscriptions.map(sub => ({
    id: sub.id,
    name: sub.name,
    status: sub.status as AppSubscription['status'],
    createdAt: sub.createdAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    trialDays: sub.trialDays,
    test: sub.test,
    lineItems: sub.lineItems.map(item => ({
      id: item.id,
      plan: item.plan,
    })),
  }));

  // Find the first ACTIVE subscription (should typically be only one)
  const activeSubscription = allSubscriptions.find(sub => sub.status === 'ACTIVE') || null;

  console.log('[Shopify Billing] Found subscriptions:', {
    total: allSubscriptions.length,
    active: activeSubscription ? activeSubscription.id : 'none',
  });

  return {
    subscription: activeSubscription,
    allSubscriptions,
  };
}

/**
 * Cancel a Shopify app subscription
 */
export async function cancelShopifySubscription(
  shopDomain: string,
  accessToken: string,
  subscriptionId: string
): Promise<boolean> {
  console.log('[Shopify Billing] Cancelling subscription:', subscriptionId);

  const data = await shopifyGraphQL<{
    appSubscriptionCancel: {
      appSubscription: { id: string; status: string } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(shopDomain, accessToken, APP_SUBSCRIPTION_CANCEL_MUTATION, { id: subscriptionId });

  const { appSubscription, userErrors } = data.appSubscriptionCancel;

  if (userErrors && userErrors.length > 0) {
    console.error('[Shopify Billing] Cancel user errors:', userErrors);
    throw new Error(`Failed to cancel subscription: ${userErrors.map(e => e.message).join(', ')}`);
  }

  if (!appSubscription) {
    throw new Error('Failed to cancel subscription: subscription not found');
  }

  console.log('[Shopify Billing] Subscription cancelled:', {
    subscriptionId: appSubscription.id,
    status: appSubscription.status,
  });

  return true;
}

/**
 * Determine which plan a subscription corresponds to based on its name
 */
export function getPlanFromSubscriptionName(subscriptionName: string): ShopifyPlanType | null {
  const nameLower = subscriptionName.toLowerCase();
  
  if (nameLower.includes('enterprise')) {
    return 'enterprise';
  }
  if (nameLower.includes('professional') || nameLower.includes('pro')) {
    return 'pro';
  }
  if (nameLower.includes('basic') || nameLower.includes('starter')) {
    return 'basic';
  }
  
  return null;
}

/**
 * Check if a shop has an active subscription
 */
export async function hasActiveSubscription(
  shopDomain: string,
  accessToken: string
): Promise<boolean> {
  const { subscription } = await getCurrentSubscriptions(shopDomain, accessToken);
  return subscription !== null && subscription.status === 'ACTIVE';
}

/**
 * Get the return URL for subscription creation
 */
export function getSubscriptionReturnUrl(shopDomain: string, host: string): string {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
  const returnUrl = new URL('/api/shopify/billing/verify', appUrl);
  returnUrl.searchParams.set('shop', shopDomain);
  returnUrl.searchParams.set('host', host);
  return returnUrl.toString();
}
