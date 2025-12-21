# Aiva.io - Shopify Public App Setup Guide

This guide walks you through publishing Aiva.io as a **Public App** on the Shopify App Store.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHOPIFY APP STORE                           │
│                    "Aiva - AI Communication Assistant"          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Merchant clicks "Install"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               AIVA.IO (Your Existing Vercel App)                │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │ /api/shopify/auth    │  │ /api/shopify/webhooks            │ │
│  │   → OAuth Handler    │  │   → GDPR Compliance              │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FULL AIVA.IO EXPERIENCE                     │   │
│  │  • Unified Inbox       • AI Drafts      • Calendar      │   │
│  │  • Gmail/Outlook       • Tasks          • Auto-Reply    │   │
│  │  • + Shopify Customer Data Integration                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Point**: You're NOT rebuilding Aiva inside Shopify. You're creating a lightweight "connector" that links Shopify stores to your existing Aiva service.

---

## Prerequisites

- [x] Aiva.io running (locally or on Vercel)
- [x] Shopify Partner account
- [x] Supabase project with migrations applied
- [ ] Domain configured (for production)

---

## Step 1: Create Shopify Partner Account

1. Go to https://partners.shopify.com
2. Click "Join now" (it's free)
3. Complete your profile
4. Verify your email

---

## Step 2: Create Your App in Partner Dashboard

1. Log in to https://partners.shopify.com
2. Go to **Apps** → **Create app**
3. Choose **Create app manually**

### App Configuration

| Field | Value |
|-------|-------|
| App name | `Aiva - AI Communication Assistant` |
| App URL | `https://www.tryaiva.io/api/shopify/auth` |

### Allowed Redirection URLs

Add these URLs:
```
https://www.tryaiva.io/api/shopify/auth/callback
http://localhost:3000/api/shopify/auth/callback
```

### API Access Scopes

Request these scopes:
```
read_customers
write_customers
read_orders
read_products
read_content
```

4. Click **Create app**
5. Copy your **API Key** and **API Secret Key**

---

## Step 3: Configure Environment Variables

Update your `.env.local` (and Vercel environment variables):

```env
# Shopify App Credentials
SHOPIFY_API_KEY=your_api_key_from_partner_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_partner_dashboard
SHOPIFY_APP_URL=https://www.tryaiva.io
```

For Vercel deployment:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the above variables
3. Redeploy

---

## Step 4: Apply Database Migration

The Shopify tables need to be created in Supabase:

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref lgyewlqzelxkpawnmiog

# Push the migration
supabase db push
```

This creates:
- `shopify_stores` - Stores merchant connections
- `shopify_webhook_logs` - GDPR compliance audit trail

---

## Step 5: Configure Mandatory Webhooks (GDPR)

In Partner Dashboard → Your App → **Configuration**:

### Webhook Endpoints

| Topic | Endpoint |
|-------|----------|
| App uninstalled | `https://www.tryaiva.io/api/shopify/webhooks` |
| Customer data request | `https://www.tryaiva.io/api/shopify/webhooks` |
| Customer redact | `https://www.tryaiva.io/api/shopify/webhooks` |
| Shop redact | `https://www.tryaiva.io/api/shopify/webhooks` |

### Set Webhook API Version
Use: `2024-01`

---

## Step 6: Create Development Store for Testing

1. In Partner Dashboard → **Stores** → **Add store**
2. Choose **Development store**
3. Fill in details and create
4. Install your app on this store for testing

### Test the Installation Flow

1. In Partner Dashboard → Your App → **Test your app**
2. Select your development store
3. Click **Install app**
4. You should be redirected through OAuth flow
5. End up on `/shopify/onboarding` page

---

## Step 7: Create App Store Listing

In Partner Dashboard → Your App → **App listings**:

### Required Assets

| Asset | Specification |
|-------|---------------|
| App icon | 1200x1200px PNG |
| Feature images | 1600x900px (up to 5) |
| Intro video | YouTube/Vimeo URL (recommended) |

### Listing Content

**App Name**: Aiva - AI Communication Assistant

**Tagline** (70 chars max):
```
AI-powered inbox that unifies all your customer communications
```

**Description** (write compelling copy about):
- Unified inbox for all channels
- AI-powered response drafting
- Task extraction and reminders
- Calendar and scheduling
- Works with Gmail, Outlook, Slack, and more

**Key Benefits**:
1. Save 50-70% time on customer communications
2. Never miss important messages
3. AI drafts professional responses instantly
4. Automatic task and follow-up extraction
5. Works across all your communication channels

### Pricing

For a Public App, you can use Shopify Billing API:
- Free plan with limits
- Paid plans with recurring billing
- Shopify handles all payments and takes 20% cut

---

## Step 8: Submit for Review

### Before Submitting

- [ ] Test on development store
- [ ] All GDPR webhooks configured
- [ ] App icon and screenshots ready
- [ ] Listing content complete
- [ ] Privacy policy URL added
- [ ] Support contact configured

### Submission Checklist

1. Go to Partner Dashboard → Your App → **Distribution**
2. Choose **Public** distribution
3. Complete all required fields
4. Submit for review

### Review Timeline

- Initial review: 5-10 business days
- They may request changes
- Be responsive to feedback

---

## Step 9: Post-Approval

Once approved:

1. **Monitor installs** in Partner Dashboard
2. **Handle support** requests from merchants
3. **Iterate** based on feedback
4. **Market** your app (Shopify has a partner blog, social, etc.)

---

## File Structure Reference

```
src/app/api/shopify/
├── auth/
│   ├── route.ts              # OAuth initiation
│   └── callback/
│       └── route.ts          # OAuth callback
└── webhooks/
    └── route.ts              # GDPR webhooks

src/app/[locale]/(dynamic-pages)/shopify/
└── onboarding/
    └── page.tsx              # Post-install page

supabase/migrations/
└── 20251215221411_create_shopify_stores.sql

shopify.app.toml              # App configuration
```

---

## Environment Variables Summary

```env
# Required for Shopify Integration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://www.tryaiva.io

# Existing Aiva variables (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://www.tryaiva.io
```

---

## Common Issues

### "Invalid redirect_uri"
- Ensure exact URL match in Partner Dashboard
- Check for trailing slashes
- Protocol must match (https vs http)

### "Missing HMAC"
- Webhooks from Shopify include HMAC signature
- Verify `SHOPIFY_API_SECRET` is correct

### "App not loading"
- Check browser console for errors
- Verify cookies are being set
- Test in incognito mode

---

## Next Steps After Approval

1. **Add Shopify-specific features**:
   - Sync customer data to Aiva contacts
   - Pull order history for AI context
   - Auto-respond to common questions

2. **Billing integration**:
   - Use Shopify Billing API
   - Offer plans through Shopify

3. **Enhanced embedding**:
   - Use App Bridge for embedded experience
   - Add Shopify Admin shortcuts

---

## Support

- Shopify Partner Community: https://community.shopify.com/c/shopify-partners/bd-p/partners
- Shopify Dev Docs: https://shopify.dev/docs/apps
- Aiva Support: support@tryaiva.io

---

*Last Updated: December 2024*





