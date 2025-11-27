# Supabase Custom Email Templates Setup

## Overview

Aiva.io uses Supabase's built-in email sending with custom HTML templates. This ensures all authentication emails use our branded React Email templates while leveraging Supabase's reliable email infrastructure.

## How It Works

1. **Supabase sends emails** automatically for auth operations (signup, magic link, password reset, etc.)
2. **Custom HTML templates** are configured in Supabase Dashboard
3. **Templates are generated** from React Email components using our script
4. **Resend SMTP** is configured in Supabase for email delivery

## Step 1: Generate HTML Templates

Run the template generation script to create HTML files from React Email components:

```bash
pnpm tsx scripts/generate-supabase-email-templates.ts
```

This creates HTML files in `supabase-email-templates/` with Supabase template variables.

## Step 2: Configure Templates in Supabase Dashboard

1. **Go to Supabase Dashboard**:
   - Navigate to: **Project Settings** → **Authentication** → **Email Templates**

2. **For each email type**, click **"Edit Template"** and paste the corresponding HTML:

   - **Confirm signup** → Use `email_confirmation.html`
   - **Magic Link** → Use `magic_link.html`
   - **Change Email Address** → Use `email_confirmation.html` (or create separate)
   - **Reset Password** → Use `password_reset.html`
   - **Invite user** → Use `email_confirmation.html` (or create separate)

3. **Supabase Template Variables**:
   
   Supabase uses Go template syntax. Available variables:
   
   - `{{ .ConfirmationURL }}` - Full confirmation/reset URL
   - `{{ .Token }}` - Auth token (for magic links)
   - `{{ .TokenHash }}` - Hashed token
   - `{{ .SiteURL }}` - Your Supabase project URL
   - `{{ .Email }}` - User's email address
   - `{{ .RedirectTo }}` - Redirect URL after confirmation
   - `{{ .Data }}` - Additional data (JSON)

4. **Save each template** after pasting the HTML

## Step 3: Configure Resend SMTP in Supabase

1. **Go to Supabase Dashboard**:
   - Navigate to: **Project Settings** → **Authentication** → **SMTP Settings**

2. **Enable Custom SMTP**:
   - Toggle **"Enable custom SMTP"** to ON

3. **Enter Resend SMTP Settings**:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: `resend`
   - **Password**: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu` (your Resend API key)
   - **Sender email**: `noreply@tryaiva.io` (must use verified domain)
   - **Sender name**: `Aiva.io`

4. **Test Connection**:
   - Click **"Test Connection"** to verify SMTP settings
   - Ensure test email is received

5. **Save** the settings

## Step 4: Verify Domain in Resend

1. **Go to Resend Dashboard**:
   - Navigate to: **Domains** → [resend.com/domains](https://resend.com/domains)

2. **Verify Domain**:
   - Ensure `tryaiva.io` is added and verified
   - Add DNS records (SPF, DKIM, DMARC) if not already done
   - Wait for verification (usually 24-48 hours)

3. **Use Verified Domain Email**:
   - Use `noreply@tryaiva.io` or `admin@tryaiva.io` as sender email
   - Must match a verified domain in Resend

## Template Mapping

| Supabase Email Type | React Email Template | Generated HTML File |
|---------------------|---------------------|---------------------|
| Confirm signup | `email-confirmation.tsx` | `email_confirmation.html` |
| Magic Link | `magic-link.tsx` | `magic_link.html` |
| Reset Password | `forgot-password.tsx` | `password_reset.html` |
| Change Email | `email-confirmation.tsx` | `email_confirmation.html` |
| Invite user | `email-confirmation.tsx` | `email_confirmation.html` |

## Supabase Template Variables Reference

### Available Variables

- `{{ .ConfirmationURL }}` - Full URL for email confirmation/password reset
- `{{ .Token }}` - Auth token (for magic links)
- `{{ .TokenHash }}` - Hashed version of token
- `{{ .SiteURL }}` - Your Supabase project URL (e.g., `https://lgyewlqzelxkpawnmiog.supabase.co`)
- `{{ .Email }}` - User's email address
- `{{ .RedirectTo }}` - Redirect URL after confirmation
- `{{ .Data }}` - Additional JSON data

### Example Usage

```html
<!-- Magic Link URL -->
<a href="{{ .SiteURL }}/auth/v1/verify?token={{ .Token }}&type=magiclink">
  Sign In
</a>

<!-- Confirmation URL -->
<a href="{{ .ConfirmationURL }}">Confirm Email</a>

<!-- User Email -->
<p>Hello {{ .Email }},</p>
```

## Updating Templates

When you modify React Email templates:

1. **Update the React component** in `emails/` folder
2. **Regenerate HTML templates**:
   ```bash
   pnpm tsx scripts/generate-supabase-email-templates.ts
   ```
3. **Update Supabase templates**:
   - Go to Supabase Dashboard → Authentication → Email Templates
   - Copy new HTML from `supabase-email-templates/`
   - Paste into corresponding Supabase template
   - Save

## Testing

### Test Email Sending

1. **Sign up a new user**:
   - Go to `/en/sign-up`
   - Enter email and password
   - Check email inbox for confirmation email

2. **Request magic link**:
   - Go to `/en/login`
   - Enter email
   - Click "Send Magic Link"
   - Check email inbox

3. **Request password reset**:
   - Go to `/en/forgot-password`
   - Enter email
   - Check email inbox for reset link

### Verify Email Content

- ✅ Email uses custom template (not Supabase default)
- ✅ Branding matches Aiva.io design
- ✅ Links work correctly
- ✅ Email is from `noreply@tryaiva.io` (or configured sender)

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Settings**:
   - Verify Resend SMTP is configured correctly
   - Test connection in Supabase Dashboard
   - Check Resend API key is correct

2. **Check Domain Verification**:
   - Ensure sender email uses verified domain
   - Check Resend dashboard for domain status

3. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Look for email sending errors

### Templates Not Rendering

1. **Check Template Variables**:
   - Ensure Supabase template variables are correct
   - Use `{{ .Variable }}` syntax (with spaces)

2. **Check HTML Format**:
   - Ensure HTML is valid
   - Check for unclosed tags
   - Verify template was copied completely

3. **Test Template**:
   - Use Supabase's "Send test email" feature
   - Check if variables are replaced correctly

### Email Goes to Spam

1. **Verify Domain**:
   - Ensure domain is verified in Resend
   - Add SPF, DKIM, DMARC records

2. **Check Sender Reputation**:
   - Use verified domain email
   - Avoid spam trigger words
   - Keep email content professional

## Benefits of This Approach

✅ **Uses Supabase's reliable email infrastructure**  
✅ **Custom branded templates**  
✅ **No manual email sending code**  
✅ **Automatic email sending for all auth flows**  
✅ **Easy to update templates** (just regenerate HTML)  
✅ **Leverages Resend for delivery**  

## Related Documentation

- [Custom Email Setup](./CUSTOM_EMAIL_SETUP.md) - Original setup guide
- [Resend Email Complete Setup](./RESEND_EMAIL_COMPLETE_SETUP.md) - Resend configuration
- [Email Troubleshooting](./RESEND_EMAIL_TROUBLESHOOTING.md) - Common issues

