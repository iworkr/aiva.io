import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { generateLinkToken } from '@/lib/shopify/tokens';
import { verifyShopAccess } from '@/lib/shopify/client';
import { getEntitlementByShopDomain } from '@/lib/entitlements';

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

// Official Aiva logo SVG
const AIVA_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="300 350 1200 1100" style="width:100%;height:100%">
  <defs>
    <linearGradient id="aiva-grad-1" x1="374.8" y1="1044.7" x2="1178.3" y2="1044.7" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#33effa"/>
      <stop offset="1" stop-color="#258ffb"/>
    </linearGradient>
    <linearGradient id="aiva-grad-2" x1="1265.6" y1="450.9" x2="937.2" y2="1081.9" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#33effa"/>
      <stop offset="1" stop-color="#258ffb"/>
    </linearGradient>
  </defs>
  <path fill="url(#aiva-grad-1)" d="M1178.27,985.28l-162.51,352.82a53.71,53.71,0,0,1-48.78,31.24H681.76a53.71,53.71,0,0,1-48.78-31.24L379.19,787.12c-14.45-31.37,8.47-67.15,43-67.15H667.45a47.35,47.35,0,0,1,43,27.53l113.92,247.32C900.72,1139.51,1109.83,1133.87,1178.27,985.28Z"/>
  <path fill="url(#aiva-grad-2)" d="M1408.48,485.49,1213.99,907.73l-35.72,77.55c-68.44,148.59-277.55,154.23-353.9,9.55l252.86-548.95a47.34,47.34,0,0,1,43-27.53h245.25C1400.01,418.34,1422.93,454.12,1408.48,485.49Z"/>
</svg>
`;

/**
 * Shopify Embedded App Main Route
 * Returns HTML directly to work properly in Shopify's iframe
 */
export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');
  const host = request.nextUrl.searchParams.get('host') || '';
  
  if (!shop) {
    const cookieStore = await cookies();
    const shopFromCookie = cookieStore.get('shopify_shop')?.value;
    
    if (!shopFromCookie) {
      return new NextResponse('Missing shop parameter', { status: 400 });
    }
    
    const authUrl = `${process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io'}/api/shopify/auth?shop=${shopFromCookie}`;
    return NextResponse.redirect(authUrl);
  }

  const apiKey = process.env.SHOPIFY_API_KEY || '';
  const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';

  // Check if this shop is already linked to an Aiva user
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
    return renderPage('auth_required', {
      shop,
      host,
      apiKey,
      authUrl,
      shopName: shop.replace('.myshopify.com', ''),
    });
  }

  // Verify the access token is still valid
  const isTokenValid = await verifyShopAccess(shop, shopData.access_token);
  
  if (!isTokenValid) {
    const authUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
    return renderPage('auth_required', {
      shop,
      host,
      apiKey,
      authUrl,
      shopName: shop.replace('.myshopify.com', ''),
    });
  }

  // Get entitlement status
  const entitlement = await getEntitlementByShopDomain(shop);

  // Generate URLs for actions
  const isLinked = !!shopData.linked_user_id;
  let autoLoginUrl: string | undefined;
  let linkUrl: string | undefined;

  if (isLinked) {
    const token = generateLinkToken(shop, shopData.access_token);
    const url = new URL('/api/shopify/auto-login', appUrl);
    url.searchParams.set('token', token);
    url.searchParams.set('host', host);
    autoLoginUrl = url.toString();
  } else {
    const token = generateLinkToken(shop, shopData.access_token);
    const url = new URL('/en/shopify/link', appUrl);
    url.searchParams.set('token', token);
    url.searchParams.set('host', host);
    linkUrl = url.toString();
  }

  return renderPage('dashboard', {
    shop,
    host,
    apiKey,
    shopName: shopData.shop_name || shop.replace('.myshopify.com', ''),
    isLinked,
    autoLoginUrl,
    linkUrl,
    entitlement: entitlement ? {
      plan: entitlement.plan,
      status: entitlement.status,
      provider: entitlement.provider,
    } : null,
  });
}

