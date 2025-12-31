/**
 * Shopify Embedded App Layout
 * Provides App Bridge context and navigation for all Shopify app pages
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aiva - AI Inbox Assistant',
  description: 'Intelligent communication assistant for Shopify merchants',
};

export default function ShopifyAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout wraps all Shopify embedded app pages
  // The actual App Bridge initialization happens in each page's client component
  // because we need access to the shop and host parameters
  return (
    <html lang="en">
      <head>
        {/* App Bridge script - loaded from CDN for iframe compatibility */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" async />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f1f5f9;
            color: #0f172a;
            min-height: 100vh;
          }
          a { color: inherit; text-decoration: none; }
          button { font-family: inherit; }
        `}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
