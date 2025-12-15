# Resend Email Troubleshooting Guide

## Issue: Logs Show "Email Sent" But No Email Received

If you see `✅ Custom magic_link email sent to...` in logs but no email appears in Resend dashboard or recipient's inbox, check the following:

### 1. Verify Resend API Key Matches

**CRITICAL**: Make sure the `RESEND_API_KEY` in your Vercel environment variables matches the one in Supabase SMTP settings.

- **Supabase SMTP Password**: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu`
- **Vercel Environment Variable**: Should be the same key

**To Fix**:

1. Go to Vercel → Settings → Environment Variables
2. Update `RESEND_API_KEY` to: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu`
3. Redeploy

### 2. Verify "From" Email Domain is Verified

The `from` email address must be from a verified domain in Resend.

**Current Setup**:

- `ADMIN_EMAIL` = `admin@tryaiva.io` (must use verified domain: tryaiva.io)
- This domain must be verified in Resend

**To Check**:

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Check if `tryaiva.io` or `aiva.io` is verified
3. If not verified:
   - Add the domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification

**To Fix**:

- Use a verified domain email, OR
- Verify your domain in Resend first

### 3. Check Resend API Response

The updated code now properly checks the Resend API response. Check your logs for:

**Success**:

```
✅ Custom magic_link email sent successfully to user@example.com
📧 Resend email sent successfully: { emailId: 'xxx', to: '...', subject: '...' }
```

**Failure**:

```
❌ Resend API returned an error: { ... }
❌ Failed to send magic_link email to user@example.com
```

### 4. Check Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Check the "Emails" tab
3. Look for recent sends
4. Check status (Delivered, Bounced, Failed)

### 5. Common Issues

#### Issue: "From" Domain Not Verified

**Error**: Email fails silently or returns error
**Solution**: Verify domain in Resend or use a verified email

#### Issue: API Key Mismatch

**Error**: Different keys in Vercel vs Supabase
**Solution**: Use the same API key everywhere: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu`

#### Issue: Rate Limiting

**Error**: Too many requests
**Solution**: Check Resend dashboard for rate limits

#### Issue: Invalid Email Format

**Error**: Email address format invalid
**Solution**: Verify email addresses are valid

### 6. Testing

**Test Email Sending**:

1. Try sending a magic link
2. Check Vercel logs for detailed response
3. Check Resend dashboard for email status
4. Check spam folder

**Expected Log Output** (Success):

```
📧 Resend email sent successfully: {
  emailId: 'abc123...',
  to: 'user@example.com',
  subject: 'Sign in to Aiva.io'
}
✅ Custom magic_link email sent successfully to user@example.com
```

**Expected Log Output** (Failure):

```
❌ Resend API returned an error: { message: '...', statusCode: ... }
❌ Failed to send magic_link email to user@example.com: { error: '...' }
```

### 7. Quick Fix Checklist

- [ ] `RESEND_API_KEY` in Vercel matches Supabase SMTP password
- [ ] `ADMIN_EMAIL` uses a verified domain
- [ ] Domain is verified in Resend dashboard
- [ ] DNS records (SPF, DKIM) are added
- [ ] Check Resend dashboard for email status
- [ ] Check Vercel logs for detailed errors
- [ ] Try sending a test email

### 8. Still Not Working?

1. **Check Resend Dashboard**: Look for failed sends with error messages
2. **Check Vercel Logs**: Look for detailed error responses from Resend API
3. **Verify API Key**: Make sure it's active in Resend dashboard
4. **Test with Simple Email**: Try sending a test email directly via Resend API
5. **Contact Resend Support**: If API key is valid but emails still fail

### 9. Using Same API Key Everywhere

**Recommended**: Use the same Resend API key in:

- Vercel Environment Variables (`RESEND_API_KEY`)
- Supabase SMTP Password
- Any other services

**Current Key** (from Supabase SMTP):

```
re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu
```

Update Vercel environment variable to match this key.
