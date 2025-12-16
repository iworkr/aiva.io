import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * This is the main app URL that Shopify loads in an iframe
 * when merchants click on the app in their admin.
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
  
  // Clean shop name for display
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
    .content {
      padding: 24px 32px 32px;
    }
    .connected {
      display: flex;
      align-items: center;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .connected-icon {
      width: 32px;
      height: 32px;
      background: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .connected-icon svg {
      width: 16px;
      height: 16px;
      fill: white;
    }
    .connected-text {
      font-size: 13px;
      color: #166534;
    }
    .connected-text strong {
      display: block;
      color: #14532d;
      margin-bottom: 2px;
    }
    .features {
      margin-bottom: 24px;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .feature:last-child {
      margin-bottom: 0;
    }
    .feature-icon {
      width: 36px;
      height: 36px;
      background: #f3f4f6;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 18px;
      flex-shrink: 0;
    }
    .feature-text {
      padding-top: 2px;
    }
    .feature-text strong {
      display: block;
      color: #1f2937;
      font-size: 14px;
      margin-bottom: 2px;
    }
    .feature-text span {
      color: #6b7280;
      font-size: 13px;
    }
    .btn {
      display: block;
      width: 100%;
      background: #008060;
      color: white;
      padding: 14px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #006e52;
    }
    .btn-icon {
      display: inline-block;
      margin-left: 8px;
    }
    .note {
      text-align: center;
      margin-top: 16px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">A</div>
      <h1>Aiva AI Inbox</h1>
      <p>Your intelligent communication assistant</p>
    </div>
    
    <div class="content">
      <div class="connected">
        <div class="connected-icon">
          <svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        </div>
        <div class="connected-text">
          <strong>Store Connected</strong>
          ${shopDisplayName} is linked to Aiva
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
        Open Aiva Dashboard
        <span class="btn-icon">→</span>
      </button>
      
      <p class="note">Opens in a new tab for the full experience</p>
    </div>
  </div>
  
  <script>
    (function() {
      const dashboardUrl = '${dashboardUrl.toString()}';
      const btn = document.getElementById('openDashboard');
      
      btn.addEventListener('click', function() {
        // Try App Bridge first
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
        
        // Fallback: open in new tab
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
