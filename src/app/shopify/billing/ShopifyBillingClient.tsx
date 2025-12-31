'use client';

/**
 * Shopify Billing Client Component
 * Displays plan options and handles subscription via Shopify Billing API
 */

import { useCallback, useState, useEffect } from 'react';

// Aiva brand colors
const COLORS = {
  navy: '#0f172a',
  navyLight: '#1e293b',
  cyan: '#00d4ff',
  cyanDark: '#00a8cc',
  blue: '#3b82f6',
  gradient: 'linear-gradient(135deg, #00d4ff 0%, #3b82f6 100%)',
  white: '#ffffff',
  gray: '#64748b',
  grayLight: '#f1f5f9',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

// Plan features
const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    'Up to 3 channels',
    'AI-powered classification',
    'Deep history search',
    'Calendar event extraction',
    'Up to 1,000 messages/month',
    'Email support',
  ],
  pro: [
    'Unlimited channels',
    'AI reply drafts',
    'Auto-responses',
    'Custom AI prompts',
    'Voice Aiva',
    'Team workspace (5 members)',
    'Unlimited messages',
    'Priority support',
  ],
  enterprise: [
    'Everything in Pro',
    'Unlimited team members',
    'Custom integrations',
    'SSO & advanced permissions',
    '24/7 priority support',
    'Dedicated account manager',
    'API access',
    'SLA guarantee',
  ],
};

interface BillingPlan {
  plan: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number | null;
  annualName: string | null;
  trialDays: number;
}

interface Entitlement {
  id: string;
  plan: string;
  status: string;
  provider: string;
  provider_subscription_id: string | null;
}

interface ShopifyBillingClientProps {
  shop: string;
  host: string;
  shopName?: string;
  entitlement: Entitlement | null;
  billingPlans: BillingPlan[];
  canSubscribe?: boolean;
  existingProvider?: 'shopify' | 'stripe';
  success?: boolean;
  canceled?: boolean;
}

// Get App Bridge from window
declare global {
  interface Window {
    'app-bridge': {
      createApp: (config: { apiKey: string; host: string }) => unknown;
      actions: {
        Redirect: {
          create: (app: unknown) => {
            dispatch: (action: unknown, url: string) => void;
          };
          Action: {
            REMOTE: unknown;
            APP: unknown;
          };
        };
      };
    };
  }
}

