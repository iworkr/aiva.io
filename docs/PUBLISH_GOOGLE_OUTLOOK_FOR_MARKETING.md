# Publishing Google & Outlook So Any User Can Connect (Marketing-Ready)

**Your brother is right.** Right now the app almost certainly works only for **your own emails / test users**. To let **any customer** connect their Gmail or Outlook and start marketing, you need to complete the steps below.

---

## Why it only works for “our email” today

| Provider | Current behavior | Why |
|----------|------------------|-----|
| **Google (Gmail)** | Only works for emails you added as “test users” (up to 100). Others see “unverified app” and/or auth expires in 7 days. | OAuth app is in **Testing** mode. Gmail scopes are “sensitive/restricted” so Google limits access until the app is verified and published. |
| **Outlook** | May not work at all for others if Azure app isn’t set up or redirect URIs are wrong. | Per your config, Outlook often still needs **credentials + redirect URIs**; without that, only your environment works. |

So: **“Publishing” = making the OAuth apps usable by any user, not just your team/test accounts.**

---

## Gmail scopes: already in place (Option B)

**Yes — the scopes are already defined in code.** We use **Option B (Gmail API granular scopes)**, not the broad `https://mail.google.com/` scope.

**Where they're set:** `src/app/api/auth/gmail/route.ts`

**Scopes we request:**

| Scope | Purpose |
|-------|--------|
| `https://www.googleapis.com/auth/gmail.readonly` | Read mail (list, get messages) |
| `https://www.googleapis.com/auth/gmail.send` | Send and reply |
| `https://www.googleapis.com/auth/gmail.modify` | Labels, archive, mark read/unread, move |
| `https://www.googleapis.com/auth/userinfo.email` | User's email (e.g. connection identity) |
| `https://www.googleapis.com/auth/userinfo.profile` | User's profile (name, etc.) |

We do **not** use `https://mail.google.com/` (the "full mailbox" restricted scope). Everything we need (read, send, modify labels/read state) is covered by the granular Gmail API scopes above. You still need **verification** for these scopes, but this setup is the one that's usually easier to justify than `mail.google.com`.

**When configuring the OAuth consent screen in Google Cloud Console**, add these same scopes (the consent screen must list every scope your app requests).

---

## What you must do (explicit checklist)

### 1. Google (Gmail) – allow any Gmail user

