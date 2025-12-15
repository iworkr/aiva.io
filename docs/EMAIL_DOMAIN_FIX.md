# Email Domain Fix - tryaiva.io

## Issue Fixed

The application was trying to send emails from `admin@aiva.io`, but the verified domain in Resend is `tryaiva.io`.

## Changes Made

All email addresses have been updated to use the verified domain `tryaiva.io`:

### Environment Variables Updated:
- `.env`: `ADMIN_EMAIL=admin@tryaiva.io`
- `.env.local`: `ADMIN_EMAIL=admin@tryaiva.io`
- `.env.example`: `ADMIN_EMAIL=admin@tryaiva.io`

### Code Updated:
- `src/utils/email-service.tsx`: Fallback email now uses `admin@tryaiva.io`

## Action Required: Update Vercel Environment Variables

You **MUST** update these in Vercel:

1. **ADMIN_EMAIL**:
   - Go to Vercel → Settings → Environment Variables
   - Update `ADMIN_EMAIL` to: `admin@tryaiva.io`
   - Make sure it's enabled for **Production** environment
   - Redeploy

2. **RESEND_API_KEY** (if different):
   - Make sure it matches Supabase SMTP password: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu`
   - Update if needed
   - Redeploy

## Verify Domain in Resend

Make sure `tryaiva.io` is verified in Resend:

1. Go to [Resend Domains](https://resend.com/domains)
2. Check if `tryaiva.io` is listed and verified
3. If not verified:
   - Add the domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification

## Test After Update

After updating Vercel environment variables and redeploying:

1. Try sending a magic link
2. Check Vercel logs - should see:
   ```
   📧 Resend email sent successfully: { emailId: 'xxx', to: '...', subject: '...' }
   ✅ Custom magic_link email sent successfully to user@example.com
   ```
3. Check Resend dashboard - email should appear
4. Check recipient's inbox (and spam folder)

## Important Notes

- **Domain must be verified**: Emails can only be sent from verified domains in Resend
- **Use same API key**: `RESEND_API_KEY` in Vercel should match Supabase SMTP password
- **From address**: Must be from verified domain (`tryaiva.io`)
- **Redeploy required**: Environment variable changes require a redeploy to take effect

