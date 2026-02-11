# Google verification: Calendar API + backend error

## 1. What Google’s email means (Calendar API, not login)

Google said: **“We are unable to access the OAuth consent process for Calendar API.”**

So:

- **Not** a login/OAuth problem for Gmail – they can reach your app.
- **Specifically**: they couldn’t complete or access the **Calendar API** OAuth consent flow (the screen where the user grants calendar access).

Your app has two separate OAuth flows:

- **Gmail** – Connect Gmail (inbox): `/api/auth/gmail` → `/api/auth/gmail/callback`
- **Google Calendar** – Connect Calendar: `/api/auth/google-calendar` → `/api/auth/google-calendar/callback`

They need to be able to trigger and complete the **Calendar** consent flow. So you need to:

1. Add the **Calendar callback** redirect URI in Google Cloud Console (if not already).
2. Reply to Google with **exact steps** for how to test both Gmail and Calendar OAuth consent.

---

## 2. Backend error you’re seeing (“No active subscription”)

Your logs show Gmail OAuth **succeeded** (tokens received). The failure is **after** that:

```text
No active subscription: Subscription has been canceled. Please subscribe to connect channels.
Failed to store Gmail connection
```

So:

- **What’s wrong:** The **workspace** you’re testing with has **no active entitlement** (subscription canceled or none). The app only stores a new Gmail connection if the workspace has an active subscription/entitlement.
- **Not a Google issue:** Login and OAuth are fine; the app is deliberately blocking “store connection” when there’s no active subscription.

**Fix for your testing:**

- **Option A:** Use a workspace that has an active subscription (e.g. re-subscribe, or use a workspace you already gave an entitlement to).
- **Option B:** Use the **Google reviewer** account (**junsnow.2024@gmail.com**). That account already has a workspace with a permanent **Enterprise** entitlement, so when they (or you signed in as them) connect Gmail, the “store connection” step should succeed.

If **you** are testing with your own account and your subscription is canceled, you’ll keep seeing this error until that workspace has an active entitlement again.

---

## 3. Redirect URI for Calendar (Google Cloud Console)

So reviewers can complete the **Calendar API** OAuth consent, the same OAuth client must allow the Calendar callback:

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) (project **aiva-io**).
2. Open your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**, ensure you have:
   - `https://www.tryaiva.io/api/auth/gmail/callback`
   - `https://www.tryaiva.io/api/auth/google-calendar/callback`  ← **add this if missing**
   - (Optional) `http://localhost:3000/api/auth/gmail/callback` and `http://localhost:3000/api/auth/google-calendar/callback` for local.
4. Save.

---

## 3b. "Error 401: invalid_client" / "The OAuth client was not found"

If you see **Access blocked: Authorization Error** with **The OAuth client was not found** when connecting Google Calendar:

1. **Use the same OAuth client as Gmail**  
   The app uses **GOOGLE_CLIENT_ID** (or GOOGLE_CALENDAR_CLIENT_ID if set) for Calendar. Use the same OAuth 2.0 Client ID that works for Gmail:
   - In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), open your **Web application** OAuth client.
   - Copy the **Client ID** and set it in your env as `GOOGLE_CLIENT_ID`. Do **not** set `GOOGLE_CALENDAR_CLIENT_ID` to a different or old value, or Google will not recognize it.

2. **Redirect URI**  
   That same client must list the Calendar callback as an **Authorized redirect URI**:
   - `https://www.tryaiva.io/api/auth/google-calendar/callback`
   - For local: `http://localhost:3000/api/auth/google-calendar/callback`

3. **Env**  
   In `.env.local` / Vercel, set:
   - `GOOGLE_CLIENT_ID=<your Web application client ID>`
   - `GOOGLE_CLIENT_SECRET=<that client’s secret>`
   No need for `GOOGLE_CALENDAR_*` unless you intentionally use a separate Calendar-only client (same steps: valid client, redirect URI, env).

4. **If you use a separate Calendar client**  
   Create a **Web application** OAuth client in the same project, add the redirect URIs above, then set `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET`. The 401 means the Client ID you’re sending is not a valid client in that project (typo, deleted client, or wrong project).

---

## 4. Reply to Google (draft)

You can send something like this (adjust if your app URL or test account differ):

---

**Subject:** Re: Verification – OAuth consent workflow for Calendar API (Project aiva-io, 385305030522)

Hi,

Thank you for the update. Here’s how to test the OAuth consent workflow for both **Gmail** and **Calendar API**:

**Test account (allowlisted)**  
- Email: **junsnow.2024@gmail.com**  
- Password: **12345678**  
- Or sign in with **Sign in with Google** using that same email.

**App URL**  
https://www.tryaiva.io

**How to test Gmail OAuth consent**  
1. Sign in at https://www.tryaiva.io with the test account above.  
2. Go to **Channels** (or the page where you connect email).  
3. Click **“Connect Gmail”**.  
4. Complete the Google OAuth consent screen (Gmail scopes).  
5. You should be redirected back to the app with Gmail connected.

**How to test Calendar API OAuth consent**  
1. Still signed in with the test account, go to **Calendar** (in the app navigation).  
2. Open **Manage accounts** / the dialog to add a calendar, and click **“Connect Google Calendar”**.  
3. You will be redirected to Google’s OAuth consent screen for **Calendar API** (calendar.readonly, calendar.events).  
4. Approve the requested calendar scopes.  
5. You should be redirected back to the app with Google Calendar connected.

*(The “Connect Google Calendar” button is now enabled in the Calendar UI so reviewers can complete this flow.)*

We have added the Calendar API redirect URI to our OAuth client in Google Cloud Console:  
`https://www.tryaiva.io/api/auth/google-calendar/callback`

If the Calendar consent screen does not appear or you hit any error when testing the above, please share the exact message or screenshot so we can fix it.

Best regards,  
[Your name]

---

Use this so Google can see both Gmail and Calendar OAuth consent flows and you can fix anything that’s still blocking them.
