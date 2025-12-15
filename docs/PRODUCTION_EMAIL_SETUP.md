# Production Email Setup - Quick Fix

## Issue: Missing RESEND_API_KEY

If you're seeing the error:
```
Error: Missing API key. Pass it to the constructor `new Resend("re_123")`
```

This means the `RESEND_API_KEY` environment variable is not set in your production environment.

## Quick Fix

### For Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Add:
   - **Key**: `RESEND_API_KEY`
   - **Value**: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu` (use the same key as Supabase SMTP)
   - **Environment**: Select all (Production, Preview, Development)
5. Also add/update:
   - **Key**: `ADMIN_EMAIL`
   - **Value**: `admin@tryaiva.io` (must use verified domain: tryaiva.io)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application

### For Render:

1. Go to your Render dashboard
2. Navigate to your service → **Environment**
3. Click **Add Environment Variable**
4. Add:
   - **Key**: `RESEND_API_KEY`
   - **Value**: `re_U3wbepDx_8jGmrWhM5JZhvy2UmebYBMDa`
5. Click **Save Changes**
6. Render will automatically redeploy

### For Other Platforms:

Add the environment variable:
- **Key**: `RESEND_API_KEY`
- **Value**: `re_U3wbepDx_8jGmrWhM5JZhvy2UmebYBMDa`

Then redeploy your application.

## Verify Setup

After adding the environment variable and redeploying:

1. Try sending a magic link
2. Check your Resend dashboard for email delivery
3. Verify emails are being sent successfully

## Additional Required Variables

Make sure these are also set in production:

- `ADMIN_EMAIL` - Your admin email address (must use verified domain: `admin@tryaiva.io`)
- `NEXT_PUBLIC_SITE_URL` - Your production URL (e.g., `https://www.tryaiva.io`)

## Need Help?

If emails still aren't working after setting the environment variable:

1. Check Resend dashboard for API key status
2. Verify the API key is correct
3. Check application logs for detailed error messages
4. Ensure your Resend account is active

