# Outlook (Azure) – Branding & publisher verification

So when people link their Outlook account, the consent screen shows your logo, name, and (optionally) a verified publisher badge.

---

## 1. Where to go in Azure

**Direct link:** [App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)  
→ click your **Aiva.io** app  
→ left sidebar: **Branding & properties** (under “Manage”).

---

## 2. Branding (logo, name, URLs)

Fill in these so the consent screen looks official:

| Field | What to use |
|-------|---------------------|
| **Name** | `Aiva.io` (display name users see) |
| **Publisher domain** | `tryaiva.io` (optional; must be verified in your tenant) |
| **Logo** | See requirements below |
| **Home page URL** | `https://www.tryaiva.io` |
| **Terms of service URL** | e.g. `https://www.tryaiva.io/terms` |
| **Privacy statement URL** | e.g. `https://www.tryaiva.io/privacy` |

**Logo (for consent screen):**

- **Size:** 215×215 pixels  
- **Format:** PNG  
- **Max file size:** 100 KB  
- **Background:** Solid color (no transparency – Microsoft may show it on light or dark background)

**Your assets:** You have logos in `public/logos/` (e.g. `aiva-mark.png`, `logo.png`). If they’re not 215×215, resize or export one to **215×215 PNG**, solid background, under 100 KB, then upload in **Branding & properties** → **Logo**.

Click **Save**.

---

## 3. Publisher verification (verified badge)

This adds the blue **“Verified publisher”** badge next to your app name on the consent screen.

**You need:**

- Your organization in the **Microsoft Cloud Partner Program** (formerly MPN).  
- Your **Partner ID** (MPN ID) from Partner Center.

**Steps:**

1. **Get your Partner ID**
   - Go to [partner.microsoft.com](https://partner.microsoft.com) and sign in.
   - If you’re not a partner yet: **Join** the Microsoft Cloud Partner Program (free tier available).
   - In **Partner Center** → **Account settings** (or your organization profile), find your **Partner ID** (also called MPN ID). Copy it (numeric).

2. **Link it to your Azure app**
   - Azure → **App registrations** → your **Aiva.io** app.
   - **Branding & properties** (left sidebar).
   - Find **“Publisher verification”** or **“Add Partner ID to verify publisher”**.
   - Enter your **Partner ID** → **Verify and save**.

Verification can take a short time. After that, the consent screen will show the verified badge.

**If you’re not a partner yet:** You can still do all the **branding** (logo, name, URLs) above. Publisher verification is optional; add the MPN ID later when you’re in the partner program.
