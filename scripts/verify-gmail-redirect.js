#!/usr/bin/env node

/**
 * Script to verify the Gmail redirect URI matches Google Cloud Console
 * This helps debug redirect_uri_mismatch errors
 */

// Simulate the same logic as the Gmail route
function getRedirectUri() {
  const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
  
  let redirectUri;
  if (NEXT_PUBLIC_SITE_URL) {
    // Use configured site URL - normalize it
    let siteUrl = NEXT_PUBLIC_SITE_URL.trim();
    // Remove trailing slash
    siteUrl = siteUrl.replace(/\/$/, '');
    // Ensure it starts with https:// (for production)
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = `https://${siteUrl}`;
    }
    // For production, always use HTTPS (convert http:// to https://)
    if (siteUrl.startsWith('http://') && !siteUrl.includes('localhost')) {
      siteUrl = siteUrl.replace('http://', 'https://');
    }
    redirectUri = `${siteUrl}/api/auth/gmail/callback`;
  } else {
    redirectUri = 'http://localhost:3000/api/auth/gmail/callback';
  }
  
  return redirectUri;
}

const expectedUri = 'https://www.tryaiva.io/api/auth/gmail/callback';
const actualUri = getRedirectUri();

console.log('🔍 Gmail Redirect URI Verification\n');
console.log('Expected (Google Cloud Console):', expectedUri);
console.log('Actual (from code):            ', actualUri);
console.log('Match:', actualUri === expectedUri ? '✅ YES' : '❌ NO');

if (actualUri !== expectedUri) {
  console.log('\n⚠️  MISMATCH DETECTED!');
  console.log('Possible issues:');
  console.log('  1. NEXT_PUBLIC_SITE_URL environment variable is not set correctly');
  console.log('  2. Environment variable has trailing slash or different format');
  console.log('  3. Code needs to be redeployed after setting environment variable');
  console.log('\nCurrent NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET');
} else {
  console.log('\n✅ Redirect URI matches! If you still get errors:');
  console.log('  1. Make sure the code is redeployed after setting NEXT_PUBLIC_SITE_URL');
  console.log('  2. Check Google Cloud Console has EXACTLY this URI (case-sensitive)');
  console.log('  3. Wait a few minutes for Google to propagate changes');
}

