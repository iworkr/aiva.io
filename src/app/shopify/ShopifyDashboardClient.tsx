'use client';

/**
 * Shopify Dashboard Client Component
 * Renders the dashboard UI with App Bridge integration
 */

import { useEffect, useCallback } from 'react';

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

interface ShopifyDashboardClientProps {
  shop: string;
  host: string;
  shopName?: string;
  isLinked?: boolean;
  needsAuth?: boolean;
  authUrl?: string;
  autoLoginUrl?: string;
  linkUrl?: string;
  entitlement?: {
    plan: string;
    status: string;
    provider: string;
  } | null;
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

export default function ShopifyDashboardClient({
  shop,
  host,
  shopName,
  isLinked = false,
  needsAuth = false,
  authUrl,
  autoLoginUrl,
  linkUrl,
  entitlement,
}: ShopifyDashboardClientProps) {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';
  const displayName = shopName || shop.replace('.myshopify.com', '');

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

  // Handle App Bridge navigation (internal)
  const handleNavigate = useCallback((path: string) => {
    try {
      const AppBridge = window['app-bridge'];
      if (AppBridge && AppBridge.createApp) {
        const app = AppBridge.createApp({ apiKey, host });
        const Redirect = AppBridge.actions.Redirect;
        if (Redirect) {
          const redirect = Redirect.create(app);
          // Build full URL with shop and host params
          const url = `${window.location.origin}${path}?shop=${shop}&host=${host}`;
          redirect.dispatch(Redirect.Action.APP, url);
          return;
        }
      }
    } catch (e) {
      console.log('App Bridge error:', e);
    }
    // Fallback to regular navigation
    window.location.href = `${path}?shop=${shop}&host=${host}`;
  }, [apiKey, host, shop]);

  // Auto-redirect to auth if needed
  useEffect(() => {
    if (needsAuth && authUrl) {
      const timer = setTimeout(() => {
        handleRedirect(authUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [needsAuth, authUrl, handleRedirect]);

  // Render auth required screen
  if (needsAuth) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoBox}>
              <AivaLogo />
            </div>
            <h1 style={styles.headerTitle}>Aiva AI Inbox</h1>
            <p style={styles.headerSubtitle}>Your intelligent communication assistant</p>
          </div>
          
          <div style={styles.content}>
            <div style={styles.iconWarning}>⚠️</div>
            <h2 style={styles.title}>Authorization Required</h2>
            <p style={styles.text}>
              Your store <strong>{displayName}</strong> needs to be authorized.
              Click below to complete the setup.
            </p>
            
            <button
              style={styles.btnPrimary}
              onClick={() => authUrl && handleRedirect(authUrl)}
            >
              Authorize App →
            </button>
            <p style={styles.note}>Opens in a new window</p>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navLeft}>
            <span style={styles.navLogo}>Aiva</span>
            <button
              style={{ ...styles.navLink, ...styles.navLinkActive }}
              onClick={() => handleNavigate('/shopify')}
            >
              Dashboard
            </button>
            <button
              style={styles.navLink}
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
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoBox}>
              <AivaLogo />
            </div>
            <h1 style={styles.headerTitle}>Aiva AI Inbox</h1>
            <p style={styles.headerSubtitle}>Your intelligent communication assistant</p>
          </div>
          
          <div style={styles.content}>
            {/* Status Badge - shows connection AND link status */}
            <div style={{
              ...styles.statusBadge,
              backgroundColor: isLinked ? '#dcfce7' : '#fef3c7',
              borderColor: isLinked ? '#22c55e' : '#f59e0b',
            }}>
              <div style={{
                ...styles.statusIcon,
                backgroundColor: isLinked ? '#22c55e' : '#f59e0b',
              }}>{isLinked ? '✓' : '!'}</div>
              <div>
                <strong style={styles.statusTitle}>
                  {isLinked ? 'Store Connected' : 'Link Required'}
                </strong>
                <span style={styles.statusText}>
                  {isLinked 
                    ? `${displayName} is linked to Aiva` 
                    : `${displayName} needs to be linked to your Aiva account`}
                </span>
              </div>
            </div>

            {/* Entitlement Status */}
            {entitlement && (
              <div style={styles.planBadge}>
                <span style={styles.planLabel}>Current Plan:</span>
                <span style={styles.planValue}>
                  {entitlement.plan.charAt(0).toUpperCase() + entitlement.plan.slice(1)}
                </span>
                <span style={{
                  ...styles.statusDot,
                  backgroundColor: entitlement.status === 'active' ? COLORS.green :
                    entitlement.status === 'trialing' ? COLORS.yellow : COLORS.red
                }} />
                <span style={styles.statusLabel}>{entitlement.status}</span>
              </div>
            )}

            {!entitlement && (
              <div style={styles.planBadge}>
                <span style={styles.planLabel}>Current Plan:</span>
                <span style={styles.planValue}>Free</span>
                <button
                  style={styles.upgradeLink}
                  onClick={() => handleNavigate('/shopify/billing')}
                >
                  Upgrade →
                </button>
              </div>
            )}

            {/* Features */}
            <div style={styles.features}>
              <div style={styles.feature}>
                <div style={styles.featureIcon}>🛒</div>
                <div>
                  <strong style={styles.featureTitle}>Shopify Data Sync</strong>
                  <span style={styles.featureText}>Orders, customers & products for AI context</span>
                </div>
              </div>
              <div style={styles.feature}>
                <div style={styles.featureIcon}>🤖</div>
                <div>
                  <strong style={styles.featureTitle}>Smart Replies</strong>
                  <span style={styles.featureText}>AI drafts using your store&apos;s context</span>
                </div>
              </div>
              <div style={styles.feature}>
                <div style={styles.featureIcon}>📬</div>
                <div>
                  <strong style={styles.featureTitle}>Unified Inbox</strong>
                  <span style={styles.featureText}>All messages in one place</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isLinked && autoLoginUrl && (
              <button
                style={styles.btnPrimary}
                onClick={() => handleRedirect(autoLoginUrl)}
              >
                Open Aiva Dashboard →
              </button>
            )}

            {!isLinked && linkUrl && (
              <button
                style={styles.btnPrimary}
                onClick={() => handleRedirect(linkUrl)}
              >
                Connect Your Account →
              </button>
            )}

            <p style={styles.note}>Opens in a new tab for the full experience</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Aiva Logo SVG component
function AivaLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="300 350 1200 1100" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="aiva-grad-1" x1="374.8" y1="1044.7" x2="1178.3" y2="1044.7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#33effa"/>
          <stop offset="1" stopColor="#258ffb"/>
        </linearGradient>
        <linearGradient id="aiva-grad-2" x1="1265.6" y1="450.9" x2="937.2" y2="1081.9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#33effa"/>
          <stop offset="1" stopColor="#258ffb"/>
        </linearGradient>
      </defs>
      <path fill="url(#aiva-grad-1)" d="M1178.27,985.28l-162.51,352.82a53.71,53.71,0,0,1-48.78,31.24H681.76a53.71,53.71,0,0,1-48.78-31.24L379.19,787.12c-14.45-31.37,8.47-67.15,43-67.15H667.45a47.35,47.35,0,0,1,43,27.53l113.92,247.32C900.72,1139.51,1109.83,1133.87,1178.27,985.28Z"/>
      <path fill="url(#aiva-grad-2)" d="M1408.48,485.49,1213.99,907.73l-35.72,77.55c-68.44,148.59-277.55,154.23-353.9,9.55l252.86-548.95a47.34,47.34,0,0,1,43-27.53h245.25C1400.01,418.34,1422.93,454.12,1408.48,485.49Z"/>
    </svg>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
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
    padding: '40px 16px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    background: COLORS.white,
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.1)',
    maxWidth: '480px',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    background: COLORS.navy,
    padding: '36px 32px',
    textAlign: 'center' as const,
    position: 'relative' as const,
  },
  logoBox: {
    width: '72px',
    height: '72px',
    margin: '0 auto 20px',
    background: COLORS.white,
    borderRadius: '16px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '6px',
  },
  headerSubtitle: {
    color: COLORS.gray,
    fontSize: '14px',
  },
  content: {
    padding: '28px 32px 36px',
  },
  iconWarning: {
    width: '64px',
    height: '64px',
    background: '#fef3c7',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '32px',
  },
  title: {
    color: COLORS.navy,
    fontSize: '20px',
    marginBottom: '12px',
    textAlign: 'center' as const,
  },
  text: {
    color: COLORS.gray,
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '16px',
    gap: '14px',
  },
  statusIcon: {
    width: '38px',
    height: '38px',
    background: COLORS.gradient,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.white,
    fontSize: '18px',
    flexShrink: 0,
  },
  statusTitle: {
    display: 'block',
    color: COLORS.navy,
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px',
  },
  statusText: {
    color: COLORS.gray,
    fontSize: '13px',
  },
  planBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: COLORS.grayLight,
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  planLabel: {
    color: COLORS.gray,
    fontSize: '13px',
  },
  planValue: {
    color: COLORS.navy,
    fontSize: '14px',
    fontWeight: '600',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginLeft: 'auto',
  },
  statusLabel: {
    color: COLORS.gray,
    fontSize: '12px',
    textTransform: 'capitalize' as const,
  },
  upgradeLink: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: COLORS.cyan,
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  features: {
    marginBottom: '28px',
  },
  feature: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '14px',
  },
  featureIcon: {
    width: '40px',
    height: '40px',
    background: COLORS.grayLight,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  featureTitle: {
    display: 'block',
    color: COLORS.navy,
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px',
  },
  featureText: {
    color: COLORS.gray,
    fontSize: '13px',
  },
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '16px 24px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '16px',
    textAlign: 'center' as const,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: COLORS.gradient,
    color: COLORS.white,
    boxShadow: '0 4px 14px rgba(0, 212, 255, 0.35)',
  },
  note: {
    textAlign: 'center' as const,
    marginTop: '14px',
    fontSize: '12px',
    color: COLORS.gray,
  },
};
