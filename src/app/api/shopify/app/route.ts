import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { generateLinkToken } from '@/lib/shopify/tokens';
import { verifyShopAccess } from '@/lib/shopify/client';

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

// Official Aiva logo SVG - the V checkmark with cyan-blue gradient
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
 * This is the main app URL that Shopify loads in an iframe
 * when merchants click on the app in their admin.
 * 
 * Flow:
 * 1. Check if shop is already linked to an Aiva user
 * 2. If linked: show dashboard page
 * 3. If not linked: show linking page
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
  
  // If shop exists, verify the token is still valid
  if (shopData?.access_token) {
    console.log(`[Shopify App] Verifying token for shop ${shop}`);
    const isTokenValid = await verifyShopAccess(shop, shopData.access_token);
    
    if (!isTokenValid) {
      console.log(`[Shopify App] Token invalid for shop ${shop}, redirecting to OAuth`);
      // Token is invalid - redirect to OAuth to get a fresh token
      // Use App Bridge redirect if in iframe, otherwise regular redirect
      const authUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
      
      // If we have host parameter (Shopify App Bridge context), use App Bridge redirect
      if (host) {
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body>
  <script>
    (function() {
      try {
        var AppBridge = window['app-bridge'];
        if (AppBridge && AppBridge.createApp) {
          var app = AppBridge.createApp({
            apiKey: '${apiKey}',
            host: '${host}',
          });
          var Redirect = AppBridge.actions.Redirect;
          if (Redirect) {
            var redirect = Redirect.create(app);
            redirect.dispatch(Redirect.Action.REMOTE, '${authUrl}');
            return;
          }
        }
      } catch (e) {
        console.log('App Bridge error:', e);
      }
      window.location.href = '${authUrl}';
    })();
  </script>
</body>
</html>`;
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Security-Policy': "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
          },
        });
      }
      
      // Regular server-side redirect (for non-iframe contexts)
      return NextResponse.redirect(authUrl);
    }
    
    // Token is valid - proceed with normal flow
    // If shop is linked to a user, show dashboard opener
    if (shopData.linked_user_id) {
      const token = generateLinkToken(shop, shopData.access_token);
      const autoLoginUrl = new URL('/api/shopify/auto-login', appUrl);
      autoLoginUrl.searchParams.set('token', token);
      autoLoginUrl.searchParams.set('host', host);
      
      return renderDashboardPage(shop, host, apiKey, autoLoginUrl.toString());
    }
    
    // Shop exists with valid token but not linked - show linking page
    const token = generateLinkToken(shop, shopData.access_token);
    const linkUrl = new URL('/en/shopify/link', appUrl);
    linkUrl.searchParams.set('token', token);
    linkUrl.searchParams.set('host', host);
    
    return renderLinkingPage(shop, host, apiKey, linkUrl.toString());
  }
  
  // Shop not found - show reinstall message (OAuth can't work in iframe)
  return renderReinstallPage(shop, host, apiKey, appUrl);
}

function renderReinstallPage(
  shop: string,
  host: string,
  apiKey: string,
  appUrl: string
): NextResponse {
  const shopDisplayName = shop.replace('.myshopify.com', '');
  const installUrl = `${appUrl}/api/shopify/auth?shop=${shop}`;
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aiva - Setup Required</title>
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
      text-align: center;
    }
    .header {
      background: ${COLORS.navy};
      padding: 36px 32px;
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
    .logo-box {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      background: ${COLORS.white};
      border-radius: 16px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header h1 {
      color: ${COLORS.white};
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .header p {
      color: ${COLORS.gray};
      font-size: 14px;
    }
    .content {
      padding: 32px;
    }
    .icon-warning {
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
    h2 {
      color: ${COLORS.navy};
      font-size: 20px;
      margin-bottom: 12px;
    }
    p {
      color: ${COLORS.gray};
      font-size: 14px;
      line-height: 1.6;
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
      background: ${COLORS.gradient};
      color: ${COLORS.white};
      box-shadow: 0 4px 14px rgba(0, 212, 255, 0.35);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.45);
    }
    .note {
      margin-top: 16px;
      font-size: 12px;
      color: ${COLORS.gray};
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-box">${AIVA_LOGO_SVG}</div>
      <h1>Aiva AI Inbox</h1>
      <p>Your intelligent communication assistant</p>
    </div>
    
    <div class="content">
      <div class="icon-warning">⚠️</div>
      <h2>Setup Required</h2>
      <p>
        Your store <strong>${shopDisplayName}</strong> needs to complete the Aiva setup. 
        Click below to authorize the connection.
      </p>
      
      <button class="btn" id="setupBtn">Complete Setup →</button>
      <p class="note">Opens authorization in a new tab</p>
    </div>
  </div>
  
  <script>
    (function() {
      var installUrl = '${installUrl}';
      var btn = document.getElementById('setupBtn');
      
      btn.addEventListener('click', function() {
        try {
          var AppBridge = window['app-bridge'];
          if (AppBridge && AppBridge.createApp) {
            var app = AppBridge.createApp({
              apiKey: '${apiKey}',
              host: '${host}',
            });
            var Redirect = AppBridge.actions.Redirect;
            if (Redirect) {
              var redirect = Redirect.create(app);
              redirect.dispatch(Redirect.Action.REMOTE, installUrl);
              return;
            }
          }
        } catch (e) {
          console.log('App Bridge error:', e);
        }
        window.open(installUrl, '_blank');
      });
    })();
  </script>
</body>
</html>`;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
    },
  });
}

