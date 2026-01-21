# Shopify Review Fixes - Quick Checklist

## Priority 1: Console Logs (Do This First)

The Shopify reviewers likely saw console.log statements in production. Here's what to fix:

### Files That Need Updates

1. **src/app/api/shopify/auth/callback/route.ts**
   - Replace `console.log` with conditional logging
   - Keep `console.error` for actual errors

2. **src/app/api/shopify/billing/create/route.ts**
   - Replace `console.log` with conditional logging
   - Keep `console.error` for actual errors

3. **src/app/api/shopify/billing/verify/route.ts**
   - Replace `console.log` with conditional logging
   - Keep `console.error` for actual errors

4. **src/app/api/shopify/billing/cancel/route.ts**
   - Replace `console.log` with conditional logging
   - Keep `console.error` for actual errors

5. **src/app/api/shopify/billing/route.ts**
   - Replace `console.log` with conditional logging (in JavaScript code)
   - Keep `console.error` for actual errors

6. **src/app/api/shopify/webhooks/route.ts**
   - Replace `console.log` with conditional logging
   - Keep `console.error` for actual errors

7. **src/app/api/shopify/app/route.ts**
   - Replace `console.log` with conditional logging (in JavaScript code)
   - Keep `console.error` for actual errors

### Quick Fix Pattern

**Before:**
```typescript
console.log('[Shopify Billing] Creating subscription:', { shop, plan });
```

**After:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Shopify Billing] Creating subscription:', { shop, plan });
}
```

**OR use the logger utility:**
```typescript
import { shopifyLogger } from '@/utils/shopify-logger';

shopifyLogger.log('[Shopify Billing] Creating subscription:', { shop, plan });
```

## Priority 2: Test Billing Flow

1. **Install app on dev store**
2. **Navigate to billing page**
3. **Select a plan**
4. **Click "Start Free Trial"**
5. **Complete subscription approval**
6. **Verify subscription shows as active**
7. **Test cancellation**
8. **Check browser console for ANY errors**

## Priority 3: Test OAuth Flow

1. **Uninstall app**
2. **Reinstall app**
3. **Complete OAuth**
4. **Verify onboarding loads**
5. **Check for redirect errors**
6. **Check browser console for errors**

## Priority 4: Error Handling

Make sure all error responses are user-friendly:

- ❌ "GraphQL error: ..."
- ✅ "Failed to connect to Shopify. Please try again."

- ❌ "Token exchange failed"
- ✅ "Authentication failed. Please try installing the app again."

## Priority 5: Record Screencast

Follow the guide in `SHOPIFY_REVIEW_RESPONSE.md`:
- 2-3 minutes
- Show installation → onboarding → dashboard → billing → features
- Upload to YouTube/Vimeo
- Get URL ready

## Testing Checklist

Before resubmitting:

- [ ] No console.log statements in production code
- [ ] Billing subscription works end-to-end
- [ ] Billing cancellation works
- [ ] OAuth flow works smoothly
- [ ] No JavaScript errors in browser console
- [ ] All error messages are user-friendly
- [ ] Screencast recorded and uploaded
- [ ] Tested on fresh development store
- [ ] Tested on different browsers (Chrome, Safari)

## Common Issues to Check

1. **CORS errors** - Make sure CORS headers are set correctly
2. **Token errors** - Verify access tokens are valid
3. **Redirect errors** - Check all redirect URLs are correct
4. **Webhook errors** - Verify webhooks return 200 status
5. **Billing errors** - Test subscription creation/verification

## How to Find Specific Errors

1. **Check Shopify Partner Dashboard**
   - Go to your app → Review feedback
   - Look for specific error messages

2. **Check Vercel Logs**
   - Look for 500 errors
   - Check for failed requests

3. **Check Browser Console**
   - Install app on dev store
   - Open browser DevTools
   - Check Console tab for errors
   - Check Network tab for failed requests

4. **Test Each Flow**
   - Installation
   - Onboarding
   - Dashboard
   - Billing (create, verify, cancel)
   - Webhooks (if testable)
