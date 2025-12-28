/**
 * Shopify Token Utilities
 * Secure token generation and verification for Shopify linking flow
 */

import crypto from 'crypto';

const TOKEN_SECRET = process.env.SHOPIFY_API_SECRET || '';
const TOKEN_EXPIRY_SECONDS = 300; // 5 minutes

interface ShopifyLinkToken {
  shop: string;
  accessToken: string;
  exp: number;
  iat: number;
}

/**
 * Generate a signed token for the Shopify linking flow
 * This token allows the linking page to securely identify which shop is being linked
 */
export function generateLinkToken(shopDomain: string, accessToken: string): string {
  const now = Math.floor(Date.now() / 1000);
  
  const payload: ShopifyLinkToken = {
    shop: shopDomain,
    accessToken: accessToken,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };
  
  const payloadString = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadString).toString('base64url');
  
  // Create HMAC signature
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a link token
 * Returns the payload if valid, throws error if invalid or expired
 */
export function verifyLinkToken(token: string): ShopifyLinkToken {
  if (!token || !token.includes('.')) {
    throw new Error('Invalid token format');
  }
  
  const [payloadBase64, signature] = token.split('.');
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64url');
  
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token signature');
  }
  
  // Decode payload
  const payloadString = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
  const payload: ShopifyLinkToken = JSON.parse(payloadString);
  
  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token has expired');
  }
  
  return payload;
}

/**
 * Verify Shopify HMAC signature for webhooks
 */
export function verifyShopifyHmac(rawBody: string, hmacHeader: string): boolean {
  const generatedHash = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(rawBody)
    .digest('base64');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(generatedHash),
      Buffer.from(hmacHeader)
    );
  } catch {
    return false;
  }
}

/**
 * Verify Shopify OAuth state parameter (nonce)
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}