function renderDashboardPage(
  shop: string,
  host: string,
  apiKey: string,
  dashboardUrl: string
): NextResponse {
  const shopDisplayName = shop.replace('.myshopify.com', '');
  
  const html = `<!DOCTYPE html>
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
    .logo-box {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      background: ${COLORS.white};
      border-radius: 16px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header h1 {
      color: ${COLORS.white};
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
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
      background: ${COLORS.gradient};
      color: ${COLORS.white};
      box-shadow: 0 4px 14px rgba(0, 212, 255, 0.35);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.45);
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
      <div class="logo-box">${AIVA_LOGO_SVG}</div>
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
      
      <button class="btn" id="openDashboard">Open Aiva Dashboard →</button>
      <p class="note">Opens in a new tab for the full experience</p>
    </div>
  </div>
  
  <script>
    (function() {
      var dashboardUrl = '${dashboardUrl}';
      var btn = document.getElementById('openDashboard');
      
      btn.addEventListener('click', function() {
        try {
          var AppBridge = window['app-bridge'];
          if (AppBridge && AppBridge.createApp) {
            var app = AppBridge.createApp({
              apiKey: '${apiKey}',
              host: '${host}',
            });
            var Redirect = AppBridge.actions.Redirect;
            if (Redirect) {
              var redirect = Redirect.create(app);
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
</html>`;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
    },
  });
}

function renderLinkingPage(
  shop: string,
  host: string,
  apiKey: string,
  linkUrl: string
): NextResponse {
  const shopDisplayName = shop.replace('.myshopify.com', '');
  
  const html = `<!DOCTYPE html>
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
    .logo-box {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      background: ${COLORS.white};
      border-radius: 16px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header h1 {
      color: ${COLORS.white};
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
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
      fill: ${COLORS.cyan};
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
      background: ${COLORS.gradient};
      color: ${COLORS.white};
      box-shadow: 0 4px 14px rgba(0, 212, 255, 0.35);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.45);
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
      <div class="logo-box">${AIVA_LOGO_SVG}</div>
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
      
      <button class="btn" id="openLink">Continue Setup →</button>
      <p class="note">Opens in a new tab to complete setup</p>
    </div>
  </div>
  
  <script>
    (function() {
      var linkUrl = '${linkUrl}';
      var btn = document.getElementById('openLink');
      
      btn.addEventListener('click', function() {
        try {
          var AppBridge = window['app-bridge'];
          if (AppBridge && AppBridge.createApp) {
            var app = AppBridge.createApp({
              apiKey: '${apiKey}',
              host: '${host}',
            });
            var Redirect = AppBridge.actions.Redirect;
            if (Redirect) {
              var redirect = Redirect.create(app);
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
</html>`;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
    },
  });
}