**Where:** [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services**.

1. **OAuth consent screen**
   - **APIs & Services** → **OAuth consent screen**.
   - **User type:** **External** (so any Google user can sign in).
   - Fill: App name, support email, developer contact, **Privacy Policy URL**, **Terms of Service URL** (required for verification).
   - **Scopes:** Add the same Gmail scopes your app uses (e.g. `gmail.readonly`, `gmail.send`, `gmail.modify`, `userinfo.email`, `userinfo.profile`).
   - **Test users (optional for now):** You can keep adding test users only while in Testing; they’re ignored once you go to Production.

2. **Redirect URIs (critical)**
   - **Credentials** → your **OAuth 2.0 Client ID** (Web application).
   - **Authorized redirect URIs** must include **exactly**:
     - Production: `https://www.tryaiva.io/api/auth/gmail/callback`
     - Local: `http://localhost:3000/api/auth/gmail/callback`
   - **Authorized JavaScript origins:** `https://www.tryaiva.io` and `http://localhost:3000` (if you use client-side OAuth).

3. **Publish the app (so it’s not “Testing” only)**
   - On the **OAuth consent screen** page, find **Publishing status**.
   - Click **“PUBLISH APP”** (or “Prepare for verification” then publish).
   - **Before you can set status to “In production”:**
     - You must have **Privacy Policy** and **Terms of Service** URLs set on the consent screen.
     - For **sensitive/restricted** Gmail scopes, you must **submit for verification** (see below).

4. **App verification (required for any Gmail user)**
   - Gmail scopes are **sensitive/restricted**. Until Google approves your app, only test users can use it (and in Testing, tokens expire in 7 days).
   - In the OAuth consent screen, use **“Submit for verification”** (or the link in the dashboard).
   - You’ll need:
     - Privacy Policy URL (live, public).
     - Terms of Service URL (live, public).
     - App homepage (e.g. `https://www.tryaiva.io`).
     - Demo video or screencast showing how you request and use Gmail data (read/send).
     - Possibly a written explanation of use case and data handling.
   - Verification can take **days to a few weeks**. Until then, you can still **add up to 100 test users** so early customers or beta users can connect.

**Summary – Google:**  
Redirect URIs + Consent screen (External, Privacy Policy, Terms, scopes) → Publish app → Submit for verification for Gmail scopes. After verification, any Gmail user can connect.

---

### 2. Outlook (Microsoft) – allow any Outlook/personal Microsoft user

**Where:** [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** (or **Azure Active Directory**) → **App registrations**.

1. **Create or use one app**
   - **New registration** (or use existing).
   - **Name:** e.g. `Aiva.io`.
   - **Supported account types:**  
     **“Accounts in any organizational directory and personal Microsoft accounts”** (so both work/school and personal Outlook).
   - **Redirect URI:** Web → `https://www.tryaiva.io/api/auth/outlook/callback` (and `http://localhost:3000/api/auth/outlook/callback` for local).

2. **API permissions**
   - **API permissions** → Add **Microsoft Graph** → **Delegated**:
     - `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`
     - `User.Read`
     - `Calendars.ReadWrite` (if you use calendar).
     - `offline_access` (refresh tokens).
   - For **personal accounts**, user consent is usually enough. For **orgs**, some tenants require admin consent.

3. **Client secret**
   - **Certificates & secrets** → **New client secret** → set expiry (e.g. 24 months) → copy the **Value** once (it’s shown only once).

4. **Environment variables**
   - In production (e.g. Vercel) and in `.env.local`:
     - `MICROSOFT_CLIENT_ID` = Application (client) ID.
     - `MICROSOFT_CLIENT_SECRET` = the secret value.
     - Optional: `AZURE_TENANT_ID=common` (for multi-tenant + personal accounts).

5. **Optional: publisher verification**
   - For higher trust (e.g. fewer “unverified” warnings in some orgs), complete **Publisher verification** in the app registration (verified domain, etc.). Not always required for basic “any user” access.

**Summary – Outlook:**  
App registration + redirect URIs + Graph permissions + client secret + env vars. No “publish” button like Google; once the app is registered and your site uses the right redirect URI and env vars, any user whose tenant allows consent can connect.

---

## Quick reference: what “publish” means

| | Google (Gmail) | Microsoft (Outlook) |
|---|----------------|---------------------|
| **“Publish”** | Set OAuth consent screen to **In production** (after verification for Gmail scopes). | No “Publish” button; app is live once registered and your app uses it. |
| **Allow any user** | Verification + **In production** + External user type. | Supported account type = “personal + any org” + correct redirect URI and permissions. |
| **Must-have** | Privacy Policy + Terms URLs, redirect URIs, submit app for verification for Gmail. | Redirect URIs, Graph permissions, client secret, env vars. |

---

## Order of operations (so you can start marketing)

1. **Google**
   - [ ] Add production redirect URI and (if needed) JS origins.
   - [ ] Add Privacy Policy and Terms URLs to OAuth consent screen.
   - [ ] Submit for **verification** (so you can go to “In production” and allow any Gmail user).
   - [ ] Until verified: add up to 100 **test users** (early customers/beta) so they can connect Gmail.

2. **Outlook**
   - [ ] Create/configure Azure app, redirect URIs, permissions, client secret.
   - [ ] Set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` in production and local.
   - [ ] Test with a personal Outlook and (if possible) one work account.

3. **Production**
   - [ ] Ensure production env has: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `NEXT_PUBLIC_SITE_URL=https://www.tryaiva.io`.
   - [ ] No redirect URI using localhost in production; only `https://www.tryaiva.io/...` for live traffic.

After that, you’re in a position to **start marketing**: any user can connect Gmail (after Google verification) and Outlook (once Azure and env are set). If you want, next step can be a one-page “Pre-launch checklist” that only lists the 5–10 concrete URLs and console steps for your project.
