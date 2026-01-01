import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { verifyShopAccess } from '@/lib/shopify/client';
import { getEntitlementByShopDomain, canSubscribeViaProvider } from '@/lib/entitlements';
import { getShopifyBillingPlans } from '@/lib/shopify/billing';

export const dynamic = 'force-dynamic';

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

/**
 * Shopify Embedded App Billing Page
 * Returns HTML directly to work properly in Shopify's iframe
 */
export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');
  const host = request.nextUrl.searchParams.get('host') || '';
  const success = request.nextUrl.searchParams.get('success') === 'true';
  const canceled = request.nextUrl.searchParams.get('canceled') === 'true';
  
  if (!shop) {
    const cookieStore = await cookies();
    const shopFromCookie = cookieStore.get('shopify_shop')?.value;
    
    if (!shopFromCookie) {
      return new NextResponse('Missing shop parameter', { status: 400 });
    }
    
    const redirectUrl = new URL('/api/shopify/billing', request.url);
    redirectUrl.searchParams.set('shop', shopFromCookie);
    redirectUrl.searchParams.set('host', host);
    return NextResponse.redirect(redirectUrl);
  }

  const apiKey = process.env.SHOPIFY_API_KEY || '';
  const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';

  // Fetch shop data
  const { data: shopData, error } = await supabaseAdminClient
    .from('shopify_stores')
    .select('id, linked_user_id, access_token, shop_name, workspace_id')
    .eq('shop_domain', shop)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching shop data:', error);
  }

  // If shop doesn't have an access token, redirect to OAuth
  if (!shopData?.access_token) {
    const authUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
    return NextResponse.redirect(authUrl);
  }

  // Verify the access token is still valid
  const isTokenValid = await verifyShopAccess(shop, shopData.access_token);
  
  if (!isTokenValid) {
    const authUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
    return NextResponse.redirect(authUrl);
  }

  // Get entitlement status
  const entitlement = await getEntitlementByShopDomain(shop);
  
  // Check if user can subscribe via Shopify
  const canSubscribe = await canSubscribeViaProvider(
    'shopify',
    shop,
    shopData.workspace_id || undefined
  );
  
  // Get billing plans
  const billingPlans = await getShopifyBillingPlans();

  const shopName = shopData.shop_name || shop.replace('.myshopify.com', '');

  return renderBillingPage({
    shop,
    host,
    apiKey,
    appUrl,
    shopName,
    entitlement: entitlement ? {
      id: entitlement.id,
      plan: entitlement.plan,
      status: entitlement.status,
      provider: entitlement.provider,
    } : null,
    billingPlans: billingPlans.map(plan => ({
      plan: plan.plan,
      name: plan.shopify_plan_name_monthly,
      monthlyPrice: plan.shopify_amount_monthly,
      annualPrice: plan.shopify_amount_annual,
      trialDays: plan.trial_days,
    })),
    canSubscribe: canSubscribe.allowed,
    existingProvider: canSubscribe.existingProvider,
    success,
    canceled,
  });
}

interface BillingPageData {
  shop: string;
  host: string;
  apiKey: string;
  appUrl: string;
  shopName: string;
  entitlement: {
    id: string;
    plan: string;
    status: string;
    provider: string;
  } | null;
  billingPlans: {
    plan: string;
    name: string;
    monthlyPrice: number;
    annualPrice: number | null;
    trialDays: number;
  }[];
  canSubscribe: boolean;
  existingProvider?: string;
  success: boolean;
  canceled: boolean;
}

