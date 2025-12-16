import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * This is the main app URL that Shopify loads in an iframe
 * when merchants click on the app in their admin
 */
export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');
  const host = request.nextUrl.searchParams.get('host');
  
  if (!shop) {
    // Try to get from cookie
    const cookieStore = await cookies();
    const shopFromCookie = cookieStore.get('shopify_shop')?.value;
    
    if (!shopFromCookie) {
      return new NextResponse('Missing shop parameter', { status: 400 });
    }
    
    // Redirect to auth if we don't have shop in URL
    const authUrl = `${process.env.SHOPIFY_APP_URL}/api/shopify/auth?shop=${shopFromCookie}`;
    return NextResponse.redirect(authUrl);
  }
  
  // For now, redirect to the Aiva dashboard with Shopify context
  // In the future, this could be a full embedded experience
  const dashboardUrl = new URL('/en/dashboard', process.env.SHOPIFY_APP_URL || 'https://www.tryaiva.io');
  dashboardUrl.searchParams.set('shop', shop);
  if (host) {
    dashboardUrl.searchParams.set('host', host);
  }
  dashboardUrl.searchParams.set('embedded', '1');
  
  // Create HTML that uses App Bridge to redirect properly
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aiva - AI Inbox Assistant</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
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
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 480px;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
    }
    h1 {
      color: #202223;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #6d7175;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #008060;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #006e52;
    }
    .features {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e1e3e5;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      text-align: left;
      margin-bottom: 16px;
    }
    .feature-icon {
      margin-right: 12px;
      font-size: 20px;
    }
    .feature-text {
      color: #6d7175;
      font-size: 13px;
    }
    .feature-text strong {
      color: #202223;
      display: block;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <svg class="logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#008060"/>
      <text x="50" y="65" font-family="Arial" font-size="40" font-weight="bold" fill="white" text-anchor="middle">A</text>
    </svg>
    <h1>Welcome to Aiva</h1>
    <p>AI-powered inbox assistant that helps you manage customer communications, automate responses, and never miss important messages.</p>
    
    <a href="${dashboardUrl.toString()}" class="btn" id="openApp">Open Aiva Dashboard</a>
    
    <div class="features">
      <div class="feature">
        <span class="feature-icon">📬</span>
        <div class="feature-text">
          <strong>Unified Inbox</strong>
          All your customer messages in one place
        </div>
      </div>
      <div class="feature">
        <span class="feature-icon">🤖</span>
        <div class="feature-text">
          <strong>AI-Powered Replies</strong>
          Smart draft responses that match your tone
        </div>
      </div>
      <div class="feature">
        <span class="feature-icon">⚡</span>
        <div class="feature-text">
          <strong>Automated Actions</strong>
          Schedule sends and extract tasks automatically
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // Initialize Shopify App Bridge
    const AppBridge = window['app-bridge'];
    if (AppBridge) {
      const app = AppBridge.createApp({
        apiKey: '${process.env.SHOPIFY_API_KEY}',
        host: '${host || ''}',
      });
      
      // Handle navigation to external app
      document.getElementById('openApp').addEventListener('click', function(e) {
        e.preventDefault();
        const Redirect = AppBridge.actions.Redirect;
        const redirect = Redirect.create(app);
        redirect.dispatch(Redirect.Action.REMOTE, '${dashboardUrl.toString()}');
      });
    }
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

