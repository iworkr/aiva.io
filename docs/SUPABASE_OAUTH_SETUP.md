# Supabase OAuth Setup Guide

This guide walks you through setting up Google and Microsoft (Azure) OAuth providers in the Supabase Dashboard for Aiva.io.

## Prerequisites

- Access to Supabase Dashboard for your project
- Google Cloud Console access (for Google OAuth)
- Azure Portal access (for Microsoft OAuth)
- Your OAuth credentials ready

## Table of Contents

1. [Google OAuth Setup](#google-oauth-setup)
2. [Microsoft Azure OAuth Setup](#microsoft-azure-oauth-setup)
3. [Verification](#verification)

---

## Google OAuth Setup

### Step 1: Navigate to Supabase Auth Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **Aiva.io** (or your project name)
3. Navigate to: **Authentication** → **Providers**
4. Find **Google** in the list of providers

### Step 2: Enable Google Sign-In

1. Toggle **"Enable Sign in with Google"** to **ON**

### Step 3: Configure Google OAuth Credentials

You'll need the following from your Google Cloud Console:

#### Client ID

- **Field**: `Client IDs` (comma-separated list)
- **Value**: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- **Example**: `123456789-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com`
- **Note**: This is your Google OAuth 2.0 Client ID from Google Cloud Console

#### Client Secret

- **Field**: `Client Secret (for OAuth)`
- **Value**: `YOUR_GOOGLE_CLIENT_SECRET`
- **Example**: `GOCSPX-YourClientSecretHere`
- **Note**: This is your Google OAuth 2.0 Client Secret

#### Additional Settings

- **Skip nonce checks**: Leave **OFF** (default) for security
- **Allow users without an email**: Leave **OFF** (default) - we need email addresses

### Step 4: Configure Callback URL

The callback URL is automatically set by Supabase:

- **Callback URL**: `https://lgyewlqzelxkpawnmiog.supabase.co/auth/v1/callback`
- **Important**: This is Supabase's callback URL, NOT your app's callback URL
- **Action**: Copy this URL - you'll need it for Google Cloud Console

### Step 5: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **Aiva.io**
3. Navigate to: **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (the one you're using in Supabase)
5. Click **Edit** (pencil icon)
6. Under **Authorized redirect URIs**, add:
   ```
   https://lgyewlqzelxkpawnmiog.supabase.co/auth/v1/callback
   ```
7. Click **Save**

### Step 6: Save in Supabase

1. Click **Save** at the bottom of the Google provider settings in Supabase
2. You should see a success message

---

## Microsoft Azure OAuth Setup

### Step 1: Navigate to Supabase Auth Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **Aiva.io**
3. Navigate to: **Authentication** → **Providers**
4. Find **Azure** in the list of providers

### Step 2: Enable Azure Sign-In

1. Toggle **"Azure enabled"** to **ON**

### Step 3: Configure Azure OAuth Credentials

You'll need the following from your Azure Portal:

#### Application (client) ID

- **Field**: `Application (client) ID`
- **Value**: `YOUR_AZURE_CLIENT_ID`
- **Example**: `12345678-1234-1234-1234-123456789012`
- **Note**: This is your Azure AD Application (Client) ID

#### Secret Value

- **Field**: `Secret Value`
- **Value**: `YOUR_AZURE_CLIENT_SECRET`
- **Example**: `~YourSecretValueHere~`
- **Important**: Enter the **Secret Value**, NOT the Secret ID
- **Note**: This is the actual secret value from Azure Portal (not the ID `be4edbcd-1c94-4b25-be29-18a3562d4cbd`)

#### Azure Tenant URL (Optional)

- **Field**: `Azure Tenant URL`
- **Value**: Leave empty OR use: `https://login.microsoftonline.com/YOUR_TENANT_ID`
- **Note**: Your Tenant ID from Azure Portal
- **Example**: `https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012`
- **Recommendation**: Leave empty to allow any Microsoft account (personal + work/school)

#### Additional Settings

- **Allow users without an email**: Leave **OFF** (default) - we need email addresses

### Step 4: Configure Callback URL

The callback URL is automatically set by Supabase:

- **Callback URL**: `https://lgyewlqzelxkpawnmiog.supabase.co/auth/v1/callback`
- **Important**: This is Supabase's callback URL, NOT your app's callback URL
- **Action**: Copy this URL - you'll need it for Azure Portal

### Step 5: Update Azure Portal

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to: **Azure Active Directory** → **App registrations**
3. Find your app: **Aiva.io** (or search by your Application Client ID)
4. Click on the app
5. Navigate to: **Authentication**
6. Under **Redirect URIs**, click **Add a platform** → **Web**
7. Add the redirect URI:
   ```
   https://lgyewlqzelxkpawnmiog.supabase.co/auth/v1/callback
   ```
8. Under **Implicit grant and hybrid flows**, ensure:
   - ✅ **ID tokens** is checked (required for Supabase)
   - ✅ **Access tokens** is checked (optional, but recommended)
9. Click **Save**

### Step 6: Configure API Permissions (Optional but Recommended)

1. In Azure Portal, navigate to: **API permissions**
2. Ensure the following permissions are added:
   - **Microsoft Graph** → **User.Read** (Delegated)
   - **Microsoft Graph** → **Mail.ReadWrite** (Delegated) - for Outlook integration
   - **Microsoft Graph** → **Mail.Send** (Delegated) - for Outlook integration
3. Click **Grant admin consent** if you have admin rights

### Step 7: Save in Supabase

1. Click **Save** at the bottom of the Azure provider settings in Supabase
2. You should see a success message

---

## Verification

### Test Google OAuth

1. Go to your app: `https://www.tryaiva.io/en/login`
2. Click **"Sign in with Google (Gmail)"**
3. You should be redirected to Google's OAuth consent screen
4. After authorizing, you should be redirected back to your app
5. Check that:
   - User is authenticated
   - Gmail channel connection is created
   - User is redirected to inbox

### Test Microsoft OAuth

1. Go to your app: `https://www.tryaiva.io/en/login`
2. Click **"Sign in with Outlook"**
3. You should be redirected to Microsoft's OAuth consent screen
4. After authorizing, you should be redirected back to your app
5. Check that:
   - User is authenticated
   - Outlook channel connection is created
   - User is redirected to inbox

### Troubleshooting

#### "redirect_uri_mismatch" Error

**Problem**: The redirect URI in Google/Azure doesn't match Supabase's callback URL.

**Solution**:

1. Copy the exact callback URL from Supabase: `https://lgyewlqzelxkpawnmiog.supabase.co/auth/v1/callback`
2. Add it to Google Cloud Console → Authorized redirect URIs
3. Add it to Azure Portal → Redirect URIs
4. Wait 1-2 minutes for changes to propagate

#### "Invalid client secret" Error

**Problem**: The client secret is incorrect or expired.

**Solution**:

1. Check that you're using the **Secret Value**, not the Secret ID
2. For Azure: Generate a new client secret if needed
3. Update Supabase with the new secret value

#### "User not found" After OAuth

**Problem**: User signs in but no account is created.

**Solution**:

1. Check Supabase → Authentication → Users
2. Verify the user was created
3. Check Supabase logs for errors
4. Ensure "Allow users without an email" is OFF (we need emails)

#### Channel Connection Not Created

**Problem**: User authenticates but Gmail/Outlook connection isn't created.

**Solution**:

1. Check application logs for errors
2. Verify workspace was created/assigned
3. Check that OAuth scopes include Gmail/Outlook permissions
4. Verify channel connection was created in database

---

## Important Notes

### Callback URLs

- **Supabase Callback**: `https://lgyewlqzelxkpawnmiog.supabase.co/auth/v1/callback`

  - This is what you add to Google/Azure
  - Supabase handles the OAuth callback and then redirects to your app

- **App Callback**: `https://www.tryaiva.io/api/auth/google-signin/callback`
  - This is handled by your Next.js app
  - Supabase redirects here after successful OAuth

### Security

- **Never commit secrets to git** - they're already in `.env` files
- **Rotate secrets regularly** - especially if exposed
- **Use environment variables** - never hardcode credentials
- **Enable MFA** on Supabase account for additional security

### Environment Variables

Make sure these are set in your `.env` files:

```bash
# Google OAuth (for Gmail channel connection)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# Microsoft OAuth (for Outlook channel connection)
MICROSOFT_CLIENT_ID=YOUR_AZURE_CLIENT_ID
MICROSOFT_CLIENT_SECRET=YOUR_AZURE_CLIENT_SECRET
AZURE_TENANT_ID=YOUR_AZURE_TENANT_ID
```

**Important**: Replace the placeholder values with your actual credentials from:

- Google Cloud Console (for Google OAuth)
- Azure Portal (for Microsoft OAuth)

### Next Steps

After completing this setup:

1. ✅ Test OAuth sign-in flows
2. ✅ Verify channel connections are created
3. ✅ Test message syncing from connected channels
4. ✅ Monitor Supabase logs for any errors
5. ✅ Update production environment variables if needed

---

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs → Auth
2. Check application logs: Vercel/Render logs
3. Verify all redirect URIs match exactly
4. Ensure secrets are correct and not expired
5. Test with a fresh browser session (incognito mode)

For more information:

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Azure OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-azure)
