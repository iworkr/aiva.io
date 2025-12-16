import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * This is the main app URL that Shopify loads in an iframe
 * when merchants click on the app in their admin.
 * 
 * It automatically redirects to the Aiva dashboard in a new tab.
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
  
  // Build the dashboard URL with shop context
  const dashboardUrl = new URL('/en/dashboard', process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io');
  dashboardUrl.searchParams.set('shop', shop);
  dashboardUrl.searchParams.set('from', 'shopify');
  
  const apiKey = process.env.SHOPIFY_API_KEY || '';
  
  // Auto-redirect to external dashboard immediately
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening Aiva...</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f6f6f7;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e1e3e5;
      border-top-color: #008060;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 {
      color: #202223;
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    p {
      color: #6d7175;
      font-size: 14px;
    }
    .fallback {
      margin-top: 24px;
    }
    .btn {
      display: inline-block;
      background: #008060;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
    }
    .btn:hover {
      background: #006e52;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Opening Aiva Dashboard...</h2>
    <p>You'll be redirected to your inbox in a moment.</p>
    <div class="fallback" id="fallback" style="display: none;">
      <p style="margin-bottom: 12px;">If you're not redirected automatically:</p>
      <a href="${dashboardUrl.toString()}" class="btn" target="_blank" rel="noopener">Open Dashboard Manually</a>
    </div>
  </div>
  
  <script>
    (function() {
      const dashboardUrl = '${dashboardUrl.toString()}';
      
      // Try App Bridge first (for proper Shopify integration)
      try {
        const AppBridge = window['app-bridge'];
        if (AppBridge && AppBridge.createApp) {
          const app = AppBridge.createApp({
            apiKey: '${apiKey}',
            host: '${host}',
          });
          
          // Use App Bridge Redirect to open externally
          const Redirect = AppBridge.actions.Redirect;
          if (Redirect) {
            const redirect = Redirect.create(app);
            // REMOTE opens in a new tab outside Shopify admin
            redirect.dispatch(Redirect.Action.REMOTE, dashboardUrl);
            return;
          }
        }
      } catch (e) {
        console.log('App Bridge redirect failed:', e);
      }
      
      // Fallback: open in new tab directly
      const newWindow = window.open(dashboardUrl, '_blank');
      if (newWindow) {
        // Show success message
        document.querySelector('h2').textContent = 'Aiva Dashboard Opened!';
        document.querySelector('p').textContent = 'Check the new tab that just opened.';
        document.querySelector('.spinner').style.display = 'none';
      } else {
        // Popup blocked - show manual link
        document.getElementById('fallback').style.display = 'block';
        document.querySelector('.spinner').style.display = 'none';
        document.querySelector('h2').textContent = 'Almost there!';
        document.querySelector('p').textContent = 'Please click the button below to open Aiva.';
      }
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
