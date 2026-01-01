'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Check, 
  ExternalLink, 
  Calendar,
  Sparkles,
  AlertCircle,
  Loader2,
  Crown
} from 'lucide-react';

interface Entitlement {
  id: string;
  shop_domain: string | null;
  workspace_id: string | null;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  provider: 'shopify' | 'stripe';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  current_period_end: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

interface EntitlementBillingProps {
  workspaceId: string;
}

const PLAN_DETAILS = {
  free: {
    name: 'Free',
    description: 'Basic features for getting started',
    color: 'bg-gray-100 text-gray-800',
  },
  basic: {
    name: 'Basic',
    description: 'Essential features for small teams',
    color: 'bg-blue-100 text-blue-800',
  },
  pro: {
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    color: 'bg-cyan-100 text-cyan-800',
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Full features with dedicated support',
    color: 'bg-purple-100 text-purple-800',
  },
};

const STATUS_DETAILS = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  trialing: { label: 'Trial', color: 'bg-yellow-100 text-yellow-800' },
  past_due: { label: 'Past Due', color: 'bg-red-100 text-red-800' },
  canceled: { label: 'Canceled', color: 'bg-gray-100 text-gray-800' },
};

export function EntitlementBilling({ workspaceId }: EntitlementBillingProps) {
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntitlement() {
      try {
        const response = await fetch(`/api/entitlements?workspaceId=${workspaceId}`);
        if (!response.ok) {
          if (response.status === 404) {
            // No entitlement found - show free plan
            setEntitlement(null);
            return;
          }
          throw new Error('Failed to fetch entitlement');
        }
        const data = await response.json();
        setEntitlement(data.entitlement);
      } catch (err) {
        console.error('Error fetching entitlement:', err);
        setError('Failed to load billing information');
      } finally {
        setLoading(false);
      }
    }

    fetchEntitlement();
  }, [workspaceId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No entitlement = free plan
  const plan = entitlement?.plan || 'free';
  const status = entitlement?.status || 'active';
  const provider = entitlement?.provider;
  const planInfo = PLAN_DETAILS[plan];
  const statusInfo = STATUS_DETAILS[status];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleManageSubscription = () => {
    if (provider === 'shopify' && entitlement?.shop_domain) {
      // Open Shopify admin app subscriptions page
      const shopName = entitlement.shop_domain.replace('.myshopify.com', '');
      window.open(`https://admin.shopify.com/store/${shopName}/settings/plan/subscriptions`, '_blank');
    } else if (provider === 'stripe') {
      // TODO: Open Stripe customer portal
      window.open('/api/billing/portal', '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Manage your plan and billing
            </CardDescription>
          </div>
          {plan !== 'free' && (
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{planInfo.name}</h3>
                <Badge variant="outline" className={planInfo.color}>
                  {plan.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {planInfo.description}
              </p>
              {provider && (
                <p className="text-xs text-muted-foreground mt-2">
                  Billed through {provider === 'shopify' ? 'Shopify' : 'Stripe'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Billing Details */}
        {entitlement && plan !== 'free' && (
          <>
            <Separator />
            <div className="space-y-3">
              {status === 'trialing' && entitlement.trial_ends_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span>
                    Trial ends on <strong>{formatDate(entitlement.trial_ends_at)}</strong>
                  </span>
                </div>
              )}
              {entitlement.current_period_end && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {status === 'canceled' ? 'Access until' : 'Next billing date'}:{' '}
                    <strong>{formatDate(entitlement.current_period_end)}</strong>
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Features */}
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Plan Features</h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {plan === 'free' && (
              <>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Limited trial access
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Upgrade to unlock full features
                </li>
              </>
            )}
            {plan === 'basic' && (
              <>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Unified inbox (up to 3 channels)
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  AI-powered message classification
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Deep history search
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Calendar event extraction
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  1,000 messages/month
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Email support
                </li>
              </>
            )}
            {plan === 'pro' && (
              <>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Everything in Basic
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  AI reply drafts & auto-responses
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Custom AI prompts
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Unlimited channels & messages
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Team workspace (5 members)
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Priority support
                </li>
              </>
            )}
            {plan === 'enterprise' && (
              <>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Everything in Professional
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Unlimited team members
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Dedicated account manager
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  SSO & advanced permissions
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  Custom AI training
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  SLA guarantee
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Actions */}
        {entitlement && plan !== 'free' && provider && (
          <>
            <Separator />
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                className="flex-1"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Subscription
              </Button>
              {status !== 'canceled' && (
                <Button 
                  variant="ghost" 
                  onClick={handleManageSubscription}
                  className="text-destructive hover:text-destructive"
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {provider === 'shopify' 
                ? 'You will be redirected to Shopify to manage your subscription'
                : 'You will be redirected to the billing portal'}
            </p>
          </>
        )}

        {/* Upgrade CTA for free users */}
        {plan === 'free' && (
          <>
            <Separator />
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Upgrade to unlock more features and channels
              </p>
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
