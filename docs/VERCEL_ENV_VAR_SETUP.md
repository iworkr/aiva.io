# Vercel Environment Variable Setup - Step by Step

## Critical: RESEND_API_KEY Not Working

If you're still seeing the "Missing API key" error after adding the variable, follow these steps:

### Step 1: Verify Environment Variable is Set

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`aiva.io` or similar)
3. Go to **Settings** → **Environment Variables**
4. Look for `RESEND_API_KEY` in the list
5. **Verify the value** matches Supabase SMTP password: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu`
6. Also check for `ADMIN_EMAIL` - should be: `admin@tryaiva.io` (must use verified domain)

### Step 2: Check Environment Scope

**CRITICAL**: Make sure the variable is set for **Production** environment:

1. Click on `RESEND_API_KEY` in the list
2. Check which environments are selected:
   - ✅ **Production** (MUST be checked)
   - ✅ Preview (recommended)
   - ✅ Development (optional)

3. If Production is NOT checked:
   - Click **Edit**
   - Check the **Production** checkbox
   - Click **Save**

### Step 3: Force Redeploy

After adding/updating the environment variable:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋯** (three dots) menu
4. Select **Redeploy**
5. Make sure **Use existing Build Cache** is **UNCHECKED**
6. Click **Redeploy**

**OR** push a new commit to trigger a fresh deployment.

### Step 4: Verify in Runtime

After redeploying, check the logs:

1. Go to **Deployments** → Latest deployment → **Functions** tab
2. Look for any errors mentioning `RESEND_API_KEY`
3. The logs should show: `✅ Custom magic_link email sent to...`

### Common Issues

#### Issue 1: Variable Not Visible in Production
- **Solution**: Make sure you selected "Production" when adding the variable
- Vercel requires explicit environment selection

#### Issue 2: Variable Added But Not Working
- **Solution**: You MUST redeploy after adding environment variables
- Vercel doesn't inject new env vars into running deployments

#### Issue 3: Typo in Variable Name
- **Solution**: Double-check the name is exactly `RESEND_API_KEY` (case-sensitive)
- No spaces, no underscores in wrong places

#### Issue 4: Value Has Extra Spaces
- **Solution**: Copy the exact value: `re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu`
- No leading/trailing spaces

#### Issue 5: Domain Not Verified
- **Error**: "The aiva.io domain is not verified"
- **Solution**: Update `ADMIN_EMAIL` to use verified domain: `admin@tryaiva.io`
- The "from" email must be from a domain verified in Resend

### Quick Test

After setting up, test by:

1. Going to `/en/login`
2. Enter an email address
3. Click "Send magic link"
4. Check Vercel logs for:
   - ✅ Success: `✅ Custom magic_link email sent to...`
   - ❌ Error: `❌ RESEND_API_KEY is not set...`

### Still Not Working?

1. **Check Vercel Logs**: Go to your deployment → Functions → View logs
2. **Verify API Key**: Check Resend dashboard to ensure the key is active
3. **Test Locally**: Set `RESEND_API_KEY` in `.env.local` and test locally first
4. **Contact Support**: If all else fails, the issue might be with Vercel's env var injection

### Alternative: Use Vercel CLI

You can also set env vars via CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Set environment variable
vercel env add RESEND_API_KEY production

# When prompted, paste: re_5qiqzKmo_6QX7QxtE6Z1cwGALvs71eysu

# Also set ADMIN_EMAIL
vercel env add ADMIN_EMAIL production
# When prompted, paste: admin@tryaiva.io

# Redeploy
vercel --prod
```

