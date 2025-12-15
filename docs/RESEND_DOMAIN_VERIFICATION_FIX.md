# Fix: "tryaiva.io domain is not verified" Error

## The Problem

You're seeing this error:

```
"The tryaiva.io domain is not verified. Please, add and verify your domain on https://resend.com/domains"
```

But the domain **is** added in Resend with DNS records configured.

## Root Cause

The domain DNS records are added, but **Resend hasn't completed verification yet**. This can take 15 minutes to 24 hours after DNS records are added.

## Quick Fix Steps

### Step 1: Check Domain Verification Status

1. Go to [Resend Domains](https://resend.com/domains)
2. Click on `tryaiva.io` domain
3. Look for **"Status"** - it should show:
   - ✅ **"Verified"** - Domain is ready to use
   - ⏳ **"Pending"** - Still verifying (wait or check DNS)
   - ❌ **"Failed"** - DNS records incorrect

### Step 2: Verify DNS Records Are Correct

Your DNS records should be:

**DKIM (Required)**:

- Type: `TXT`
- Name: `resend._domainkey`
- Value: `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCldm5Tan3V8FFZTPUwU7kStiyDqdvPnQIHXGBVKzWhN0pyS8t7ZqlHLbmw6PtRikvH+xsXpsvjQNVSrcNR6PT26pAnYFff0d4QQLL16Y28fHvKQTdB645E+y6IMmiE0eUrESVKf72xoL1xEsB7v5+Rxc1detz/r9qgVXElavhWFQIDAQAB`
- TTL: Auto

**SPF (Required)**:

- Type: `TXT`
- Name: `send` (or `@` for root domain)
- Value: `v=spf1 include:amazonses.com ~all`
- TTL: Auto

**MX (Optional - for receiving)**:

- Type: `MX`
- Name: `@`
- Value: `inbound-smtp.ap-northeast-1.amazonaws.com`
- Priority: `0`
- TTL: Auto

### Step 3: Wait for DNS Propagation

After adding DNS records:

1. **Wait 15-60 minutes** for DNS propagation
2. **Check DNS propagation** using:
   - [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) - Enter `resend._domainkey.tryaiva.io`
   - [DNS Checker](https://dnschecker.org) - Check TXT records
3. **Refresh Resend dashboard** - Status should update automatically

### Step 4: Manually Trigger Verification (If Available)

1. In Resend Dashboard → Domains → `tryaiva.io`
2. Look for **"Verify"** or **"Re-verify"** button
3. Click it to trigger verification check
4. Wait a few minutes and check status again

### Step 5: Verify Sender Email Matches

**Important**: The sender email in Supabase SMTP must match the verified domain.

1. Go to **Supabase Dashboard** → **Authentication** → **SMTP Settings**
2. Check **"Sender email"** field:

   - ✅ Should be: `noreply@tryaiva.io` or `no-reply@tryaiva.io`
   - ❌ NOT: `admin@tryaiva.io` (unless that's also verified)
   - ❌ NOT: `noreply@aiva.io` (wrong domain)

3. **Update if needed**:
   - Change to: `noreply@tryaiva.io`
   - Save settings
   - Test connection

## Alternative: Use Resend's Default Domain (Temporary)

If you need emails working immediately:

1. Go to **Supabase Dashboard** → **SMTP Settings**
2. Change **"Sender email"** to: `onboarding@resend.dev`
3. This uses Resend's default verified domain
4. **Note**: This is temporary - switch back to `noreply@tryaiva.io` once domain is verified

## Troubleshooting

### DNS Records Not Showing Up

1. **Check DNS propagation**:

   ```bash
   # Check DKIM record
   dig TXT resend._domainkey.tryaiva.io

   # Check SPF record
   dig TXT send.tryaiva.io
   ```

2. **Verify records in your DNS provider**:

   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Check DNS records match Resend's requirements
   - Ensure no typos in values

3. **Wait longer**: DNS can take up to 48 hours to fully propagate

### Domain Status Stuck on "Pending"

1. **Check DNS records are correct**:

   - DKIM value matches exactly (no extra spaces)
   - SPF record is correct
   - Records are at root domain or correct subdomain

2. **Remove and re-add domain**:

   - Delete domain in Resend
   - Wait 5 minutes
   - Re-add domain
   - Re-add DNS records
   - Wait for verification

3. **Contact Resend Support**:
   - Email: support@resend.com
   - Include domain name and DNS record screenshots

### Verification Failed

1. **Check DNS records**:

   - Ensure all required records are present
   - Values match exactly (case-sensitive)
   - No extra characters or spaces

2. **Check DNS provider**:

   - Some providers have character limits
   - Some require specific formatting
   - Check provider's DNS documentation

3. **Try subdomain instead**:
   - Use `mail.tryaiva.io` instead of root domain
   - Add DNS records for subdomain
   - Update Supabase sender to `noreply@mail.tryaiva.io`

## Expected Timeline

- **DNS Propagation**: 15 minutes to 48 hours (usually 1-2 hours)
- **Resend Verification**: Usually automatic after DNS propagates
- **Total Time**: 1-4 hours typically, up to 48 hours in rare cases

## Verify It's Working

Once domain is verified:

1. **Check Resend Dashboard**:

   - Domain status shows ✅ "Verified"
   - All DNS records show ✅ "Verified"

2. **Test Email Sending**:

   - Send a magic link from your app
   - Check Resend Dashboard → Emails
   - Should show "Delivered" status
   - No more "domain not verified" errors

3. **Check Email Inbox**:
   - Email should be received
   - From address should be `noreply@tryaiva.io`

## Current Status Check

Based on your screenshot:

- ✅ Domain is added
- ✅ DNS records are configured
- ⏳ **Status**: Likely still "Pending" verification
- ⏳ **Action**: Wait for DNS propagation and Resend verification

## Next Steps

1. **Wait 15-60 minutes** for DNS to propagate
2. **Refresh Resend dashboard** to check verification status
3. **Verify sender email** in Supabase matches `noreply@tryaiva.io`
4. **Test email sending** once status shows "Verified"

If still not verified after 2 hours, contact Resend support with your domain name.
