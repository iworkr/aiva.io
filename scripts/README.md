# Environment Variable Update Scripts

Scripts to programmatically update Vercel environment variables.

## Option 1: Using Vercel CLI (Recommended)

### Prerequisites

```bash
npm i -g vercel
vercel login
vercel link  # Link to your project
```

### Update Environment Variables

```bash
# Run the shell script
./scripts/update-env-vars.sh
```

## Option 2: Using Vercel API (Node.js)

### Prerequisites

1. Get Vercel token from: https://vercel.com/account/tokens
2. Set environment variable:
   ```bash
   export VERCEL_TOKEN=your_token_here
   ```

### Update Environment Variables

```bash
node scripts/update-env-vars.js
```

## Option 3: Manual Update via Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your project: `aiva-io`
3. Go to Settings → Environment Variables
4. Add/update the following variables for **Production**:

### Required Environment Variables

**Critical for OAuth:**

- `NEXT_PUBLIC_SITE_URL=https://www.tryaiva.io` (MUST match your domain exactly)
- `GOOGLE_CLIENT_ID` (from Google Cloud Console)
- `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
- `MICROSOFT_CLIENT_ID` (from Azure Portal)
- `MICROSOFT_CLIENT_SECRET` (from Azure Portal)
- `TEAMS_CLIENT_ID` (from Azure Portal - Teams app)
- `TEAMS_CLIENT_SECRET` (from Azure Portal - Teams app)

**See your Vercel dashboard for current values or update them manually.**

## Important Notes

- **NEXT_PUBLIC_SITE_URL** must be set to `https://www.tryaiva.io` for OAuth redirect URIs to work correctly
- After updating environment variables, **redeploy** your application
- Changes take effect immediately after redeployment

## Troubleshooting

### OAuth Redirect URI Mismatch

If you're still getting redirect_uri_mismatch errors:

1. **Verify NEXT_PUBLIC_SITE_URL** is set correctly in Vercel
2. **Check server logs** - the console.log will show the exact redirect URI being used
3. **Verify Google Cloud Console** has the exact redirect URI:
   - `https://www.tryaiva.io/api/auth/gmail/callback`
4. **Redeploy** after updating environment variables

### Debugging

Check your Vercel deployment logs to see the redirect URI being used:

```bash
vercel logs --follow
```

Look for: `🔵 Gmail OAuth Redirect URI:` in the logs.
