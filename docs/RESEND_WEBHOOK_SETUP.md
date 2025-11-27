# Resend Webhook Setup Guide

## Overview

Resend webhooks allow you to track email delivery status (delivered, bounced, opened, clicked, etc.) in real-time. This is useful for monitoring email performance and handling delivery failures.

## Why Set Up Webhooks?

- **Track Delivery Status**: Know when emails are delivered, bounced, or failed
- **Handle Bounces**: Automatically handle bounced emails
- **Monitor Opens/Clicks**: Track email engagement
- **Debug Issues**: Get real-time notifications of email problems

## Step 1: Create Webhook Endpoint

First, create a webhook endpoint in your Next.js app to receive Resend events:

### Create the Webhook Route

Create: `src/app/api/webhooks/resend/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Resend Webhook Handler
 * Receives email delivery events from Resend
 *
 * Events: email.sent, email.delivered, email.delivery_delayed,
 *         email.complained, email.bounced, email.opened, email.clicked
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get("resend-signature");
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      // Verify signature here if needed
      // Resend provides signature verification in their SDK
    }

    const payload = await request.json();
    const { type, data } = payload;

    console.log("📧 Resend webhook received:", { type, data });

    // Handle different event types
    switch (type) {
      case "email.sent":
        console.log("✅ Email sent:", {
          emailId: data.email_id,
          to: data.to,
          subject: data.subject,
        });
        // Update your database if needed
        break;

      case "email.delivered":
        console.log("📬 Email delivered:", {
          emailId: data.email_id,
          to: data.to,
        });
        // Mark as delivered in your database
        break;

      case "email.delivery_delayed":
        console.warn("⏳ Email delivery delayed:", {
          emailId: data.email_id,
          to: data.to,
          reason: data.reason,
        });
        // Handle delayed delivery
        break;

      case "email.bounced":
        console.error("❌ Email bounced:", {
          emailId: data.email_id,
          to: data.to,
          bounceType: data.bounce_type,
          reason: data.reason,
        });
        // Handle bounce - mark email as invalid, notify user, etc.
        break;

      case "email.complained":
        console.warn("⚠️ Email complaint (spam):", {
          emailId: data.email_id,
          to: data.to,
        });
        // Handle spam complaint - remove from list, etc.
        break;

      case "email.opened":
        console.log("👁️ Email opened:", {
          emailId: data.email_id,
          to: data.to,
        });
        // Track email opens for analytics
        break;

      case "email.clicked":
        console.log("🖱️ Email link clicked:", {
          emailId: data.email_id,
          to: data.to,
          link: data.link,
        });
        // Track link clicks for analytics
        break;

      default:
        console.log("📧 Unknown webhook event:", type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Resend webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

// GET endpoint for webhook verification
export async function GET() {
  return NextResponse.json({
    message: "Resend webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
```

## Step 2: Configure Webhook in Resend Dashboard

