import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { generateLinkToken } from '@/lib/shopify/tokens';

export const dynamic = 'force-dynamic';

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
  
  // If shop is linked to a user, redirect to auto-login
  if (shopData?.linked_user_id && shopData?.access_token) {
    const token = generateLinkToken(shop, shopData.access_token);
    const autoLoginUrl = new URL('/api/shopify/auto-login', appUrl);
    autoLoginUrl.searchParams.set('token', token);
    autoLoginUrl.searchParams.set('host', host);
    
    return renderRedirectPage(shop, host, apiKey, autoLoginUrl.toString(), 'Logging you in...', true);
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
 * Render a page that auto-redirects to the given URL
 */
function renderRedirectPage(
  shop: string,
  host: string,
  apiKey: string,
  redirectUrl: string,
  message: string,
  autoRedirect: boolean
): NextResponse {
  const shopDisplayName = shop.replace('.myshopify.com', '');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aiva - AI Inbox Assistant</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 400px;
      width: 90%;
      padding: 48px 32px;
      text-align: center;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #008060;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { color: #1f2937; font-size: 20px; margin: 0 0 8px; }
    p { color: #6b7280; font-size: 14px; margin: 0; }
    .shop { color: #008060; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>${message}</h1>
    <p>Store: <span class="shop">${shopDisplayName}</span></p>
  </div>
  
  <script>
    (function() {
      const redirectUrl = '${redirectUrl}';
      
      ${autoRedirect ? `
      // Auto-redirect using App Bridge
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
            redirect.dispatch(Redirect.Action.REMOTE, redirectUrl);
            return;
          }
        }
      } catch (e) {
        console.log('App Bridge error:', e);
      }
      
      // Fallback: direct redirect
      window.location.href = redirectUrl;
      ` : ''}
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
 * Render the linking page with options
 */
function renderLinkingPage(
  shop: string,
  host: string,
  apiKey: string,
  linkUrl: string
): NextResponse {
  const shopDisplayName = shop.replace('.myshopify.com', '');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aiva - Connect Your Account</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 420px;
      width: 90%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #008060 0%, #004c3f 100%);
      padding: 32px;
      text-align: center;
    }
    .logo {
      width: 64px;
      height: 64px;
      background: white;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 32px;
      font-weight: bold;
      color: #008060;
    }
    .header h1 {
      color: white;
      font-size: 22px;
      margin: 0 0 8px;
      font-weight: 600;
    }
    .header p {
      color: rgba(255,255,255,0.85);
      font-size: 14px;
      margin: 0;
    }
    .content { padding: 24px 32px 32px; }
    .shop-badge {
      display: inline-flex;
      align-items: center;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #166534;
    }
    .shop-badge svg {
      width: 16px;
      height: 16px;
      fill: #22c55e;
      margin-right: 6px;
    }
    .intro {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      margin-bottom: 12px;
    }
    .btn-primary {
      background: #008060;
      color: white;
    }
    .btn-primary:hover { background: #006e52; }
    .note {
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">A</div>
      <h1>Connect Your Account</h1>
      <p>Link ${shopDisplayName} to Aiva</p>
    </div>
    
    <div class="content">
      <div class="shop-badge">
        <svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        ${shopDisplayName} is ready to connect
      </div>
      
      <p class="intro">
        To use Aiva with your Shopify store, you need to connect it to an Aiva account. 
        Choose how you'd like to continue:
      </p>
      
      <button class="btn btn-primary" id="openLink">
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
