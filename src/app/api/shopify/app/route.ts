import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * This is the main app URL that Shopify loads in an iframe
 * when merchants click on the app in their admin.
 * 
 * Redirects to the multi-page app structure at /shopify
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
    
    // Redirect to the new app structure
    const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
    const redirectUrl = new URL('/shopify', appUrl);
    redirectUrl.searchParams.set('shop', shopFromCookie);
    redirectUrl.searchParams.set('host', host);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Redirect to the new app structure
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
  const redirectUrl = new URL('/shopify', appUrl);
  redirectUrl.searchParams.set('shop', shop);
  redirectUrl.searchParams.set('host', host);
  return NextResponse.redirect(redirectUrl);
}
