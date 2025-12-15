# Fixing "Error sending magic link email" in Supabase

## Error Message

```
Error [AuthApiError]: Error sending magic link email
Status: 500
Code: unexpected_failure
```

## Root Cause

This error occurs when Supabase tries to send an email but fails. Common causes:

1. **SMTP not configured** - Resend SMTP settings not set up in Supabase
2. **Email templates not configured** - Custom templates not pasted into Supabase Dashboard
3. **SMTP connection failure** - Resend SMTP credentials incorrect or connection failing
4. **Domain not verified** - Sender email domain not verified in Resend

## Quick Fix Steps

### Step 1: Verify SMTP Settings in Supabase

1. Go to **Supabase Dashboard** → **Project Settings** → **Authentication** → **SMTP Settings**
2. Verify **Custom SMTP** is enabled
3. Check settings:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (or `587`)
   - **Username**: `resend`
   - **Password**: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu`
   - **Sender email**: `noreply@tryaiva.io` (must use verified domain)
4. Click **"Test Connection"** - should succeed
5. If test fails, check credentials and try again

### Step 2: Configure Email Templates in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. For **Magic Link** template:
   - Click **"Edit Template"**
   - Copy HTML from `supabase-email-templates/magic_link.html`
   - Paste into the template editor
   - **Important**: Ensure Supabase template variables are correct:
     - `{{ .SiteURL }}` - Your Supabase project URL
     - `{{ .Token }}` - Magic link token
     - `{{ .Email }}` - User's email
   - Save template
3. Repeat for other templates:
   - **Confirm signup** → `email_confirmation.html`
   - **Reset Password** → `password_reset.html`

### Step 3: Verify Domain in Resend

1. Go to [Resend Domains](https://resend.com/domains)
2. Ensure `tryaiva.io` is verified
3. If not verified:
   - Add domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification (24-48 hours)

### Step 4: Test Email Sending

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Click **"Send test email"** for Magic Link template
3. Check if test email is received
4. If test fails, check SMTP settings again

## Detailed Troubleshooting

### Check Supabase Logs

1. Go to **Supabase Dashboard** → **Logs**
2. Filter for **Auth** logs
3. Look for email sending errors
4. Check error messages for specific issues

### Verify SMTP Credentials

**Resend SMTP Settings**:
- Host: `smtp.resend.com`
- Port: `465` (SSL) or `587` (TLS)
- Username: `resend`
- Password: Your Resend API key (starts with `re_`)

**Common Issues**:
- ❌ Wrong API key - Use correct Resend API key
- ❌ Wrong port - Try both 465 and 587
- ❌ SSL/TLS mismatch - Match port with encryption type

### Check Email Template Syntax

Supabase uses Go template syntax. Ensure:

1. **Variables are correct**:
   ```html
   {{ .SiteURL }}/auth/v1/verify?token={{ .Token }}&type=magiclink
   ```

2. **No syntax errors**:
   - All `{{ }}` tags are properly closed
   - No extra spaces or characters
   - HTML is valid

3. **Template is complete**:
   - Full HTML structure (DOCTYPE, head, body)
   - All required variables are present

### Test SMTP Connection

1. In Supabase Dashboard → SMTP Settings
2. Click **"Test Connection"**
3. If it fails:
   - Check Resend API key is correct
   - Verify domain is verified in Resend
   - Try different port (465 vs 587)
   - Check firewall/network settings

## Alternative: Use Default Templates Temporarily

If custom templates are causing issues:

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Click **"Reset to default"** for Magic Link template
3. Test magic link sending
4. If it works, the issue is with custom template
5. Re-check custom template HTML and variables

## Still Not Working?

1. **Check Resend Dashboard**:
   - Go to [Resend Emails](https://resend.com/emails)
   - Look for failed sends
   - Check error messages

2. **Check Supabase Status**:
   - Visit [Supabase Status](https://status.supabase.com)
   - Check for email service issues

3. **Contact Support**:
   - Supabase Support: support@supabase.com
   - Resend Support: support@resend.com

## Prevention

To avoid this error in the future:

1. ✅ Always test SMTP connection after configuration
2. ✅ Test email templates before deploying
3. ✅ Verify domain in Resend before using
4. ✅ Keep Resend API key secure and up-to-date
5. ✅ Monitor Supabase logs for email errors

## Related Documentation

- [Supabase Custom Email Templates Setup](./SUPABASE_CUSTOM_EMAIL_TEMPLATES.md)
- [Resend Email Complete Setup](./RESEND_EMAIL_COMPLETE_SETUP.md)
- [Email Troubleshooting](./RESEND_EMAIL_TROUBLESHOOTING.md)