interface PageData {
  shop: string;
  host: string;
  apiKey: string;
  shopName?: string;
  authUrl?: string;
  isLinked?: boolean;
  autoLoginUrl?: string;
  linkUrl?: string;
  entitlement?: {
    plan: string;
    status: string;
    provider: string;
  } | null;
}

function renderPage(type: 'auth_required' | 'dashboard', data: PageData): NextResponse {
  const { shop, host, apiKey, shopName = shop.replace('.myshopify.com', '') } = data;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aiva - AI Inbox Assistant</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: ${COLORS.grayLight};
      color: ${COLORS.navy};
      min-height: 100vh;
    }
    a { color: inherit; text-decoration: none; }
    
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
    
    .main { padding: 40px 16px; display: flex; justify-content: center; }
    .card {
      background: ${COLORS.white};
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.1);
      max-width: 480px;
      width: 100%;
      overflow: hidden;
    }
    .card-header {
      background: ${COLORS.navy};
      padding: 36px 32px;
      text-align: center;
    }
    .logo-box {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      background: ${COLORS.white};
      border-radius: 16px;
      padding: 12px;
    }
    .card-title { color: ${COLORS.white}; font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .card-subtitle { color: ${COLORS.gray}; font-size: 14px; }
    .card-content { padding: 28px 32px 36px; }
    
    .status-badge {
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
      gap: 14px;
    }
    .status-icon {
      width: 38px;
      height: 38px;
      background: ${COLORS.gradient};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${COLORS.white};
      font-size: 18px;
    }
    .status-title { color: ${COLORS.navy}; font-size: 14px; font-weight: 600; }
    .status-text { color: ${COLORS.gray}; font-size: 13px; }
    
    .plan-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: ${COLORS.grayLight};
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
    }
    .plan-label { color: ${COLORS.gray}; font-size: 13px; }
    .plan-value { color: ${COLORS.navy}; font-size: 14px; font-weight: 600; }
    .plan-status { margin-left: auto; display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.active { background: ${COLORS.green}; }
    .status-dot.trialing { background: ${COLORS.yellow}; }
    .status-dot.inactive { background: ${COLORS.red}; }
    .upgrade-link {
      margin-left: auto;
      background: none;
      border: none;
      color: ${COLORS.cyan};
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .features { margin-bottom: 28px; }
    .feature { display: flex; align-items: flex-start; margin-bottom: 16px; gap: 14px; }
    .feature-icon {
      width: 40px;
      height: 40px;
      background: ${COLORS.grayLight};
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .feature-title { color: ${COLORS.navy}; font-size: 14px; font-weight: 600; }
    .feature-text { color: ${COLORS.gray}; font-size: 13px; }
    
    .btn-primary {
      display: block;
      width: 100%;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      border: none;
      cursor: pointer;
      background: ${COLORS.gradient};
      color: ${COLORS.white};
      box-shadow: 0 4px 14px rgba(0, 212, 255, 0.35);
    }
    .btn-primary:hover { opacity: 0.9; }
    
    .note { text-align: center; margin-top: 14px; font-size: 12px; color: ${COLORS.gray}; }
    
    .warning-icon {
      width: 64px;
      height: 64px;
      background: #fef3c7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
    }
    .text-center { text-align: center; }
    .title { color: ${COLORS.navy}; font-size: 20px; margin-bottom: 12px; }
    .text { color: ${COLORS.gray}; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
  </style>
</head>
<body>
  ${type === 'auth_required' ? renderAuthRequired(data) : renderDashboard(data)}
  
  <script>
    const apiKey = '${apiKey}';
    const host = '${host}';
    
    function handleRedirect(url) {
      try {
        if (window['app-bridge'] && window['app-bridge'].createApp) {
          const AppBridge = window['app-bridge'];
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
    }
    
    function handleNavigate(path) {
      const url = '${process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io'}' + path + '?shop=${shop}&host=${host}';
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

function renderAuthRequired(data: PageData): string {
  return `
    <div class="main">
      <div class="card">
        <div class="card-header">
          <div class="logo-box">${AIVA_LOGO_SVG}</div>
          <h1 class="card-title">Aiva AI Inbox</h1>
          <p class="card-subtitle">Your intelligent communication assistant</p>
        </div>
        <div class="card-content text-center">
          <div class="warning-icon">⚠️</div>
          <h2 class="title">Authorization Required</h2>
          <p class="text">
            Your store <strong>${data.shopName}</strong> needs to be authorized.
            Click below to complete the setup.
          </p>
          <button class="btn-primary" onclick="handleRedirect('${data.authUrl}')">
            Authorize App →
          </button>
          <p class="note">Opens in a new window</p>
        </div>
      </div>
    </div>
  `;
}

function renderDashboard(data: PageData): string {
  const { shopName, isLinked, autoLoginUrl, linkUrl, entitlement } = data;
  
  const planBadgeHtml = entitlement ? `
    <div class="plan-badge">
      <span class="plan-label">Current Plan:</span>
      <span class="plan-value">${entitlement.plan.charAt(0).toUpperCase() + entitlement.plan.slice(1)}</span>
      <div class="plan-status">
        <span class="status-dot ${entitlement.status === 'active' ? 'active' : entitlement.status === 'trialing' ? 'trialing' : 'inactive'}"></span>
        <span style="color: ${COLORS.gray}; font-size: 12px; text-transform: capitalize;">${entitlement.status}</span>
      </div>
    </div>
  ` : `
    <div class="plan-badge">
      <span class="plan-label">Current Plan:</span>
      <span class="plan-value">Free</span>
      <button class="upgrade-link" onclick="handleNavigate('/shopify/billing')">Upgrade →</button>
    </div>
  `;

  const actionButtonHtml = isLinked && autoLoginUrl ? `
    <button class="btn-primary" onclick="handleRedirect('${autoLoginUrl}')">
      Open Aiva Dashboard →
    </button>
  ` : linkUrl ? `
    <button class="btn-primary" onclick="handleRedirect('${linkUrl}')">
      Connect Your Account →
    </button>
  ` : '';

  return `
    <nav class="nav">
      <div class="nav-inner">
        <div class="nav-left">
          <span class="nav-logo">Aiva</span>
          <button class="nav-link active">Dashboard</button>
          <button class="nav-link" onclick="handleNavigate('/shopify/billing')">Billing</button>
        </div>
        <div>
          <span class="shop-badge">${shopName}</span>
        </div>
      </div>
    </nav>
    
    <div class="main">
      <div class="card">
        <div class="card-header">
          <div class="logo-box">${AIVA_LOGO_SVG}</div>
          <h1 class="card-title">Aiva AI Inbox</h1>
          <p class="card-subtitle">Your intelligent communication assistant</p>
        </div>
        <div class="card-content">
          <div class="status-badge">
            <div class="status-icon">✓</div>
            <div>
              <div class="status-title">Store Connected</div>
              <div class="status-text">${shopName} is linked to Aiva</div>
            </div>
          </div>
          
          ${planBadgeHtml}
          
          <div class="features">
            <div class="feature">
              <div class="feature-icon">🛒</div>
              <div>
                <div class="feature-title">Shopify Data Sync</div>
                <div class="feature-text">Orders, customers & products for AI context</div>
              </div>
            </div>
            <div class="feature">
              <div class="feature-icon">🤖</div>
              <div>
                <div class="feature-title">Smart Replies</div>
                <div class="feature-text">AI drafts using your store's context</div>
              </div>
            </div>
            <div class="feature">
              <div class="feature-icon">📬</div>
              <div>
                <div class="feature-title">Unified Inbox</div>
                <div class="feature-text">All messages in one place</div>
              </div>
            </div>
          </div>
          
          ${actionButtonHtml}
          <p class="note">Opens in a new tab for the full experience</p>
        </div>
      </div>
    </div>
  `;
}
