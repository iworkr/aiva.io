import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { generateLinkToken } from '@/lib/shopify/tokens';

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
};

/**
 * This is the main app URL that Shopify loads in an iframe
 * when merchants click on the app in their admin.
 * 
 * Flow:
 * 1. Check if shop is already linked to an Aiva user
 * 2. If linked: redirect to auto-login endpoint
 * 3. If not linked: redirect to linking page with secure token
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
    
    // Redirect to auth flow if no shop in params
    const authUrl = `${process.env.SHOPIFY_APP_URL}/api/shopify/auth?shop=${shopFromCookie}`;
    return NextResponse.redirect(authUrl);
  }
  
  const apiKey = process.env.SHOPIFY_API_KEY || '';
  const appUrl = process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io';
  
  // Check if this shop is already linked to an Aiva user
  const { data: shopData, error } = await supabaseAdminClient
    .from('shopify_stores')
    .select('id, linked_user_id, access_token, shop_name')
    .eq('shop_domain', shop)
    .eq('is_active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching shop data:', error);
  }
  
  // If shop is linked to a user, show the dashboard opener
  if (shopData?.linked_user_id && shopData?.access_token) {
    const token = generateLinkToken(shop, shopData.access_token);
    const autoLoginUrl = new URL('/api/shopify/auto-login', appUrl);
    autoLoginUrl.searchParams.set('token', token);
    autoLoginUrl.searchParams.set('host', host);
    
    return renderDashboardPage(shop, host, apiKey, autoLoginUrl.toString());
  }
  
  // If shop exists but not linked, generate token for linking
  if (shopData?.access_token) {
    const token = generateLinkToken(shop, shopData.access_token);
    const linkUrl = new URL('/en/shopify/link', appUrl);
    linkUrl.searchParams.set('token', token);
    linkUrl.searchParams.set('host', host);
    
    return renderLinkingPage(shop, host, apiKey, linkUrl.toString());
  }
  
  // Shop not found in database - redirect to OAuth flow
  const authUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
  return NextResponse.redirect(authUrl);
}

/**
 * Render the main dashboard page for linked stores
 */
