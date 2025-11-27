# Resend Email Complete Setup Guide

## Overview

This guide ensures your Resend email integration is fully configured and working end-to-end.

## ✅ Configuration Checklist

### 1. Environment Variables

**Required in Vercel and `.env.local`:**

```bash
# Resend API Key (for sending emails)
RESEND_API_KEY=re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu

# Resend Webhook Secret (for webhook verification)
RESEND_WEBHOOK_SECRET=whsec_aVltc9nmx1DDVB76InSyXsURGaJsf7Lu

# Admin Email (must use verified domain)
ADMIN_EMAIL=admin@tryaiva.io
```

**Status**: ✅ Already configured in `.env` and `.env.local`

### 2. Supabase SMTP Settings

**Configure in Supabase Dashboard → Authentication → Email Templates → SMTP Settings:**

- **Enable custom SMTP**: ✅ Enabled
- **Host**: `smtp.resend.com`
- **Port**: `465`
- **Username**: `resend`
- **Password**: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu` (same as RESEND_API_KEY)
- **Sender Email**: `noreply@tryaiva.io`
- **Sender Name**: `Aiva.io`

**Status**: ✅ Already configured (per user's previous setup)

### 3. Domain Verification in Resend

**Critical**: The `from` email domain must be verified in Resend.

1. Go to [Resend Domains](https://resend.com/domains)
2. Verify `tryaiva.io` is added and verified
3. If not verified:
   - Add the domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification (usually 24-48 hours)

**Current Setup**:
- ✅ Using `admin@tryaiva.io` (domain: `tryaiva.io`)
- ⚠️ **Action Required**: Verify `tryaiva.io` domain in Resend if not already done

### 4. Webhook Configuration

**Configure in Resend Dashboard → Webhooks:**

1. Go to [Resend Webhooks](https://resend.com/webhooks)
2. Click **"Add Webhook"** or **"Create Webhook"**
3. Enter webhook URL: `https://www.tryaiva.io/api/webhooks/resend`
4. Select events:
   - ✅ `email.sent`
   - ✅ `email.delivered`
   - ✅ `email.delivery_delayed`
   - ✅ `email.bounced`
   - ✅ `email.complained`
   - ✅ `email.opened` (optional)
   - ✅ `email.clicked` (optional)
5. Copy webhook secret: `whsec_aVltc9nmx1DDVB76InSyXsURGaJsf7Lu`
6. Save webhook

**Status**: 
- ✅ Webhook endpoint created: `/api/webhooks/resend`
- ✅ Webhook secret configured in env vars
- ⚠️ **Action Required**: Create webhook in Resend dashboard

### 5. Supabase Email Templates

**Disable Supabase default email templates:**

The migration `supabase/migrations/20250101000000_custom_email_templates.sql` disables Supabase's default email sending by setting templates to empty strings.

**Status**: ✅ Migration already created (run if not applied)

## 🔧 Verification Steps

### Step 1: Verify Environment Variables in Vercel

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Verify these are set:
   - `RESEND_API_KEY` = `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu`
   - `RESEND_WEBHOOK_SECRET` = `whsec_aVltc9nmx1DDVB76InSyXsURGaJsf7Lu`
   - `ADMIN_EMAIL` = `admin@tryaiva.io`
3. If missing, add them and **redeploy**

### Step 2: Test Email Sending

1. **Send a Magic Link**:
   - Go to `/en/login`
   - Enter your email
   - Click "Send Magic Link"
   - Check Vercel logs for:
     ```
     ✅ Custom magic_link email sent successfully to your@email.com
     📧 Resend email sent successfully: { emailId: 'xxx', ... }
     ```

2. **Check Resend Dashboard**:
   - Go to [Resend Emails](https://resend.com/emails)
   - Look for the email you just sent
   - Check status: Should show "Delivered" or "Sent"

3. **Check Your Inbox**:
   - Check spam folder if not in inbox
   - Email should be from `admin@tryaiva.io`

### Step 3: Test Webhook

1. **Send a test email** (magic link, etc.)
2. **Check Vercel logs**:
   - Go to Deployments → Latest → Functions → View logs
   - Look for: `📧 Resend webhook received:`
3. **Check Resend Dashboard**:
   - Go to Webhooks → Your webhook
   - Check "Recent Events" or "Logs"
   - Should show successful deliveries

## 🐛 Troubleshooting

### Issue: "Missing API key" Error

**Solution**:
1. Verify `RESEND_API_KEY` is set in Vercel
2. Ensure it matches Supabase SMTP password
3. Redeploy after adding env var

### Issue: "Domain not verified" Error

**Solution**:
1. Go to [Resend Domains](https://resend.com/domains)
2. Verify `tryaiva.io` is verified
3. If not, add DNS records and wait for verification
4. Use verified domain email in `ADMIN_EMAIL`

### Issue: Emails Not Sending

**Check**:
1. ✅ `RESEND_API_KEY` is set and correct
2. ✅ `ADMIN_EMAIL` uses verified domain
3. ✅ Supabase SMTP is configured correctly
4. ✅ Check Vercel logs for errors
5. ✅ Check Resend dashboard for email status

### Issue: Webhook Not Receiving Events

**Check**:
1. ✅ Webhook URL is correct: `https://www.tryaiva.io/api/webhooks/resend`
2. ✅ `RESEND_WEBHOOK_SECRET` is set in Vercel
3. ✅ Webhook is enabled in Resend dashboard
4. ✅ Events are selected in webhook configuration
5. ✅ Check Vercel logs for webhook requests

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Environment Variables | ✅ Configured | In `.env`, `.env.local`, needs Vercel |
| Supabase SMTP | ✅ Configured | Per user's previous setup |
| Domain Verification | ⚠️ Action Required | Verify `tryaiva.io` in Resend |
| Webhook Endpoint | ✅ Created | `/api/webhooks/resend` |
| Webhook Secret | ✅ Configured | In env vars |
| Webhook in Resend | ⚠️ Action Required | Create in Resend dashboard |
| Email Templates | ✅ Custom | Using React Email templates |
| Email Sending | ✅ Working | Via `sendAuthEmail` |

## 🚀 Next Steps

1. **Verify Domain in Resend**:
   - Go to [Resend Domains](https://resend.com/domains)
   - Add/verify `tryaiva.io` domain
   - Add DNS records if needed

2. **Create Webhook in Resend**:
   - Go to [Resend Webhooks](https://resend.com/webhooks)
   - Create webhook pointing to `https://www.tryaiva.io/api/webhooks/resend`
   - Select events to listen to
   - Use webhook secret: `whsec_aVltc9nmx1DDVB76InSyXsURGaJsf7Lu`

3. **Add Environment Variables to Vercel**:
   - Go to Vercel → Settings → Environment Variables
   - Add `RESEND_WEBHOOK_SECRET` = `whsec_aVltc9nmx1DDVB76InSyXsURGaJsf7Lu`
   - Ensure `RESEND_API_KEY` and `ADMIN_EMAIL` are set
   - Redeploy

4. **Test End-to-End**:
   - Send a magic link
   - Check email is received
   - Check Resend dashboard shows email
   - Check webhook receives events

## 📚 Related Documentation

- [Custom Email Setup](./CUSTOM_EMAIL_SETUP.md)
- [Resend Webhook Setup](./RESEND_WEBHOOK_SETUP.md)
- [Email Troubleshooting](./RESEND_EMAIL_TROUBLESHOOTING.md)
- [Vercel Environment Variables](./VERCEL_ENV_VAR_SETUP.md)