1. **Go to Resend Dashboard**:

   - Visit [https://resend.com/webhooks](https://resend.com/webhooks)
   - Or: Dashboard → Webhooks

2. **Create New Webhook**:

   - Click **"Add Webhook"** or **"Create Webhook"**
   - Enter webhook URL: `https://www.tryaiva.io/api/webhooks/resend`
   - Select events to listen to:
     - ✅ `email.sent` - Email was sent
     - ✅ `email.delivered` - Email was delivered
     - ✅ `email.delivery_delayed` - Delivery delayed
     - ✅ `email.bounced` - Email bounced
     - ✅ `email.complained` - Marked as spam
     - ✅ `email.opened` - Email was opened (optional)
     - ✅ `email.clicked` - Link was clicked (optional)

3. **Save Webhook**:

   - Click **"Save"** or **"Create"**
   - Resend will generate a webhook secret

4. **Copy Webhook Secret**:
   - Copy the webhook secret (starts with `whsec_...`)
   - You'll need this for signature verification

## Step 3: Add Webhook Secret to Environment Variables

Add the webhook secret to your environment variables:

### In Vercel:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - **Key**: `RESEND_WEBHOOK_SECRET`
   - **Value**: `whsec_aVltc9nmx1DDVB76InSyXsURGaJsf7Lu`
   - **Environment**: Production, Preview, Development
3. Click **Save**
4. **Redeploy** your application

### In `.env.local` (for local testing):

```bash
RESEND_WEBHOOK_SECRET=whsec_aVltc9nmx1DDVB76InSyXsURGaJsf7Lu
```

**Note**: The webhook secret is already configured in `.env` and `.env.local` files.

## Step 4: Test the Webhook

### Test Locally (using ngrok):

1. **Start ngrok**:

   ```bash
   ngrok http 3000
   ```

2. **Update Resend webhook URL**:

   - Use your ngrok URL: `https://your-ngrok-url.ngrok-free.app/api/webhooks/resend`
   - Update in Resend dashboard

3. **Send a test email**:
   - Send a magic link or test email
   - Check your terminal for webhook events

### Test in Production:

1. **Send a test email** (magic link, etc.)
2. **Check Vercel logs**:
   - Go to Deployments → Latest → Functions → View logs
   - Look for: `📧 Resend webhook received:`
3. **Check Resend dashboard**:
   - Go to Webhooks → Your webhook
   - Check "Recent Events" or "Logs"
   - Should show successful deliveries

## Step 5: Handle Webhook Events (Optional)

You can enhance the webhook handler to update your database:

### Example: Track Email Status

```typescript
// In webhook handler
case 'email.delivered':
  // Update email status in your database
  await updateEmailStatus(data.email_id, 'delivered');
  break;

case 'email.bounced':
  // Mark email as invalid
  await markEmailAsInvalid(data.to);
  // Notify user
  await notifyUserOfBounce(data.to);
  break;
```

## Webhook Security

### Verify Webhook Signature (Recommended)

Resend signs webhooks with a secret. Verify the signature to ensure requests are from Resend:

```typescript
import { verifySignature } from "@resend/webhooks";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("resend-signature");
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const body = await request.text();

  try {
    const isValid = verifySignature({
      payload: body,
      signature,
      secret: webhookSecret,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 },
    );
  }

  // Process webhook...
  const payload = JSON.parse(body);
  // ... rest of handler
}
```

**Note**: You may need to install the Resend webhooks package:

```bash
pnpm add @resend/webhooks
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check Webhook URL**: Must be publicly accessible (not localhost)
2. **Check Events Selected**: Make sure events are enabled in Resend
3. **Check Vercel Logs**: Look for webhook requests
4. **Test Webhook**: Use Resend's "Test Webhook" feature

### Webhook Returns 404

1. **Verify Route Exists**: Check `src/app/api/webhooks/resend/route.ts` exists
2. **Check Deployment**: Make sure latest code is deployed
3. **Check URL**: Ensure webhook URL matches your production domain

### Webhook Returns 500

1. **Check Logs**: Look for errors in Vercel logs
2. **Check Code**: Verify webhook handler code is correct
3. **Test Locally**: Test with ngrok first

## Webhook Events Reference

| Event                    | Description         | When It Fires                   |
| ------------------------ | ------------------- | ------------------------------- |
| `email.sent`             | Email was sent      | Immediately after sending       |
| `email.delivered`        | Email was delivered | When recipient's server accepts |
| `email.delivery_delayed` | Delivery delayed    | When delivery is delayed        |
| `email.bounced`          | Email bounced       | When email is rejected          |
| `email.complained`       | Marked as spam      | When user marks as spam         |
| `email.opened`           | Email opened        | When recipient opens email      |
| `email.clicked`          | Link clicked        | When recipient clicks a link    |

## Next Steps

After setting up webhooks:

1. ✅ Monitor email delivery in real-time
2. ✅ Handle bounces automatically
3. ✅ Track email engagement (opens/clicks)
4. ✅ Debug delivery issues faster
5. ✅ Improve email deliverability

## Additional Resources

- [Resend Webhooks Documentation](https://resend.com/docs/dashboard/webhooks)
- [Resend Webhook Events](https://resend.com/docs/dashboard/webhooks/events)
- [Webhook Security Best Practices](https://resend.com/docs/dashboard/webhooks/security)
