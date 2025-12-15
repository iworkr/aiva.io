# Database Setup Required

## ⚠️ Current Issue

The application is trying to access database tables that don't exist yet. You need to push the migrations to Supabase.

## Quick Fix

Run these commands in your terminal:

```bash
# 1. Link Supabase project (you may need to login first)
pnpm exec supabase login
pnpm exec supabase link --project-ref lgyewlqzelxkpawnmiog

# When prompted for database password, use: 8XC7lkl75hKzCOzY

# 2. Push all migrations to Supabase
pnpm exec supabase db push

# 3. Generate TypeScript types
pnpm generate:types
```

## Detailed Steps

### Step 1: Authenticate with Supabase

If you haven't authenticated yet:

```bash
pnpm exec supabase login
```

This will open a browser window for authentication.

### Step 2: Link Your Project

```bash
pnpm exec supabase link --project-ref lgyewlqzelxkpawnmiog
```

When prompted:
- **Database password**: `8XC7lkl75hKzCOzY`
- **Project reference**: `lgyewlqzelxkpawnmiog` (should auto-fill)

### Step 3: Push Migrations

This will create all the necessary tables in your Supabase database:

```bash
pnpm exec supabase db push
```

### Step 4: Generate Types

After migrations are pushed, generate TypeScript types:

```bash
pnpm generate:types
```

### Step 5: Restart Dev Server

After completing the above steps, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
pnpm dev
```

## Verify Setup

After pushing migrations, you can verify in the Supabase dashboard:
1. Go to: https://supabase.com/dashboard/project/lgyewlqzelxkpawnmiog
2. Navigate to: Database → Tables
3. You should see tables like:
   - `workspace_members`
   - `workspaces`
   - `user_profiles`
   - `projects`
   - etc.

## Troubleshooting

### "Project is already linked"
If you see this message, you can skip the link step and just run:
```bash
pnpm exec supabase db push
```

### "Authentication required"
Make sure you're logged in:
```bash
pnpm exec supabase login
```

### "Migration conflicts"
If you see migration conflicts, you may need to reset (⚠️ **WARNING**: This will delete all data):
```bash
pnpm exec supabase db reset
```

## After Setup

Once migrations are pushed:
- ✅ All database tables will exist
- ✅ Authentication will work
- ✅ Onboarding flow will work
- ✅ Workspace creation will work
- ✅ All features will be functional

---

**Note**: The landing page works without database setup, but all authenticated features require the database to be set up.

