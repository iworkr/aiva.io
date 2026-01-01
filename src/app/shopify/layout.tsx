/**
 * Shopify Embedded App Layout
 * Provides common styling and App Bridge context for all Shopify app pages
 */

import { Metadata } from 'next';
import Script from 'next/script';

// Force dynamic rendering - never cache this layout
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Aiva - AI Inbox Assistant',
  description: 'Intelligent communication assistant for Shopify merchants',
};

export default function ShopifyAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* App Bridge script - loaded from CDN for iframe compatibility */}
      <Script 
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js" 
        strategy="beforeInteractive"
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .shopify-app-container * { box-sizing: border-box; }
        .shopify-app-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #f1f5f9;
          color: #0f172a;
          min-height: 100vh;
          margin: 0;
          padding: 0;
        }
        .shopify-app-container a { color: inherit; text-decoration: none; }
        .shopify-app-container button { font-family: inherit; }
      `}} />
      <div className="shopify-app-container">
        {children}
      </div>
    </>
  );
}