function renderBillingPage(data: BillingPageData): NextResponse {
  const { 
    shop, 
    host, 
    apiKey, 
    appUrl,
    shopName, 
    entitlement, 
    billingPlans, 
    canSubscribe,
    existingProvider,
    success, 
    canceled 
  } = data;

  const currentPlan = entitlement?.plan || 'free';
  const isActive = entitlement?.status === 'active' || entitlement?.status === 'trialing';
  const trialDays = billingPlans[0]?.trialDays || 14;

  // Generate plan cards HTML
  const planCardsHtml = billingPlans.map(plan => {
    const isCurrentPlan = currentPlan === plan.plan && isActive;
    const isPro = plan.plan === 'pro';
    const features = PLAN_FEATURES[plan.plan] || [];
    
    return `
      <div class="plan-card ${isPro ? 'highlighted' : ''}" data-plan="${plan.plan}">
        ${isPro ? '<div class="popular-badge">Most Popular</div>' : ''}
        <h3 class="plan-name">${plan.name.replace(' Annual', '')}</h3>
        <div class="price-row">
          <span class="price-amount" data-monthly="${plan.monthlyPrice}" data-annual="${plan.annualPrice ? (plan.annualPrice / 12).toFixed(0) : plan.monthlyPrice}">$${plan.monthlyPrice}</span>
          <span class="price-interval">/month</span>
        </div>
        <p class="annual-note" data-annual-total="${plan.annualPrice || plan.monthlyPrice * 12}" style="display: none;">
          $${plan.annualPrice || plan.monthlyPrice * 12} billed annually
        </p>
        <ul class="feature-list">
          ${features.map(f => `<li><span class="check">✓</span>${f}</li>`).join('')}
        </ul>
        <button 
          class="subscribe-btn ${isCurrentPlan ? 'current' : ''} ${isPro && !isCurrentPlan && canSubscribe ? 'primary' : ''} ${!canSubscribe ? 'disabled' : ''}"
          onclick="${!isCurrentPlan && canSubscribe ? `handleSubscribe('${plan.plan}')` : ''}"
          ${isCurrentPlan || !canSubscribe ? 'disabled' : ''}
        >
          ${!canSubscribe ? 'Subscribed via Stripe' : isCurrentPlan ? 'Current Plan' : currentPlan !== 'free' && isActive ? 'Switch Plan' : 'Start Free Trial'}
        </button>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="shopify-api-key" content="${apiKey}" />
  <title>Billing - Aiva</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: ${COLORS.grayLight};
      color: ${COLORS.navy};
      min-height: 100vh;
    }
    
    .nav {
      background: ${COLORS.navy};
      border-bottom: 3px solid ${COLORS.cyan};
      padding: 0 16px;
    }
    .nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 56px;
    }
    .nav-left { display: flex; align-items: center; gap: 24px; }
    .nav-logo { color: ${COLORS.white}; font-size: 20px; font-weight: 700; }
    .nav-link {
      color: ${COLORS.gray};
      font-size: 14px;
      font-weight: 500;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 6px;
    }
    .nav-link.active { color: ${COLORS.white}; background: rgba(255,255,255,0.1); }
    .nav-link:hover { color: ${COLORS.white}; }
    .shop-badge {
      color: ${COLORS.cyan};
      font-size: 13px;
      font-weight: 500;
      background: rgba(0,212,255,0.1);
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid rgba(0,212,255,0.3);
    }
    
    .main {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 16px;
    }
    
    .header { text-align: center; margin-bottom: 32px; }
    .header-title { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .header-subtitle { color: ${COLORS.gray}; font-size: 16px; margin-bottom: 16px; }
    
    .current-plan-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: ${COLORS.navy};
      font-size: 14px;
      padding: 8px 16px;
      border-radius: 20px;
      margin-bottom: 24px;
    }
    .current-plan-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${COLORS.green};
    }
    
    .interval-toggle {
      display: inline-flex;
      background: ${COLORS.white};
      border-radius: 10px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .interval-btn {
      padding: 10px 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: ${COLORS.gray};
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .interval-btn.active { background: ${COLORS.navy}; color: ${COLORS.white}; }
    .save-badge {
      background: ${COLORS.green};
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .banner {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      text-align: center;
    }
    .banner.success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); color: ${COLORS.green}; }
    .banner.warning { background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); color: #a16207; }
    .banner.info { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: ${COLORS.blue}; }
    .banner.error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: ${COLORS.red}; }
    
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .plan-card {
      background: ${COLORS.white};
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      position: relative;
    }
    .plan-card.highlighted {
      border: 2px solid ${COLORS.cyan};
      transform: scale(1.02);
    }
    .popular-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: ${COLORS.gradient};
      color: white;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 16px;
      border-radius: 20px;
    }
    .plan-name { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
    .price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
    .price-amount { font-size: 36px; font-weight: 700; }
    .price-interval { color: ${COLORS.gray}; font-size: 14px; }
    .annual-note { color: ${COLORS.green}; font-size: 13px; margin-bottom: 20px; }
    
    .feature-list { list-style: none; margin: 20px 0; }
    .feature-list li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .feature-list .check { color: ${COLORS.cyan}; font-weight: 600; }
    
    .subscribe-btn {
      width: 100%;
      padding: 14px 24px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      background: ${COLORS.grayLight};
      color: ${COLORS.navy};
      transition: all 0.2s;
    }
    .subscribe-btn.primary {
      background: ${COLORS.gradient};
      color: white;
      box-shadow: 0 4px 14px rgba(0, 212, 255, 0.35);
    }
    .subscribe-btn.current {
      background: rgba(34, 197, 94, 0.1);
      color: ${COLORS.green};
      cursor: default;
    }
    .subscribe-btn.disabled {
      background: ${COLORS.grayLight};
      color: ${COLORS.gray};
      cursor: not-allowed;
      opacity: 0.7;
    }
    .subscribe-btn:not(.current):not(.disabled):hover { opacity: 0.9; }
    
    .billing-note {
      text-align: center;
      color: ${COLORS.gray};
      font-size: 13px;
      padding: 16px;
      background: ${COLORS.white};
      border-radius: 8px;
    }
    
    .loading-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.8);
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .loading-overlay.visible { display: flex; }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid ${COLORS.grayLight};
      border-top-color: ${COLORS.cyan};
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <!-- App Bridge Navigation Menu (web component) -->
  <ui-nav-menu>
    <a href="/api/shopify/app?shop=${shop}&host=${host}" rel="home">Home</a>
    <a href="/api/shopify/billing?shop=${shop}&host=${host}">Billing</a>
  </ui-nav-menu>

  <nav class="nav">
    <div class="nav-inner">
      <div class="nav-left">
        <span class="nav-logo">Aiva</span>
        <button class="nav-link" onclick="handleNavigate('/api/shopify/app')">Dashboard</button>
        <button class="nav-link active">Billing</button>
      </div>
      <div>
        <span class="shop-badge">${shopName}</span>
      </div>
    </div>
  </nav>
  
  <div class="main">
    <div class="header">
      <h1 class="header-title">Choose Your Plan</h1>
      <p class="header-subtitle">All plans include a ${trialDays}-day free trial. Cancel anytime.</p>
      
      ${isActive ? `
        <div class="current-plan-badge">
          <span class="dot"></span>
          Current plan: <strong>${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong>
          ${entitlement?.status === 'trialing' ? ' (Trial)' : ''}
        </div>
      ` : ''}
      
      <div class="interval-toggle">
        <button class="interval-btn active" id="monthly-btn" onclick="setInterval('monthly')">Monthly</button>
        <button class="interval-btn" id="annual-btn" onclick="setInterval('annual')">
          Annual <span class="save-badge">Save 17%</span>
        </button>
      </div>
    </div>
    
    ${!canSubscribe && existingProvider === 'stripe' ? `
      <div class="banner info">
        <strong>You have an active subscription via Stripe.</strong><br>
        To switch to Shopify billing, please cancel your current subscription in the Aiva dashboard first.
      </div>
    ` : ''}
    
    ${success ? '<div class="banner success">✓ Subscription activated successfully!</div>' : ''}
    ${canceled ? '<div class="banner warning">Subscription was canceled or declined.</div>' : ''}
    <div class="banner error" id="error-banner" style="display: none;"></div>
    
    <div class="plans-grid">
      ${planCardsHtml}
    </div>
    
    <div class="billing-note">
      <strong>Billed through Shopify</strong> — Charges will appear on your Shopify invoice.
      Secure payment processed by Shopify.
    </div>
  </div>
  
  <div class="loading-overlay" id="loading">
    <div class="loading-spinner"></div>
  </div>
  
  <script>
    const apiKey = '${apiKey}';
    const host = '${host}';
    const shop = '${shop}';
    const appUrl = '${appUrl}';
    let billingInterval = 'monthly';
    
    function setInterval(interval) {
      billingInterval = interval;
      document.getElementById('monthly-btn').classList.toggle('active', interval === 'monthly');
      document.getElementById('annual-btn').classList.toggle('active', interval === 'annual');
      
      // Update prices
      document.querySelectorAll('.price-amount').forEach(el => {
        const monthly = el.dataset.monthly;
        const annual = el.dataset.annual;
        el.textContent = '$' + (interval === 'annual' ? annual : monthly);
      });
      
      // Show/hide annual notes
      document.querySelectorAll('.annual-note').forEach(el => {
        el.style.display = interval === 'annual' ? 'block' : 'none';
      });
    }
    
    function handleNavigate(path) {
      const url = appUrl + path + '?shop=' + shop + '&host=' + host;
      try {
        if (window['app-bridge'] && window['app-bridge'].createApp) {
          const AppBridge = window['app-bridge'];
          const app = AppBridge.createApp({ apiKey, host });
          const Redirect = AppBridge.actions.Redirect;
          if (Redirect) {
            const redirect = Redirect.create(app);
            redirect.dispatch(Redirect.Action.APP, url);
            return;
          }
        }
      } catch (e) {
        console.log('App Bridge error:', e);
      }
      window.location.href = url;
    }
    
    async function handleSubscribe(plan) {
      const loading = document.getElementById('loading');
      const errorBanner = document.getElementById('error-banner');
      
      console.log('[Billing] Starting subscription for plan:', plan, 'interval:', billingInterval);
      loading.classList.add('visible');
      errorBanner.style.display = 'none';
      
      try {
        // Use absolute URL since we're in Shopify's iframe
        const createUrl = appUrl + '/api/shopify/billing/create';
        console.log('[Billing] Sending request to:', createUrl);
        
        const response = await fetch(createUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ shop, plan, interval: billingInterval }),
          credentials: 'omit', // Don't send cookies for CORS
        });
        
        console.log('[Billing] Response status:', response.status);
        const data = await response.json();
        console.log('[Billing] Response data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create subscription');
        }
        
        if (data.confirmationUrl) {
          console.log('[Billing] Got confirmation URL:', data.confirmationUrl);
          
          // Method 1: Try using modern App Bridge (shopify global)
          if (window.shopify && window.shopify.idToken) {
            console.log('[Billing] Using modern Shopify App Bridge redirect');
            // Modern App Bridge - redirect using top-level navigation
            window.top.location.href = data.confirmationUrl;
            return;
          }
          
          // Method 2: Try legacy App Bridge Redirect action
          try {
            if (window['app-bridge'] && window['app-bridge'].createApp) {
              const AppBridge = window['app-bridge'];
              const app = AppBridge.createApp({ apiKey, host });
              const Redirect = AppBridge.actions.Redirect;
              if (Redirect) {
                console.log('[Billing] Redirecting via legacy App Bridge');
                const redirect = Redirect.create(app);
                redirect.dispatch(Redirect.Action.REMOTE, data.confirmationUrl);
                return;
              }
            }
          } catch (e) {
            console.log('[Billing] Legacy App Bridge error:', e);
          }
          
          // Method 3: Direct top-level redirect (works in iframe)
          console.log('[Billing] Using top-level window redirect');
          window.top.location.href = data.confirmationUrl;
        } else {
          throw new Error('No confirmation URL returned');
        }
      } catch (err) {
        console.error('[Billing] Subscription error:', err);
        loading.classList.remove('visible');
        errorBanner.textContent = err.message || 'Failed to create subscription. Please try again.';
        errorBanner.style.display = 'block';
        
        // Scroll to error
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'ALLOWALL',
    },
  });
}
