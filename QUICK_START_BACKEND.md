# Aiva.io Backend - Quick Start Guide

## 🚀 Immediate Testing Steps

### 1. Start Development Server
```bash
cd /Users/tlenterprises/Desktop/Aiva.io
npm run dev
```

### 2. Create Test Account
1. Visit: `http://localhost:3000/sign-up`
2. Create account
3. Complete onboarding
4. Create solo workspace

### 3. Run Backend Tests
**Option A: Via Browser**
1. Login at: `http://localhost:3000/login`
2. Navigate to: `http://localhost:3000/api/test/aiva`
3. View JSON test results

**Option B: Via cURL**
```bash
# After logging in, copy your session cookie
curl http://localhost:3000/api/test/aiva \
  -H "Cookie: your_session_cookie_here"
```

### 4. Test Gmail OAuth (Optional - Requires Google OAuth Setup)
1. Navigate to: `http://localhost:3000/channels`
2. Click "Connect Channel"
3. Select "Gmail"
4. Complete OAuth (if configured)

---

## ⚙️ Configuration

### Required for Full Testing

**Add to `.env.local`**:

```bash
# Gmail Integration (optional for OAuth testing)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# AI Features (optional for AI testing)
OPENAI_API_KEY=sk-your_openai_key
```

### Without Configuration

Tests will run and skip:
- Gmail OAuth tests (will show "not configured")
- AI classification tests (will show "OPENAI_API_KEY not configured")
- AI reply generation tests (will show "OPENAI_API_KEY not configured")

**All other tests will run successfully!**

---

## 📋 What's Implemented

### ✅ Database (8 Tables)
- `channel_connections` - OAuth connections
- `messages` - Normalized messages
- `threads` - Conversation threads
- `calendar_connections` - Calendar OAuth
- `events` - Calendar events
- `tasks` - Extracted tasks
- `ai_action_logs` - AI audit trail
- `message_drafts` - Reply drafts

### ✅ APIs
- `/api/auth/gmail` - Gmail OAuth
- `/api/auth/gmail/callback` - OAuth callback
- `/api/channels/sync` - Manual message sync
- `/api/webhooks/gmail` - Gmail push notifications
- `/api/test/aiva` - Run backend tests

### ✅ Server Actions
- Channel management (create, update, disconnect)
- Message management (create, update, read, filter)
- All type-safe with Zod validation

### ✅ Gmail Integration
- OAuth 2.0 flow
- Token refresh
- Message fetching
- Message parsing
- Send capability
- Label management

### ✅ AI Engine
- Message classification (priority, category, sentiment)
- Reply draft generation (multiple tones)
- Task extraction
- Scheduling intent detection
- Confidence scoring

### ✅ Testing
- Comprehensive test suite
- Database schema tests
- Channel management tests
- Message management tests
- AI feature tests
- Test API endpoint

---

## 🧪 Expected Test Results

### With No Configuration
```json
{
  "totalTests": 10,
  "passed": 10,
  "failed": 0,
  "results": [
    {"test": "Table: channel_connections", "passed": true},
    {"test": "Table: messages", "passed": true},
    {"test": "Create Channel Connection", "passed": true},
    {"test": "Get Channel Connections", "passed": true},
    {"test": "Disconnect Channel", "passed": true},
    {"test": "Create Message", "passed": true},
    {"test": "Update Message", "passed": true},
    {"test": "Mark Message as Read", "passed": true},
    {"test": "Get Messages", "passed": true},
    {"test": "AI Configuration", "passed": false, "message": "OPENAI_API_KEY not configured"}
  ]
}
```

### With Full Configuration
All tests should pass (20+ tests)

---

## 📊 Database Status

Check Supabase Dashboard:
- URL: `https://supabase.com/dashboard/project/lgyewlqzelxkpawnmiog`
- Navigate to: Database → Tables
- Verify all 8 Aiva.io tables exist

---

## 🔍 Verify Installation

### Check Migration Status
```bash
npm exec supabase db remote commit
```

### Check Generated Types
```bash
ls -lh src/lib/database.types.ts
# Should be ~2,686 lines
```

### Check Environment
```bash
# Should show Supabase keys
cat .env.local | grep SUPABASE
```

---

## 🐛 Troubleshooting

### Tests Fail: "Unauthorized"
**Solution**: Make sure you're logged in before accessing `/api/test/aiva`

### Tests Fail: "Table not found"
**Solution**: Migration not pushed. Run:
```bash
npm exec supabase link --project-ref lgyewlqzelxkpawnmiog
npm exec supabase db push
```

### Gmail OAuth Fails
**Solution**: 
1. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
2. Verify redirect URI in Google Cloud Console matches: `http://localhost:3000/api/auth/gmail/callback`

### AI Tests Fail
**Solution**: Add `OPENAI_API_KEY` to `.env.local`

---

## 📖 Full Documentation

See `BACKEND_COMPLETION_REPORT.md` for:
- Complete feature list
- API reference
- Architecture overview
- Security details
- Configuration guide
- Next steps

---

## ✅ Quick Validation Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] User account created
- [ ] Onboarding completed
- [ ] Test API accessible (`/api/test/aiva`)
- [ ] Database tables exist (check Supabase)
- [ ] Server actions work (test via API)
- [ ] Types generated (`database.types.ts` exists)

**If all checked - backend is working! ✅**

---

## 🎯 Next: Build Frontend UI

Backend is complete. Now build:
1. Unified inbox interface
2. Message detail view
3. Channel management UI
4. Draft reply interface
5. Settings and preferences

**All backend APIs are ready to be consumed by the frontend!** 🚀

