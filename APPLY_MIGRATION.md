# Apply Aiva Calendar Migration

## Migration Created
- **File**: `supabase/migrations/20251125123904_add_aiva_calendar_provider.sql`
- **Purpose**: Add 'aiva' provider type for default/manual calendars (no external connection required)

## How to Apply

Since Supabase CLI is not installed, please follow these steps:

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/lgyewlqzelxkpawnmiog
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
-- Add 'aiva' to calendar_provider enum for default/manual calendars
ALTER TYPE calendar_provider ADD VALUE IF NOT EXISTS 'aiva';

-- Comment on the type
COMMENT ON TYPE calendar_provider IS 'Calendar provider types: google_calendar, outlook_calendar, apple_calendar, aiva (default/manual)';
```

5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify the migration succeeded

### Option 2: Install Supabase CLI

If you want to use the CLI for future migrations:

```bash
# Install Supabase CLI (macOS)
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase

# Link your project
supabase link --project-ref lgyewlqzelxkpawnmiog
# Password: 8XC7lkl75hKzCOzY

# Push migrations
supabase db push

# Regenerate types
pnpm generate:types
```

## What Changed

### Database
- Added `'aiva'` as a new calendar provider enum value
- This allows creating events without connecting external calendar accounts

### Code Changes
1. **`src/data/user/calendar.ts`**
   - Changed default calendar provider from `'gmail'` (invalid) to `'aiva'`
   - Now creates an "Aiva Calendar" automatically for manual events

2. **`src/components/calendar/ManageAccountsDialog.tsx`**
   - Added logo support for 'aiva' provider (uses Calendar icon with primary color)
   - Displays "Aiva Calendar" instead of technical email
   - Shows "Built-in" badge and prevents deletion of default calendar
   - Added support for all calendar provider types

## Result

Users can now:
- ✅ Create calendar events without connecting external accounts
- ✅ See "Aiva Calendar" as their default calendar
- ✅ Optionally connect Google Calendar, Outlook, or Apple Calendar later
- ✅ The default Aiva calendar cannot be deleted (it's built-in)

## Test

After applying the migration, try creating an event in the calendar to verify it works!

