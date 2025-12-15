# Aiva.io - Complete Integrations Setup Guide

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Production URL**: https://www.tryaiva.io

---

## Table of Contents

1. [Email Integrations](#email-integrations)
   - [Gmail](#gmail-setup)
   - [Outlook](#outlook-setup)
2. [Messaging Integrations](#messaging-integrations)
   - [Slack](#slack-setup)
   - [Microsoft Teams](#microsoft-teams-setup)
   - [WhatsApp Business](#whatsapp-business-setup)
   - [Telegram](#telegram-setup)
3. [Social Media Integrations](#social-media-integrations)
   - [X (Twitter)](#x-twitter-setup)
   - [Instagram](#instagram-setup)
   - [Facebook Messenger](#facebook-messenger-setup)
   - [LinkedIn](#linkedin-setup)
4. [Calendar Integrations](#calendar-integrations)
   - [Google Calendar](#google-calendar-setup)
   - [Outlook Calendar](#outlook-calendar-setup)
   - [Apple Calendar](#apple-calendar-setup)
5. [General Setup](#general-setup)
6. [Troubleshooting](#troubleshooting)

---

## Email Integrations

### Gmail Setup

**Status**: ✅ Available Now  
**API**: Gmail API  
**OAuth**: OAuth 2.0

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `Aiva.io` (or your preferred name)
4. Click **"Create"**
5. Wait for project creation (30 seconds)

#### Step 2: Enable Gmail API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Gmail API"**
3. Click on **"Gmail API"**
4. Click **"Enable"**
5. Wait for API to enable (10-20 seconds)

#### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in the form:
   - **App name**: `Aiva.io`
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. **Scopes** (Step 2):
   - Click **"Add or Remove Scopes"**
   - Add these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Click **"Update"** → **"Save and Continue"**
7. **Test users** (Step 3):
   - Add your email address as a test user
   - Click **"Save and Continue"**
8. **Summary** (Step 4):
   - Review and click **"Back to Dashboard"**

#### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure consent screen (skip if already done)
4. Select **"Web application"**
5. Fill in:
   - **Name**: `Aiva.io Gmail Integration`
   - **Authorized JavaScript origins**: 
     - `https://www.tryaiva.io`
     - `http://localhost:3000` (for local development)
   - **Authorized redirect URIs**:
     - `https://www.tryaiva.io/api/auth/gmail/callback`
     - `http://localhost:3000/api/auth/gmail/callback` (for local development)
6. Click **"Create"**
7. **Copy the credentials**:
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxx`

#### Step 5: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Gmail Integration
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

#### Step 6: Optional - Gmail Push Notifications

For real-time message ingestion:

1. Go to **"APIs & Services"** → **"Library"**
2. Search for **"Cloud Pub/Sub API"**
3. Enable **"Cloud Pub/Sub API"**
4. Go to [Pub/Sub Console](https://console.cloud.google.com/cloudpubsub)
5. Create a topic: `gmail-push-notifications`
6. Add to `.env.local`:
   ```bash
   GOOGLE_PUBSUB_TOPIC=projects/YOUR_PROJECT_ID/topics/gmail-push-notifications
   ```

#### Step 7: Test Gmail Integration

1. Start your development server: `pnpm dev`
2. Navigate to: `https://www.tryaiva.io/channels` (or `http://localhost:3000/channels`)
3. Click **"Connect Gmail"**
4. Authorize the application
5. You should be redirected back with a success message
6. Click **"Sync Now"** to test message sync

#### Gmail API Scopes Used

- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify emails (mark as read, archive)
- `https://www.googleapis.com/auth/userinfo.email` - Get user email
- `https://www.googleapis.com/auth/userinfo.profile` - Get user profile

#### Troubleshooting Gmail

**Error: "redirect_uri_mismatch"**
- Verify redirect URI in Google Cloud Console matches exactly: `https://www.tryaiva.io/api/auth/gmail/callback`
- Check for trailing slashes or HTTP vs HTTPS

**Error: "access_denied"**
- Check OAuth consent screen is configured
- Verify test users are added (if app is in testing mode)

**Error: "invalid_client"**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check credentials are for "Web application" type

---

### Outlook Setup

**Status**: ✅ Available Now  
**API**: Microsoft Graph API  
**OAuth**: OAuth 2.0 (Microsoft Identity Platform)

#### Step 1: Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **"Azure Active Directory"** → **"App registrations"**
3. Click **"New registration"**
4. Fill in:
   - **Name**: `Aiva.io`
   - **Supported account types**: 
     - Select **"Accounts in any organizational directory and personal Microsoft accounts"**
   - **Redirect URI**:
     - Platform: **"Web"**
     - URI: `https://www.tryaiva.io/api/auth/outlook/callback`
5. Click **"Register"**
6. **Copy the Application (client) ID** - you'll need this

#### Step 2: Configure API Permissions

1. In your app registration, go to **"API permissions"**
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Delegated permissions"**
5. Add these permissions:
   - `Mail.ReadWrite` - Read and write mail
   - `Mail.Send` - Send mail
   - `User.Read` - Read user profile
   - `Calendars.ReadWrite` - Read and write calendars
   - `offline_access` - Maintain access to data (for refresh tokens)
6. Click **"Add permissions"**
7. **Important**: Click **"Grant admin consent"** if you're an admin (for organization-wide access)

#### Step 3: Create Client Secret

1. Go to **"Certificates & secrets"**
2. Click **"New client secret"**
3. Fill in:
   - **Description**: `Aiva.io Production Secret`
   - **Expires**: Choose expiration (recommend 24 months)
4. Click **"Add"**
5. **IMPORTANT**: Copy the **Value** immediately (you won't see it again!)
   - It looks like: `xxxxx~xxxxx-xxxxx-xxxxx-xxxxx`

#### Step 4: Configure Redirect URIs

1. Go to **"Authentication"**
2. Under **"Platform configurations"**, click **"Add a platform"** → **"Web"**
3. Add redirect URIs:
   - `https://www.tryaiva.io/api/auth/outlook/callback`
   - `http://localhost:3000/api/auth/outlook/callback` (for local development)
4. Under **"Implicit grant and hybrid flows"**, check:
   - ✅ **ID tokens** (if needed)
5. Click **"Save"**

#### Step 5: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Outlook Integration
MICROSOFT_CLIENT_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
MICROSOFT_CLIENT_SECRET=xxxxx~xxxxx-xxxxx-xxxxx-xxxxx
AZURE_TENANT_ID=common
# Alternative names (if needed)
AZURE_CLIENT_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
AZURE_CLIENT_SECRET=xxxxx~xxxxx-xxxxx-xxxxx-xxxxx
```

**Note**: `AZURE_TENANT_ID=common` allows both personal and work/school accounts. For organization-only, use your tenant ID.

#### Step 6: Test Outlook Integration

1. Start your development server: `pnpm dev`
2. Navigate to: `https://www.tryaiva.io/channels` (or `http://localhost:3000/channels`)
3. Click **"Connect Outlook"**
4. Sign in with your Microsoft account
5. Grant permissions
6. You should be redirected back with a success message
7. Click **"Sync Now"** to test message sync

#### Microsoft Graph API Scopes Used

- `https://graph.microsoft.com/Mail.ReadWrite` - Read and write mail
- `https://graph.microsoft.com/Mail.Send` - Send mail
- `https://graph.microsoft.com/User.Read` - Read user profile
- `https://graph.microsoft.com/Calendars.ReadWrite` - Read and write calendars
- `offline_access` - Refresh tokens

#### Troubleshooting Outlook

**Error: "AADSTS50011: The reply URL specified in the request does not match"**
- Verify redirect URI in Azure Portal matches exactly: `https://www.tryaiva.io/api/auth/outlook/callback`
- Check for trailing slashes

**Error: "AADSTS700016: Application not found"**
- Verify `MICROSOFT_CLIENT_ID` is correct
- Check application is registered in correct Azure AD tenant

**Error: "AADSTS7000215: Invalid client secret"**
- Verify `MICROSOFT_CLIENT_SECRET` is correct
- Check secret hasn't expired
- Create a new secret if needed

**Error: "Insufficient privileges"**
- Verify API permissions are granted
- Click "Grant admin consent" if you're an admin

---

## Messaging Integrations

### Slack Setup

**Status**: 🚧 Coming Soon (Foundation Ready)  
**API**: Slack Web API  
**OAuth**: OAuth 2.0

#### Step 1: Create Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Fill in:
   - **App Name**: `Aiva.io`
   - **Pick a workspace**: Select your workspace
5. Click **"Create App"**

#### Step 2: Configure OAuth & Permissions

1. In your app, go to **"OAuth & Permissions"** (left sidebar)
2. Scroll to **"Redirect URLs"**
3. Add redirect URLs:
   - `https://www.tryaiva.io/api/auth/slack/callback`
   - `http://localhost:3000/api/auth/slack/callback` (for local development)
4. Click **"Add New Redirect URL"** → **"Save URLs"**

#### Step 3: Configure Bot Token Scopes

1. Scroll to **"Scopes"** → **"Bot Token Scopes"**
2. Add these scopes:
   - `channels:read` - View basic information about public channels
   - `channels:history` - View messages in public channels
   - `chat:write` - Send messages
   - `im:read` - View basic information about direct messages
   - `im:history` - View messages in direct messages
   - `users:read` - View people in a workspace
   - `users:read.email` - View email addresses of people

#### Step 4: Configure User Token Scopes (Optional)

1. Scroll to **"User Token Scopes"**
2. Add scopes if needed:
   - `channels:read` - View basic information about public channels
   - `channels:history` - View messages in public channels

#### Step 5: Install App to Workspace

1. Go to **"Install App"** (left sidebar)
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. **Copy the credentials**:
   - **Client ID**: `xxxxx.xxxxx.xxxxx`
   - **Client Secret**: `xxxxx-xxxxx-xxxxx-xxxxx-xxxxx`
   - **Bot User OAuth Token**: `xoxb-xxxxx-xxxxx-xxxxx` (starts with `xoxb-`)

#### Step 6: Get Signing Secret

1. Go to **"Basic Information"** (left sidebar)
2. Scroll to **"App Credentials"**
3. **Copy the Signing Secret**: `xxxxx-xxxxx-xxxxx-xxxxx-xxxxx`

#### Step 7: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Slack Integration
SLACK_CLIENT_ID=xxxxx.xxxxx.xxxxx
SLACK_CLIENT_SECRET=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
SLACK_SIGNING_SECRET=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
```

#### Step 8: Test Slack Integration

1. Start your development server: `pnpm dev`
2. Navigate to: `https://www.tryaiva.io/channels` (or `http://localhost:3000/channels`)
3. Click **"Connect Slack"**
4. Authorize the application
5. You should be redirected back with a success message

#### Slack API Scopes Used

**Bot Token Scopes**:
- `channels:read` - View basic channel information
- `channels:history` - View channel messages
- `chat:write` - Send messages
- `im:read` - View DM information
- `im:history` - View DM messages
- `users:read` - View user information
- `users:read.email` - View user emails

#### Troubleshooting Slack

**Error: "invalid_redirect_uri"**
- Verify redirect URI in Slack app settings matches exactly: `https://www.tryaiva.io/api/auth/slack/callback`

**Error: "invalid_client"**
- Verify `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are correct
- Check app is installed to workspace

**Error: "token_revoked"**
- Reinstall app to workspace
- Generate new tokens

---

### Microsoft Teams Setup

**Status**: 🚧 Coming Soon  
**API**: Microsoft Graph API  
**OAuth**: OAuth 2.0 (Microsoft Identity Platform)

#### Step 1: Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **"Azure Active Directory"** → **"App registrations"**
3. Click **"New registration"**
4. Fill in:
   - **Name**: `Aiva.io Teams`
   - **Supported account types**: 
     - Select **"Accounts in any organizational directory and personal Microsoft accounts"**
   - **Redirect URI**:
     - Platform: **"Web"**
     - URI: `https://www.tryaiva.io/api/auth/teams/callback`
5. Click **"Register"**
6. **Copy the Application (client) ID**

#### Step 2: Configure API Permissions

1. Go to **"API permissions"**
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Delegated permissions"**
5. Add these permissions:
   - `Chat.Read` - Read chats
   - `Chat.ReadWrite` - Read and write chats
   - `ChannelMessage.Read.All` - Read all channel messages
   - `ChannelMessage.Send` - Send channel messages
   - `User.Read` - Read user profile
   - `offline_access` - Refresh tokens
6. Click **"Add permissions"**
7. Click **"Grant admin consent"** (if admin)

#### Step 3: Create Client Secret

1. Go to **"Certificates & secrets"**
2. Click **"New client secret"**
3. Fill in description and expiration
4. Click **"Add"**
5. **Copy the secret value immediately**

#### Step 4: Configure Redirect URIs

1. Go to **"Authentication"**
2. Add redirect URIs:
   - `https://www.tryaiva.io/api/auth/teams/callback`
   - `http://localhost:3000/api/auth/teams/callback` (for local development)
3. Click **"Save"**

#### Step 5: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Microsoft Teams Integration
TEAMS_CLIENT_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
TEAMS_CLIENT_SECRET=xxxxx~xxxxx-xxxxx-xxxxx-xxxxx
TEAMS_TENANT_ID=common
```

#### Microsoft Graph API Scopes Used

- `https://graph.microsoft.com/Chat.Read` - Read chats
- `https://graph.microsoft.com/Chat.ReadWrite` - Read and write chats
- `https://graph.microsoft.com/ChannelMessage.Read.All` - Read all channel messages
- `https://graph.microsoft.com/ChannelMessage.Send` - Send channel messages
- `https://graph.microsoft.com/User.Read` - Read user profile
- `offline_access` - Refresh tokens

---

### WhatsApp Business Setup

**Status**: 🚧 Coming Soon  
**API**: WhatsApp Business API (via Meta)  
**OAuth**: OAuth 2.0 (Meta)

#### Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Fill in:
   - **App Name**: `Aiva.io`
   - **App Contact Email**: Your email
5. Click **"Create App"**

#### Step 2: Add WhatsApp Product

1. In your app dashboard, go to **"Add Products"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. Follow the setup wizard

#### Step 3: Configure WhatsApp Business API

1. Go to **"WhatsApp"** → **"API Setup"**
2. You'll need:
   - **Phone Number ID**: Provided by Meta
   - **Business Account ID**: Your Meta Business account
   - **Access Token**: Generated token
   - **Webhook Verify Token**: Create a secure random string

#### Step 4: Configure Webhooks

1. Go to **"WhatsApp"** → **"Configuration"**
2. Under **"Webhook"**, click **"Edit"**
3. Fill in:
   - **Callback URL**: `https://www.tryaiva.io/api/webhooks/whatsapp`
   - **Verify Token**: Your secure random string (save this!)
4. Subscribe to fields:
   - ✅ `messages`
   - ✅ `message_status`
5. Click **"Verify and Save"**

#### Step 5: Configure Environment Variables

Add to your `.env.local` file:

```bash
# WhatsApp Business Integration
WHATSAPP_PHONE_NUMBER_ID=xxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx
WHATSAPP_ACCESS_TOKEN=xxxxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_secure_random_string
WHATSAPP_APP_SECRET=xxxxx
```

#### Step 6: Test WhatsApp Integration

1. Send a test message to your WhatsApp Business number
2. Check webhook logs in Meta dashboard
3. Verify messages are received in Aiva.io

#### Troubleshooting WhatsApp

**Error: "Invalid webhook signature"**
- Verify `WHATSAPP_APP_SECRET` is correct
- Check webhook signature verification in code

**Error: "Webhook verification failed"**
- Verify `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches in Meta dashboard
- Check callback URL is accessible

---

### Telegram Setup

**Status**: 🚧 Coming Soon  
**API**: Telegram Bot API  
**OAuth**: Bot Token (not OAuth)

#### Step 1: Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Start a chat and send `/newbot`
3. Follow instructions:
   - Choose a name: `Aiva.io Bot`
   - Choose a username: `aiva_io_bot` (must end with `_bot`)
4. **Copy the Bot Token**: `xxxxx:xxxxx-xxxxx-xxxxx-xxxxx`

#### Step 2: Configure Bot Settings

1. Send `/setdescription` to BotFather
2. Set description: `AI-powered communication assistant for Aiva.io`
3. Send `/setabouttext` to set about text
4. Send `/setuserpic` to set profile picture (optional)

#### Step 3: Enable Bot Privacy (Optional)

1. Send `/setprivacy` to BotFather
2. Select your bot
3. Choose **"Disable"** to allow bot to read all messages in groups

#### Step 4: Configure Webhook

1. Set webhook URL:
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -d "url=https://www.tryaiva.io/api/webhooks/telegram"
   ```

#### Step 5: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Telegram Integration
TELEGRAM_BOT_TOKEN=xxxxx:xxxxx-xxxxx-xxxxx-xxxxx
TELEGRAM_WEBHOOK_SECRET=your_secure_random_string
```

#### Step 6: Test Telegram Integration

1. Start a chat with your bot
2. Send a test message
3. Verify webhook receives the message

#### Troubleshooting Telegram

**Error: "Unauthorized"**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check token hasn't been revoked

**Error: "Webhook URL must use HTTPS"**
- Ensure webhook URL uses HTTPS
- Check SSL certificate is valid

---

## Social Media Integrations

### X (Twitter) Setup

**Status**: 🚧 Coming Soon  
**API**: Twitter API v2  
**OAuth**: OAuth 2.0

#### Step 1: Create Twitter Developer Account

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Sign in with your Twitter account
3. Apply for developer access (if needed)
4. Accept terms and conditions

#### Step 2: Create App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click **"Create App"** or **"Create Project"**
3. Fill in:
   - **App Name**: `Aiva.io`
   - **Use case**: Select appropriate use case
4. Click **"Create"**

#### Step 3: Configure App Settings

1. In your app, go to **"Settings"** → **"User authentication settings"**
2. Click **"Set up"**
3. Configure:
   - **App permissions**: 
     - ✅ Read users (for profile)
     - ✅ Read Tweets (for mentions)
     - ✅ Read and write Direct Messages
   - **Type of App**: **Web App, Automated App or Bot**
   - **Callback URI / Redirect URL**:
     - `https://www.tryaiva.io/api/auth/twitter/callback`
     - `http://localhost:3000/api/auth/twitter/callback` (for local development)
   - **Website URL**: `https://www.tryaiva.io`
4. Click **"Save"**

#### Step 4: Generate Keys and Tokens

1. Go to **"Keys and tokens"**
2. **Copy the credentials**:
   - **API Key**: `xxxxx`
   - **API Key Secret**: `xxxxx`
   - **Bearer Token**: `xxxxx` (for app-only auth)
3. Generate **Access Token and Secret**:
   - Click **"Generate"** under "Access Token and Secret"
   - **Copy Access Token**: `xxxxx`
   - **Copy Access Token Secret**: `xxxxx`

#### Step 5: Configure Environment Variables

Add to your `.env.local` file:

```bash
# X (Twitter) Integration
TWITTER_API_KEY=xxxxx
TWITTER_API_SECRET=xxxxx
TWITTER_ACCESS_TOKEN=xxxxx
TWITTER_ACCESS_TOKEN_SECRET=xxxxx
TWITTER_BEARER_TOKEN=xxxxx
```

#### Step 6: Test Twitter Integration

1. Start your development server: `pnpm dev`
2. Navigate to: `https://www.tryaiva.io/channels` (or `http://localhost:3000/channels`)
3. Click **"Connect X (Twitter)"**
4. Authorize the application
5. You should be redirected back with a success message

#### Twitter API Scopes Used

- `tweet.read` - Read tweets
- `users.read` - Read user profile
- `dm.read` - Read direct messages
- `dm.write` - Send direct messages
- `offline.access` - Refresh tokens

#### Troubleshooting Twitter

**Error: "Invalid or expired token"**
- Verify all tokens are correct
- Check tokens haven't expired
- Regenerate tokens if needed

**Error: "Forbidden"**
- Verify app has required permissions
- Check API access level (Essential, Elevated, or Academic Research)

**Error: "Rate limit exceeded"**
- Twitter API has rate limits
- Implement rate limiting in your code
- Consider upgrading to higher API tier

---

### Instagram Setup

**Status**: 🚧 Coming Soon  
**API**: Instagram Basic Display API / Instagram Graph API  
**OAuth**: OAuth 2.0 (Facebook)

#### Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Fill in:
   - **App Name**: `Aiva.io`
   - **App Contact Email**: Your email
5. Click **"Create App"**

#### Step 2: Add Instagram Product

1. In your app dashboard, go to **"Add Products"**
2. Find **"Instagram"** and click **"Set Up"**
3. Choose **"Instagram Basic Display"** or **"Instagram Graph API"**

#### Step 3: Configure Instagram Basic Display (For Personal Accounts)

1. Go to **"Instagram"** → **"Basic Display"**
2. Configure:
   - **Valid OAuth Redirect URIs**:
     - `https://www.tryaiva.io/api/auth/instagram/callback`
     - `http://localhost:3000/api/auth/instagram/callback`
   - **Deauthorize Callback URL**: `https://www.tryaiva.io/api/auth/instagram/deauthorize`
   - **Data Deletion Request URL**: `https://www.tryaiva.io/api/auth/instagram/delete`
3. Click **"Save Changes"**

#### Step 4: Configure Instagram Graph API (For Business Accounts)

1. Go to **"Instagram"** → **"Basic Display"**
2. Switch to **"Instagram Graph API"**
3. Configure:
   - **Valid OAuth Redirect URIs**:
     - `https://www.tryaiva.io/api/auth/instagram/callback`
     - `http://localhost:3000/api/auth/instagram/callback`
4. Add permissions:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_read_engagement`

#### Step 5: Get App Credentials

1. Go to **"Settings"** → **"Basic"**
2. **Copy the credentials**:
   - **App ID**: `xxxxx`
   - **App Secret**: `xxxxx`

#### Step 6: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Instagram Integration
INSTAGRAM_APP_ID=xxxxx
INSTAGRAM_APP_SECRET=xxxxx
INSTAGRAM_REDIRECT_URI=https://www.tryaiva.io/api/auth/instagram/callback
```

#### Step 7: Test Instagram Integration

1. Start your development server: `pnpm dev`
2. Navigate to: `https://www.tryaiva.io/channels` (or `http://localhost:3000/channels`)
3. Click **"Connect Instagram"**
4. Authorize the application
5. You should be redirected back with a success message

#### Instagram API Scopes Used

- `instagram_basic` - Basic profile information
- `instagram_manage_messages` - Read and send messages
- `pages_show_list` - List connected pages
- `pages_read_engagement` - Read engagement data

#### Troubleshooting Instagram

**Error: "Invalid redirect_uri"**
- Verify redirect URI matches exactly in Meta dashboard
- Check for trailing slashes

**Error: "App not approved"**
- Instagram requires app review for production
- Use test mode for development
- Submit for review when ready

---

### Facebook Messenger Setup

**Status**: 🚧 Coming Soon  
**API**: Facebook Messenger API  
**OAuth**: OAuth 2.0 (Meta)

#### Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Fill in:
   - **App Name**: `Aiva.io`
   - **App Contact Email**: Your email
5. Click **"Create App"**

#### Step 2: Add Messenger Product

1. In your app dashboard, go to **"Add Products"**
2. Find **"Messenger"** and click **"Set Up"**

#### Step 3: Configure Messenger

1. Go to **"Messenger"** → **"Settings"**
2. Under **"Access Tokens"**, select your Facebook Page
3. Generate **Page Access Token**
4. **Copy the Page Access Token**

#### Step 4: Configure Webhooks

1. Go to **"Messenger"** → **"Webhooks"**
2. Click **"Add Callback URL"**
3. Fill in:
   - **Callback URL**: `https://www.tryaiva.io/api/webhooks/facebook`
   - **Verify Token**: Create a secure random string (save this!)
4. Subscribe to webhook fields:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `messaging_optins`
   - ✅ `messaging_deliveries`
   - ✅ `messaging_reads`
5. Click **"Verify and Save"**

#### Step 5: Configure App Permissions

1. Go to **"App Review"** → **"Permissions and Features"**
2. Request permissions:
   - `pages_messaging` - Send and receive messages
   - `pages_manage_metadata` - Manage page metadata
   - `pages_read_engagement` - Read engagement data

#### Step 6: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Facebook Messenger Integration
FACEBOOK_APP_ID=xxxxx
FACEBOOK_APP_SECRET=xxxxx
FACEBOOK_PAGE_ACCESS_TOKEN=xxxxx
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your_secure_random_string
```

#### Step 7: Test Facebook Messenger Integration

1. Send a test message to your Facebook Page
2. Check webhook logs in Meta dashboard
3. Verify messages are received in Aiva.io

#### Troubleshooting Facebook Messenger

**Error: "Invalid webhook signature"**
- Verify `FACEBOOK_APP_SECRET` is correct
- Check webhook signature verification in code

**Error: "Page access token expired"**
- Regenerate page access token
- Update `FACEBOOK_PAGE_ACCESS_TOKEN` in environment

---

### LinkedIn Setup

**Status**: 🚧 Coming Soon  
**API**: LinkedIn API  
**OAuth**: OAuth 2.0

#### Step 1: Create LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click **"Create app"**
3. Sign in with your LinkedIn account
4. Fill in:
   - **App name**: `Aiva.io`
   - **LinkedIn Page**: Select or create a LinkedIn Page
   - **Privacy policy URL**: `https://www.tryaiva.io/privacy`
   - **App logo**: Upload logo (optional)
5. Agree to terms and click **"Create app"**

#### Step 2: Configure Auth Settings

1. In your app, go to **"Auth"** tab
2. Under **"Redirect URLs"**, add:
   - `https://www.tryaiva.io/api/auth/linkedin/callback`
   - `http://localhost:3000/api/auth/linkedin/callback` (for local development)
3. Click **"Update"**

#### Step 3: Request API Products

1. Go to **"Products"** tab
2. Request access to:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Marketing Developer Platform** (for messaging)
3. Wait for approval (may take 24-48 hours)

#### Step 4: Get App Credentials

1. Go to **"Auth"** tab
2. **Copy the credentials**:
   - **Client ID**: `xxxxx`
   - **Client Secret**: `xxxxx`

#### Step 5: Configure Environment Variables

Add to your `.env.local` file:

```bash
# LinkedIn Integration
LINKEDIN_CLIENT_ID=xxxxx
LINKEDIN_CLIENT_SECRET=xxxxx
LINKEDIN_REDIRECT_URI=https://www.tryaiva.io/api/auth/linkedin/callback
```

#### Step 6: Test LinkedIn Integration

1. Start your development server: `pnpm dev`
2. Navigate to: `https://www.tryaiva.io/channels` (or `http://localhost:3000/channels`)
3. Click **"Connect LinkedIn"**
4. Authorize the application
5. You should be redirected back with a success message

#### LinkedIn API Scopes Used

- `w_member_social` - Read and write member social actions
- `r_basicprofile` - Read basic profile information
- `r_emailaddress` - Read email address
- `r_liteprofile` - Read lite profile

#### Troubleshooting LinkedIn

**Error: "Invalid redirect_uri"**
- Verify redirect URI matches exactly in LinkedIn app settings
- Check for trailing slashes

**Error: "Insufficient permissions"**
- Verify requested scopes are approved
- Check product access is granted

**Error: "App not approved"**
- LinkedIn requires app review for some permissions
- Use development mode for testing
- Submit for review when ready

---

## Calendar Integrations

### Google Calendar Setup

**Status**: 🚧 Coming Soon (Foundation Ready)  
**API**: Google Calendar API  
**OAuth**: OAuth 2.0

#### Step 1: Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (same as Gmail setup)
3. Go to **"APIs & Services"** → **"Library"**
4. Search for **"Google Calendar API"**
5. Click on **"Google Calendar API"**
6. Click **"Enable"**

#### Step 2: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. If not already configured (from Gmail setup), configure it:
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events`
3. Click **"Save and Continue"**

#### Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. If you already have OAuth credentials from Gmail, you can reuse them
3. Or create new credentials:
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Select **"Web application"**
   - Add redirect URI: `https://www.tryaiva.io/api/auth/google-calendar/callback`
   - Click **"Create"**

#### Step 4: Configure Environment Variables

Add to your `.env.local` file (if using separate credentials):

```bash
# Google Calendar Integration (can reuse Gmail credentials)
GOOGLE_CALENDAR_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-xxxxx
```

**Note**: You can reuse `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Gmail setup.

#### Step 5: Test Google Calendar Integration

1. Start your development server: `pnpm dev`
2. Navigate to: `https://www.tryaiva.io/channels` (or `http://localhost:3000/channels`)
3. Click **"Connect Google Calendar"**
4. Authorize the application
5. You should be redirected back with a success message

#### Google Calendar API Scopes Used

- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- `https://www.googleapis.com/auth/calendar.events` - Create, read, update, delete events

#### Troubleshooting Google Calendar

**Error: "Calendar API not enabled"**
- Enable Google Calendar API in Google Cloud Console
- Wait a few minutes for API to activate

**Error: "Insufficient permissions"**
- Verify scopes are added to OAuth consent screen
- Check user has granted permissions

---

### Outlook Calendar Setup

**Status**: 🚧 Coming Soon  
**API**: Microsoft Graph API  
**OAuth**: OAuth 2.0 (Microsoft Identity Platform)

#### Step 1: Configure API Permissions

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to your app registration (same as Outlook email setup)
3. Go to **"API permissions"**
4. If not already added, add:
   - `Calendars.Read` - Read calendars
   - `Calendars.ReadWrite` - Read and write calendars
5. Click **"Grant admin consent"** (if admin)

#### Step 2: Configure Redirect URIs

1. Go to **"Authentication"**
2. If not already added, add redirect URI:
   - `https://www.tryaiva.io/api/auth/outlook-calendar/callback`
   - `http://localhost:3000/api/auth/outlook-calendar/callback` (for local development)
3. Click **"Save"**

#### Step 3: Configure Environment Variables

You can reuse Outlook email credentials:

```bash
# Outlook Calendar Integration (can reuse Outlook email credentials)
MICROSOFT_CLIENT_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
MICROSOFT_CLIENT_SECRET=xxxxx~xxxxx-xxxxx-xxxxx-xxxxx
```

**Note**: You can reuse `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` from Outlook email setup.

#### Step 4: Test Outlook Calendar Integration

1. Start your development server: `pnpm dev`
2. Navigate to: `https://www.tryaiva.io/channels` (or `http://localhost:3000/channels`)
3. Click **"Connect Outlook Calendar"**
4. Authorize the application
5. You should be redirected back with a success message

#### Microsoft Graph API Scopes Used

- `https://graph.microsoft.com/Calendars.Read` - Read calendars
- `https://graph.microsoft.com/Calendars.ReadWrite` - Read and write calendars

#### Troubleshooting Outlook Calendar

**Error: "Insufficient privileges"**
- Verify `Calendars.Read` and `Calendars.ReadWrite` permissions are granted
- Click "Grant admin consent" if you're an admin

---

### Apple Calendar Setup

**Status**: 🚧 Coming Soon  
**API**: CalDAV Protocol  
**OAuth**: Not applicable (uses CalDAV)

#### Step 1: Enable iCloud CalDAV

1. On your Mac or iOS device:
   - Go to **Settings** → **iCloud**
   - Enable **"Calendars"**
2. Get your CalDAV server URL:
   - For iCloud: `https://caldav.icloud.com`
   - For other CalDAV servers: Use your server's CalDAV URL

#### Step 2: Get iCloud Credentials

1. You'll need:
   - **iCloud Email**: Your Apple ID email
   - **App-Specific Password**: Generate from [appleid.apple.com](https://appleid.apple.com)
     - Go to **"Sign-In and Security"** → **"App-Specific Passwords"**
     - Click **"Generate an app-specific password"**
     - Name it: `Aiva.io`
     - **Copy the password** (you won't see it again!)

#### Step 3: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Apple Calendar Integration (CalDAV)
APPLE_CALENDAR_EMAIL=your_apple_id@icloud.com
APPLE_CALENDAR_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_CALDAV_SERVER=https://caldav.icloud.com
```

#### Step 4: Test Apple Calendar Integration

1. Test CalDAV connection using a CalDAV client
2. Verify events can be read and created
3. Test integration in Aiva.io

#### Troubleshooting Apple Calendar

**Error: "Authentication failed"**
- Verify app-specific password is correct
- Check password hasn't been revoked
- Generate new app-specific password if needed

**Error: "Connection refused"**
- Verify CalDAV server URL is correct
- Check firewall settings
- Ensure CalDAV is enabled on your iCloud account

---

## General Setup

### Environment Variables Summary

Here's a complete list of all environment variables for integrations:

```bash
# =============================================================================
# EMAIL INTEGRATIONS
# =============================================================================
# Gmail
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_PUBSUB_TOPIC=projects/xxxxx/topics/gmail-push-notifications

# Outlook
MICROSOFT_CLIENT_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
MICROSOFT_CLIENT_SECRET=xxxxx~xxxxx-xxxxx-xxxxx-xxxxx
AZURE_TENANT_ID=common
AZURE_CLIENT_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
AZURE_CLIENT_SECRET=xxxxx~xxxxx-xxxxx-xxxxx-xxxxx

# =============================================================================
# MESSAGING INTEGRATIONS
# =============================================================================
# Slack
SLACK_CLIENT_ID=xxxxx.xxxxx.xxxxx
SLACK_CLIENT_SECRET=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
SLACK_SIGNING_SECRET=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx

# Microsoft Teams
TEAMS_CLIENT_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
TEAMS_CLIENT_SECRET=xxxxx~xxxxx-xxxxx-xxxxx-xxxxx
TEAMS_TENANT_ID=common

# WhatsApp Business
WHATSAPP_PHONE_NUMBER_ID=xxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx
WHATSAPP_ACCESS_TOKEN=xxxxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_secure_random_string
WHATSAPP_APP_SECRET=xxxxx

# Telegram
TELEGRAM_BOT_TOKEN=xxxxx:xxxxx-xxxxx-xxxxx-xxxxx
TELEGRAM_WEBHOOK_SECRET=your_secure_random_string

# =============================================================================
# SOCIAL MEDIA INTEGRATIONS
# =============================================================================
# X (Twitter)
TWITTER_API_KEY=xxxxx
TWITTER_API_SECRET=xxxxx
TWITTER_ACCESS_TOKEN=xxxxx
TWITTER_ACCESS_TOKEN_SECRET=xxxxx
TWITTER_BEARER_TOKEN=xxxxx

# Instagram
INSTAGRAM_APP_ID=xxxxx
INSTAGRAM_APP_SECRET=xxxxx
INSTAGRAM_REDIRECT_URI=https://www.tryaiva.io/api/auth/instagram/callback

# Facebook Messenger
FACEBOOK_APP_ID=xxxxx
FACEBOOK_APP_SECRET=xxxxx
FACEBOOK_PAGE_ACCESS_TOKEN=xxxxx
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your_secure_random_string

# LinkedIn
LINKEDIN_CLIENT_ID=xxxxx
LINKEDIN_CLIENT_SECRET=xxxxx
LINKEDIN_REDIRECT_URI=https://www.tryaiva.io/api/auth/linkedin/callback

# =============================================================================
# CALENDAR INTEGRATIONS
# =============================================================================
# Google Calendar (can reuse Gmail credentials)
GOOGLE_CALENDAR_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-xxxxx

# Outlook Calendar (can reuse Outlook email credentials)
# Uses MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET

# Apple Calendar
APPLE_CALENDAR_EMAIL=your_apple_id@icloud.com
APPLE_CALENDAR_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_CALDAV_SERVER=https://caldav.icloud.com

# =============================================================================
# GENERAL
# =============================================================================
NEXT_PUBLIC_SITE_URL=https://www.tryaiva.io
```

### Production Checklist

Before deploying to production, ensure:

- [ ] All OAuth redirect URIs updated to production domain
- [ ] All environment variables set in production environment
- [ ] OAuth consent screens configured for production
- [ ] App reviews submitted (if required)
- [ ] Webhook URLs updated to production domain
- [ ] SSL certificates valid
- [ ] Rate limits configured
- [ ] Error tracking enabled (Sentry)
- [ ] Monitoring set up
- [ ] Documentation updated

### Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env.local` for local development
   - Use environment variables in production
   - Use secret management services (AWS Secrets Manager, etc.)

2. **Rotate credentials regularly**
   - Set expiration dates on secrets
   - Rotate tokens every 90 days
   - Revoke unused credentials

3. **Use least privilege principle**
   - Request only necessary scopes
   - Use read-only permissions when possible
   - Limit API access to required endpoints

4. **Monitor API usage**
   - Set up rate limit alerts
   - Monitor for unusual activity
   - Review access logs regularly

5. **Validate webhook signatures**
   - Always verify webhook signatures
   - Use secure random tokens
   - Implement replay attack protection

---

## Troubleshooting

### Common OAuth Errors

#### "redirect_uri_mismatch"
- **Cause**: Redirect URI doesn't match exactly
- **Solution**: 
  - Verify redirect URI in provider console matches exactly
  - Check for trailing slashes
  - Ensure HTTP vs HTTPS matches

#### "invalid_client"
- **Cause**: Client ID or secret is incorrect
- **Solution**:
  - Verify credentials are correct
  - Check credentials haven't been revoked
  - Ensure credentials are for correct app type

#### "access_denied"
- **Cause**: User denied permission or app not approved
- **Solution**:
  - Check OAuth consent screen is configured
  - Verify test users are added (if in testing mode)
  - Submit app for review if needed

#### "token_expired"
- **Cause**: Access token expired
- **Solution**:
  - Implement token refresh logic
  - Store refresh tokens securely
  - Handle token refresh automatically

### Common API Errors

#### "Rate limit exceeded"
- **Cause**: Too many API requests
- **Solution**:
  - Implement rate limiting
  - Use exponential backoff
  - Cache responses when possible
  - Upgrade API tier if needed

#### "Insufficient permissions"
- **Cause**: Missing required scopes
- **Solution**:
  - Verify all required scopes are requested
  - Check permissions are granted
  - Grant admin consent if needed

#### "Webhook verification failed"
- **Cause**: Webhook signature doesn't match
- **Solution**:
  - Verify webhook secret is correct
  - Check signature verification logic
  - Ensure secret matches in provider console

### Getting Help

If you encounter issues:

1. **Check Documentation**:
   - Provider API documentation
   - Aiva.io integration guides
   - Error code references

2. **Review Logs**:
   - Check application logs
   - Review provider dashboard logs
   - Check webhook delivery logs

3. **Test in Development**:
   - Use local development environment
   - Test with test accounts
   - Verify OAuth flows step by step

4. **Contact Support**:
   - Provider support (for API issues)
   - Aiva.io support (for integration issues)

---

## Additional Resources

### Provider Documentation

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [Slack API Documentation](https://api.slack.com/)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [Meta for Developers](https://developers.facebook.com/)
- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)

### Aiva.io Documentation

- [MVP Document Brief](./MVP_DOCUMENT_BRIEF.md)
- [Integration Quick Start](./INTEGRATION_QUICK_START.md)
- [Complete Backend Guide](./COMPLETE_BACKEND_GUIDE.md)
- [Architecture Overview](./docs/architecture.md)

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: Production Ready