function renderDashboardPage(
  shop: string,
  host: string,
  apiKey: string,
  dashboardUrl: string
): NextResponse {
  const shopDisplayName = shop.replace('.myshopify.com', '');
  const logoUrl = 'https://www.tryaiva.io/aiva-logo/2x/Asset%2082@2x-100.jpg';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aiva - AI Inbox Assistant</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: ${COLORS.grayLight};
    }
    .card {
      background: ${COLORS.white};
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.1);
      max-width: 420px;
      width: 92%;
      overflow: hidden;
    }
    .header {
      background: ${COLORS.navy};
      padding: 36px 32px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: ${COLORS.gradient};
    }
    .logo-container {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .header h1 {
      color: ${COLORS.white};
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }
    .header p {
      color: ${COLORS.gray};
      font-size: 14px;
    }
    .content {
      padding: 28px 32px 36px;
    }
    .status-badge {
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .status-icon {
      width: 38px;
      height: 38px;
      background: ${COLORS.gradient};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 14px;
      flex-shrink: 0;
    }
    .status-icon svg {
      width: 20px;
      height: 20px;
      fill: ${COLORS.white};
    }
    .status-text strong {
      display: block;
      color: ${COLORS.navy};
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .status-text span {
      color: ${COLORS.gray};
      font-size: 13px;
    }
    .features {
      margin-bottom: 28px;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .feature:last-child { margin-bottom: 0; }
    .feature-icon {
      width: 40px;
      height: 40px;
      background: ${COLORS.grayLight};
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 14px;
      font-size: 18px;
      flex-shrink: 0;
    }
    .feature-text strong {
      display: block;
      color: ${COLORS.navy};
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .feature-text span {
      color: ${COLORS.gray};
      font-size: 13px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      background: ${COLORS.gradient};
      color: ${COLORS.white};
      box-shadow: 0 4px 14px rgba(0, 212, 255, 0.35);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.45);
    }
    .btn:active {
      transform: translateY(0);
    }
    .note {
      text-align: center;
      margin-top: 14px;
      font-size: 12px;
      color: ${COLORS.gray};
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-container">
        <img src="${logoUrl}" alt="Aiva" />
      </div>
      <h1>Aiva AI Inbox</h1>
      <p>Your intelligent communication assistant</p>
    </div>
    
    <div class="content">
      <div class="status-badge">
        <div class="status-icon">
          <svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        </div>
        <div class="status-text">
          <strong>Store Connected</strong>
          <span>${shopDisplayName} is linked to Aiva</span>
        </div>
      </div>
      
      <div class="features">
        <div class="feature">
          <div class="feature-icon">🛒</div>
          <div class="feature-text">
            <strong>Shopify Data Sync</strong>
            <span>Orders, customers & products for AI context</span>
          </div>
        </div>
        <div class="feature">
          <div class="feature-icon">🤖</div>
          <div class="feature-text">
            <strong>Smart Replies</strong>
            <span>AI drafts using your store's context</span>
          </div>
        </div>
        <div class="feature">
          <div class="feature-icon">📬</div>
          <div class="feature-text">
            <strong>Unified Inbox</strong>
            <span>All messages in one place</span>
          </div>
        </div>
      </div>
      
      <button class="btn" id="openDashboard">
        Open Aiva Dashboard →
      </button>
      
      <p class="note">Opens in a new tab for the full experience</p>
    </div>
  </div>
  
  <script>
    (function() {
      const dashboardUrl = '${dashboardUrl}';
      const btn = document.getElementById('openDashboard');
      
      btn.addEventListener('click', function() {
        try {
          const AppBridge = window['app-bridge'];
          if (AppBridge && AppBridge.createApp) {
            const app = AppBridge.createApp({
              apiKey: '${apiKey}',
              host: '${host}',
            });
            
            const Redirect = AppBridge.actions.Redirect;
            if (Redirect) {
              const redirect = Redirect.create(app);
              redirect.dispatch(Redirect.Action.REMOTE, dashboardUrl);
              return;
            }
          }
        } catch (e) {
          console.log('App Bridge error:', e);
        }
        
        window.open(dashboardUrl, '_blank');
      });
    })();
  </script>
</body>
</html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
    },
  });
}

/**
 * Render the linking page for new stores
 */
function renderLinkingPage(
  shop: string,
  host: string,
  apiKey: string,
  linkUrl: string
): NextResponse {
  const shopDisplayName = shop.replace('.myshopify.com', '');
  const logoUrl = 'https://www.tryaiva.io/aiva-logo/2x/Asset%2082@2x-100.jpg';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aiva - Connect Your Account</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: ${COLORS.grayLight};
    }
    .card {
      background: ${COLORS.white};
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.1);
      max-width: 420px;
      width: 92%;
      overflow: hidden;
    }
    .header {
      background: ${COLORS.navy};
      padding: 36px 32px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: ${COLORS.gradient};
    }
    .logo-container {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .header h1 {
      color: ${COLORS.white};
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }
    .header p {
      color: ${COLORS.gray};
      font-size: 14px;
    }
    .content {
      padding: 28px 32px 36px;
    }
    .shop-badge {
      display: inline-flex;
      align-items: center;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 13px;
      color: ${COLORS.navy};
    }
    .shop-badge svg {
      width: 18px;
      height: 18px;
      margin-right: 8px;
    }
    .shop-badge svg path {
      fill: url(#cyanGradient);
    }
    .intro {
      color: ${COLORS.gray};
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      background: ${COLORS.gradient};
      color: ${COLORS.white};
      box-shadow: 0 4px 14px rgba(0, 212, 255, 0.35);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.45);
    }
    .btn:active {
      transform: translateY(0);
    }
    .note {
      text-align: center;
      margin-top: 14px;
      font-size: 12px;
      color: ${COLORS.gray};
    }
  </style>
</head>
<body>
  <!-- SVG gradient definition for icons -->
  <svg width="0" height="0" style="position:absolute">
    <defs>
      <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00d4ff"/>
        <stop offset="100%" style="stop-color:#3b82f6"/>
      </linearGradient>
    </defs>
  </svg>

  <div class="card">
    <div class="header">
      <div class="logo-container">
        <img src="${logoUrl}" alt="Aiva" />
      </div>
      <h1>Connect Your Account</h1>
      <p>Link ${shopDisplayName} to Aiva</p>
    </div>
    
    <div class="content">
      <div class="shop-badge">
        <svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        ${shopDisplayName} is ready to connect
      </div>
      
      <p class="intro">
        To use Aiva with your Shopify store, connect it to your Aiva account. 
        This enables AI-powered replies with full context from your orders, customers, and products.
      </p>
      
      <button class="btn" id="openLink">
        Continue Setup →
      </button>
      
      <p class="note">Opens in a new tab to complete setup</p>
    </div>
  </div>
  
  <script>
    (function() {
      const linkUrl = '${linkUrl}';
      const btn = document.getElementById('openLink');
      
      btn.addEventListener('click', function() {
        try {
          const AppBridge = window['app-bridge'];
          if (AppBridge && AppBridge.createApp) {
            const app = AppBridge.createApp({
              apiKey: '${apiKey}',
              host: '${host}',
            });
            
            const Redirect = AppBridge.actions.Redirect;
            if (Redirect) {
              const redirect = Redirect.create(app);
              redirect.dispatch(Redirect.Action.REMOTE, linkUrl);
              return;
            }
          }
        } catch (e) {
          console.log('App Bridge error:', e);
        }
        
        window.open(linkUrl, '_blank');
      });
    })();
  </script>
</body>
</html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
    },
  });
}