export default function ShopifyBillingClient({
  shop,
  host,
  shopName,
  entitlement,
  billingPlans,
  canSubscribe = true,
  existingProvider,
  success = false,
  canceled = false,
}: ShopifyBillingClientProps) {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';
  const displayName = shopName || shop.replace('.myshopify.com', '');
  
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(success);

  // Clear success message after a delay
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // Handle App Bridge redirect
  const handleRedirect = useCallback((url: string) => {
    try {
      const AppBridge = window['app-bridge'];
      if (AppBridge && AppBridge.createApp) {
        const app = AppBridge.createApp({ apiKey, host });
        const Redirect = AppBridge.actions.Redirect;
        if (Redirect) {
          const redirect = Redirect.create(app);
          redirect.dispatch(Redirect.Action.REMOTE, url);
          return;
        }
      }
    } catch (e) {
      console.log('App Bridge error:', e);
    }
    window.open(url, '_blank');
  }, [apiKey, host]);

  // Handle navigation
  const handleNavigate = useCallback((path: string) => {
    window.location.href = `${path}?shop=${shop}&host=${host}`;
  }, [shop, host]);

  // Handle subscribe
  const handleSubscribe = useCallback(async (plan: string) => {
    setLoading(plan);
    setError(null);

    try {
      const response = await fetch('/api/shopify/billing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop,
          plan,
          interval: billingInterval,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      if (data.confirmationUrl) {
        // Redirect to Shopify confirmation page using App Bridge
        handleRedirect(data.confirmationUrl);
      } else {
        throw new Error('No confirmation URL returned');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setLoading(null);
    }
  }, [shop, billingInterval, handleRedirect]);

  // Get current plan info
  const currentPlan = entitlement?.plan || 'free';
  const isActive = entitlement?.status === 'active' || entitlement?.status === 'trialing';

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navLeft}>
            <span style={styles.navLogo}>Aiva</span>
            <button
              style={styles.navLink}
              onClick={() => handleNavigate('/shopify')}
            >
              Dashboard
            </button>
            <button
              style={{ ...styles.navLink, ...styles.navLinkActive }}
              onClick={() => handleNavigate('/shopify/billing')}
            >
              Billing
            </button>
          </div>
          <div style={styles.navRight}>
            <span style={styles.shopBadge}>{displayName}</span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Choose Your Plan</h1>
          <p style={styles.headerSubtitle}>
            All plans include a {billingPlans[0]?.trialDays || 14}-day free trial. Cancel anytime.
          </p>
          
          {/* Current plan status */}
          {isActive && (
            <div style={styles.currentPlanBadge}>
              <span style={styles.statusDot} />
              Current plan: <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong>
              {entitlement?.status === 'trialing' && ' (Trial)'}
            </div>
          )}

          {/* Billing interval toggle */}
          <div style={styles.intervalToggle}>
            <button
              style={{
                ...styles.intervalBtn,
                ...(billingInterval === 'monthly' ? styles.intervalBtnActive : {}),
              }}
              onClick={() => setBillingInterval('monthly')}
            >
              Monthly
            </button>
            <button
              style={{
                ...styles.intervalBtn,
                ...(billingInterval === 'annual' ? styles.intervalBtnActive : {}),
              }}
              onClick={() => setBillingInterval('annual')}
            >
              Annual
              <span style={styles.saveBadge}>Save 17%</span>
            </button>
          </div>
        </div>

        {/* Double billing prevention message */}
        {!canSubscribe && existingProvider === 'stripe' && (
          <div style={styles.infoBanner}>
            <strong>You have an active subscription via Stripe.</strong>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>
              To switch to Shopify billing, please cancel your current subscription 
              in the Aiva dashboard billing settings first.
            </p>
          </div>
        )}

        {/* Success/Error messages */}
        {showSuccess && (
          <div style={styles.successBanner}>
            ✓ Subscription activated successfully!
          </div>
        )}
        {canceled && (
          <div style={styles.warningBanner}>
            Subscription was canceled or declined.
          </div>
        )}
        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div style={styles.plansGrid}>
          {billingPlans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.plan && isActive;
            const price = billingInterval === 'annual' && plan.annualPrice
              ? (plan.annualPrice / 12).toFixed(0)
              : plan.monthlyPrice;
            const features = PLAN_FEATURES[plan.plan] || [];
            const isPro = plan.plan === 'pro';

            return (
              <div
                key={plan.plan}
                style={{
                  ...styles.planCard,
                  ...(isPro ? styles.planCardHighlighted : {}),
                }}
              >
                {isPro && (
                  <div style={styles.popularBadge}>Most Popular</div>
                )}
                
                <h3 style={styles.planName}>{plan.name.replace(' Annual', '')}</h3>
                
                <div style={styles.priceRow}>
                  <span style={styles.priceAmount}>${price}</span>
                  <span style={styles.priceInterval}>/month</span>
                </div>
                
                {billingInterval === 'annual' && plan.annualPrice && (
                  <p style={styles.annualNote}>
                    ${plan.annualPrice} billed annually
                  </p>
                )}

                <ul style={styles.featureList}>
                  {features.map((feature, i) => (
                    <li key={i} style={styles.featureItem}>
                      <span style={styles.checkIcon}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  style={{
                    ...styles.subscribeBtn,
                    ...(isCurrentPlan ? styles.subscribeBtnCurrent : {}),
                    ...(isPro && !isCurrentPlan && canSubscribe ? styles.subscribeBtnPrimary : {}),
                    ...(!canSubscribe ? styles.subscribeBtnDisabled : {}),
                  }}
                  onClick={() => !isCurrentPlan && canSubscribe && handleSubscribe(plan.plan)}
                  disabled={isCurrentPlan || loading !== null || !canSubscribe}
                >
                  {loading === plan.plan ? (
                    'Processing...'
                  ) : !canSubscribe ? (
                    'Subscribed via Stripe'
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : currentPlan !== 'free' && isActive ? (
                    'Switch Plan'
                  ) : (
                    'Start Free Trial'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Note about Shopify billing */}
        <div style={styles.billingNote}>
          <p>
            <strong>Billed through Shopify</strong> — Charges will appear on your Shopify invoice.
            Secure payment processed by Shopify.
          </p>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: COLORS.grayLight,
  },
  nav: {
    background: COLORS.navy,
    borderBottom: `3px solid ${COLORS.cyan}`,
    padding: '0 16px',
  },
  navInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '56px',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
  },
  navLogo: {
    color: COLORS.white,
    fontSize: '20px',
    fontWeight: '700',
  },
  navLink: {
    color: COLORS.gray,
    fontSize: '14px',
    fontWeight: '500',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  navLinkActive: {
    color: COLORS.white,
    background: 'rgba(255,255,255,0.1)',
  },
  shopBadge: {
    color: COLORS.cyan,
    fontSize: '13px',
    fontWeight: '500',
    background: 'rgba(0,212,255,0.1)',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(0,212,255,0.3)',
  },
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 16px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  headerTitle: {
    color: COLORS.navy,
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  headerSubtitle: {
    color: COLORS.gray,
    fontSize: '16px',
    marginBottom: '16px',
  },
  currentPlanBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: COLORS.navy,
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '20px',
    marginBottom: '24px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: COLORS.green,
  },
  intervalToggle: {
    display: 'inline-flex',
    background: COLORS.white,
    borderRadius: '10px',
    padding: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  intervalBtn: {
    padding: '10px 24px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: COLORS.gray,
    borderRadius: '8px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  intervalBtnActive: {
    background: COLORS.navy,
    color: COLORS.white,
  },
  saveBadge: {
    background: COLORS.green,
    color: COLORS.white,
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  infoBanner: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: COLORS.blue,
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  successBanner: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: COLORS.green,
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    textAlign: 'center' as const,
    fontWeight: '500',
  },
  warningBanner: {
    background: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    color: '#a16207',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: COLORS.red,
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  planCard: {
    background: COLORS.white,
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    position: 'relative' as const,
  },
  planCardHighlighted: {
    border: `2px solid ${COLORS.cyan}`,
    transform: 'scale(1.02)',
  },
  popularBadge: {
    position: 'absolute' as const,
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: COLORS.gradient,
    color: COLORS.white,
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 16px',
    borderRadius: '20px',
  },
  planName: {
    color: COLORS.navy,
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    marginBottom: '4px',
  },
  priceAmount: {
    color: COLORS.navy,
    fontSize: '36px',
    fontWeight: '700',
  },
  priceInterval: {
    color: COLORS.gray,
    fontSize: '14px',
  },
  annualNote: {
    color: COLORS.green,
    fontSize: '13px',
    marginBottom: '20px',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '20px 0',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    color: COLORS.navy,
    fontSize: '14px',
    marginBottom: '12px',
  },
  checkIcon: {
    color: COLORS.cyan,
    fontWeight: '600',
    flexShrink: 0,
  },
  subscribeBtn: {
    width: '100%',
    padding: '14px 24px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s',
    background: COLORS.grayLight,
    color: COLORS.navy,
  },
  subscribeBtnPrimary: {
    background: COLORS.gradient,
    color: COLORS.white,
    boxShadow: '0 4px 14px rgba(0, 212, 255, 0.35)',
  },
  subscribeBtnCurrent: {
    background: 'rgba(34, 197, 94, 0.1)',
    color: COLORS.green,
    cursor: 'default',
  },
  subscribeBtnDisabled: {
    background: COLORS.grayLight,
    color: COLORS.gray,
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  billingNote: {
    textAlign: 'center' as const,
    color: COLORS.gray,
    fontSize: '13px',
    padding: '16px',
    background: COLORS.white,
    borderRadius: '8px',
  },
};
