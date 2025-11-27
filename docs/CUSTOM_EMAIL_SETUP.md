# Custom Email Templates Setup Guide

This guide explains how to configure Aiva.io to use custom email templates via Resend instead of Supabase's default email templates.

## Overview

Aiva.io uses custom React Email templates for all authentication and user communication emails. These templates are sent via Resend, providing a professional, branded email experience.

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Resend API Key**: Get your API key from the Resend dashboard
3. **Verified Domain** (Recommended): Add and verify your domain in Resend for better deliverability

## Step 1: Configure Environment Variables

Add your Resend API key to your environment variables:

```bash
# .env or .env.local
RESEND_API_KEY=re_U3wbepDx_8jGmrWhM5JZhvy2UmebYBMDa
ADMIN_EMAIL=admin@aiva.io  # Or your verified Resend domain email
```

## Step 2: Configure Supabase SMTP (Recommended)

To replace Supabase's default email templates with our custom templates, configure Supabase to use Resend SMTP:

### In Supabase Dashboard:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Enter the following settings:
   - **Host**: `smtp.resend.com`
   - **Port**: `587` (or `465` for SSL)
   - **Username**: `resend`
   - **Password**: Your Resend API Key (`re_...`)
   - **Sender email**: Your verified Resend domain email (e.g., `noreply@tryaiva.io`)
   - **Sender name**: `Aiva.io` (optional)

4. **Test the connection** to ensure it works
5. **Save** the settings

### Alternative: Use Resend API Directly

If you prefer not to configure SMTP in Supabase, you can:

1. Disable Supabase email sending (not recommended, as it breaks auth flows)
2. OR, keep Supabase emails enabled but customize them via Supabase Dashboard → Auth → Email Templates

**Note**: The recommended approach is to configure Resend SMTP in Supabase, as this ensures all auth emails use your custom templates automatically.

## Step 3: Verify Email Templates

The following custom email templates are available:

- ✅ **Email Confirmation** (`email-confirmation.tsx`) - Sent when users sign up
- ✅ **Magic Link** (`magic-link.tsx`) - Sent for passwordless sign-in
- ✅ **Password Reset** (`forgot-password.tsx`) - Sent when users request password reset
- ✅ **Password Updated** (`password-update.tsx`) - Sent after password change
- ✅ **Welcome Email** (`welcome.tsx`) - Sent to new users
- ✅ **Team Invitation** (`TeamInvitation.tsx`) - Sent for workspace invitations

All templates are located in the `/emails` folder and use React Email for rendering.

## Step 4: Test Email Sending

### Test in Development

In development mode, emails are sent to Inbucket (local email testing server) instead of actual email addresses. Check your Inbucket inbox at `http://localhost:54324`.

### Test in Production

1. Sign up a new user
2. Request a password reset
3. Send a magic link
4. Verify that custom email templates are received

## Email Service Architecture

### How It Works

1. **Supabase Auth Operations**: When users sign up, request magic links, or reset passwords, Supabase triggers email sending
2. **Resend SMTP**: If configured, Supabase sends emails via Resend SMTP using your custom templates
3. **Email Service Utility**: The `src/utils/email-service.ts` utility maps email types to React Email templates
4. **Resend API**: Emails are sent via Resend API using the `sendEmail` utility

### Email Flow

```
User Action (Sign Up/Reset Password/etc.)
  ↓
Supabase Auth API
  ↓
Resend SMTP (configured in Supabase)
  ↓
Custom React Email Template
  ↓
User's Inbox
```

## Customization

### Modify Email Templates

Edit the React Email templates in `/emails/`:

- `email-confirmation.tsx` - Email confirmation template
- `magic-link.tsx` - Magic link sign-in template
- `forgot-password.tsx` - Password reset template
- `password-update.tsx` - Password updated confirmation
- `welcome.tsx` - Welcome email for new users
- `TeamInvitation.tsx` - Workspace invitation template

### Add New Email Types

1. Create a new React Email template in `/emails/`
2. Add the email type to `EmailType` in `src/utils/email-service.ts`
3. Add a case in the `sendAuthEmail` function
4. Update the webhook handler if needed

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**: Verify `RESEND_API_KEY` is set correctly
2. **Check SMTP Configuration**: Ensure Supabase SMTP settings are correct
3. **Check Domain Verification**: If using a custom domain, ensure it's verified in Resend
4. **Check Spam Folder**: Custom emails may go to spam initially

### Still Receiving Supabase Default Emails

1. **Verify SMTP Configuration**: Ensure Custom SMTP is enabled in Supabase
2. **Check Email Templates**: Supabase may still use default templates if SMTP isn't configured
3. **Clear Cache**: Try signing up a new user to test

### Development vs Production

- **Development**: Emails are sent to Inbucket (local testing)
- **Production**: Emails are sent via Resend to actual email addresses

## Webhook Endpoint (Optional)

A webhook endpoint is available at `/api/webhooks/supabase-email` for advanced email customization. This can be used if Supabase adds webhook support for email customization in the future.

## Support

For issues or questions:
1. Check Resend dashboard for email delivery status
2. Check Supabase logs for SMTP errors
3. Verify environment variables are set correctly
4. Test with a simple email send using the `sendEmail` utility

## Next Steps

After setup:
1. ✅ Verify Resend API key is configured
2. ✅ Configure Supabase SMTP with Resend credentials
3. ✅ Test email sending in development
4. ✅ Test email sending in production
5. ✅ Monitor email delivery in Resend dashboard

