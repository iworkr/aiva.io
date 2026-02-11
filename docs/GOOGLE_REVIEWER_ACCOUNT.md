# Google verification reviewer account (junsnow.2024@gmail.com)

## Script: Make any user an Enterprise user

To give another email the same setup (solo workspace + Enterprise entitlement), use:

```bash
node scripts/setup-enterprise-user.mjs <email> [password]
```

Example for **aivaioapp@gmail.com** (with optional password `12345678`):

```bash
node scripts/setup-enterprise-user.mjs aivaioapp@gmail.com 12345678
```

**If Gmail still says "Subscription has been canceled"** – the app may be using a different workspace (e.g. your original one) that has a canceled or no entitlement. Grant Enterprise to that workspace:

```bash
# By workspace ID (from the error/logs, e.g. state.workspaceId)
node scripts/add-enterprise-to-workspace.mjs e396f6f5-506d-49bc-8cf2-c058c864e96e

# Or by email (uses that user's default workspace)
node scripts/add-enterprise-to-workspace.mjs aivaioapp@gmail.com
```

The user must already exist in auth (e.g. they signed up via Sign in with Google or email). The script will:

- Create a solo workspace and add them as owner
- Set their default workspace
- Create a permanent Enterprise entitlement for that workspace
- Optionally set their password so they can log in with email + password

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## What was done (for junsnow.2024@gmail.com)

1. **Database (via Supabase MCP)**
   - The account **junsnow.2024@gmail.com** already existed in `auth.users` and had a profile.
   - Created a dedicated **workspace** and added this user as **owner**.
   - Set their **default workspace** so they land in the app correctly.
   - Created a **permanent Enterprise entitlement** for that workspace (same as your other test accounts: full access, no expiry).

2. **Login options** (both use the same account)
   - **SSO (Google):** They can use **Sign in with Google** with **junsnow.2024@gmail.com** (same account; they own that email).
   - **Email + password:** Set their password to **12345678** (8 chars, per our requirements) so they can also log in with email + password.

## Set password to 12345678 (one-time)

Password cannot be set via the database; it must be set via Supabase Auth.

**Option A – Run the script (recommended)**  
From the project root, with `.env.local` containing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`:

```bash
node scripts/set-google-reviewer-password.mjs
```

**Option B – Supabase Dashboard**  
1. Supabase Dashboard → **Authentication** → **Users**  
2. Find **junsnow.2024@gmail.com**  
3. Open the user → use **Send password recovery** and have them set a password, or if your Dashboard has “Set password”, set it to **12345678** there.

## What to tell the reviewer

- **App URL:** https://www.tryaiva.io (or your production URL)
- **Login:** They can use **Sign in with Google** with **junsnow.2024@gmail.com**, or **Email + password** with:
  - Email: **junsnow.2024@gmail.com**
  - Password: **12345678**
- They have **Enterprise** access (full features) in a dedicated workspace and can test everything.

## Reply to Google

Use the reply email in the next section when replying to Google’s verification team.
