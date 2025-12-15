# Auto-Reply System - Post-Development Completion Briefing

**Date**: December 6, 2025  
**Status**: ✅ Core Implementation Complete  
**Next Phase**: Testing, Refinement, and Production Deployment

---

## Executive Summary

The Auto-Reply system has been fully implemented and integrated into Aiva.io. This system automatically queues and sends AI-generated email replies based on user-defined settings, confidence thresholds, and time windows. The implementation includes database migrations, server actions, queue management, email sending functions, cron job processing, and UI integration.

**Key Achievement**: Complete end-to-end auto-reply pipeline from draft generation to scheduled sending.

---

## What Was Implemented

### 1. Database Schema ✅

**Migration File**: `supabase/migrations/20251206033326_add_auto_send_system.sql`

**Tables Created**:
- `auto_send_queue` - Stores scheduled auto-send items with status tracking
- `auto_send_log` - Audit trail of all auto-send actions

**Settings Added to `workspace_settings`**:
- `auto_send_enabled` (boolean) - Master toggle
- `auto_send_delay_type` ('exact' | 'random') - Delay mode
- `auto_send_delay_min/max` (integer) - Delay timing in minutes
- `auto_send_confidence_threshold` (decimal) - Minimum AI confidence (0.70-0.95)
- `auto_send_time_start/end` (time) - Allowed sending window
- `auto_send_paused` (boolean) - Emergency kill switch
- `auto_send_paused_at` (timestamptz) - When paused

**Status**: ✅ Migrated and deployed to Supabase

---

### 2. Server Actions ✅

**File**: `src/data/user/settings.ts`

**Actions Implemented**:
- `updateAutoSendSettingsAction` - Save/update auto-send preferences
- `pauseAutoSendAction` - Emergency pause (kill switch)
- `resumeAutoSendAction` - Resume auto-send after pause
- `getAutoSendQueueAction` - Fetch pending auto-sends for UI
- `cancelScheduledSendAction` - Cancel a pending auto-send

**Status**: ✅ Implemented and integrated with SettingsView

---

### 3. Auto-Send Queue Worker ✅

**File**: `src/lib/workers/auto-send-worker.ts`

**Key Functions**:
- `queueAutoSend()` - Main queueing function with scheduling logic
- `getWorkspaceAutoSendSettings()` - Fetch workspace settings
- `getPendingAutoSends()` - Get items ready to send
- `updateQueueItemStatus()` - Update queue status
- `isMessageAutoSendable()` - Eligibility checker

**Features**:
- Calculates scheduled send time based on delay settings
- Adjusts to sending window constraints
- Handles timezone considerations
- Validates confidence thresholds

**Status**: ✅ Fully implemented

---

### 4. Email Sending Functions ✅

**File**: `src/lib/email/send.ts`

**Functions**:
- `sendGmailReply()` - Gmail API integration with MIME encoding
- `sendOutlookReply()` - Microsoft Graph API integration
- `sendReply()` - Universal router that selects provider
- `buildMimeMessage()` - MIME message construction
- `stripHtml()` - Plain text fallback generation

**Features**:
- Automatic OAuth token refresh for Gmail
- Threading support (In-Reply-To, References headers)
- Multipart MIME (HTML + plain text)
- Error handling and retry logic

**Status**: ✅ Implemented (needs testing with real OAuth tokens)

---

### 5. Cron Job Processor ✅

**File**: `src/app/api/cron/auto-send/route.ts`

**Configuration**: Added to `vercel.json` with schedule `"* * * * *"` (every minute)

**Functionality**:
- Processes up to 20 pending items per run
- Validates workspace settings (enabled, not paused)
- Checks time window constraints
- Sends emails via appropriate provider
- Updates queue status and logs results
- Handles retries (max 3 attempts)

**Security**: Protected with `CRON_SECRET` environment variable

**Status**: ✅ Implemented (needs Vercel cron configuration)

---

### 6. UI Integration ✅

**File**: `src/components/settings/SettingsView.tsx`

**Features Added**:
- Auto-Reply settings card in "AI Features" tab
- Toggle switch for enable/disable (Pro feature gated)
- Select for delay type (Exact vs Random)
- Number inputs for delay min/max
- Slider for confidence threshold (0.70-0.95)
- Time pickers for sending window
- Kill switch button for emergency pause
- Pending queue display (via `getAutoSendQueueAction`)
- Auto-send logs display

**Status**: ✅ UI implemented and wired to server actions

---

### 7. Draft Generation Integration ✅

**File**: `src/lib/ai/reply-generator.ts`

**Modification**: Added auto-send queueing after draft creation

**Logic**:
- After draft is saved, checks if `isAutoSendable: true` and `confidenceScore >= 0.85`
- If eligible, calls `queueAutoSend()` to schedule the send
- Non-blocking (errors don't fail draft generation)

**Status**: ✅ Integrated

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Settings UI                         │
│  (SettingsView.tsx)                                        │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Server Actions                                  │
│  (src/data/user/settings.ts)                                │
│  - updateAutoSendSettingsAction                             │
│  - pauseAutoSendAction                                       │
│  - getAutoSendQueueAction                                    │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         AI Draft Generation                                  │
│  (src/lib/ai/reply-generator.ts)                           │
│  - generateReplyDraft()                                     │
│  └─> queueAutoSend() (if eligible)                          │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Auto-Send Queue Worker                               │
│  (src/lib/workers/auto-send-worker.ts)                      │
│  - Calculates scheduled send time                           │
│  - Validates settings and thresholds                        │
│  - Inserts into auto_send_queue                             │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Cron Job (Every Minute)                              │
│  (src/app/api/cron/auto-send/route.ts)                     │
│  - Fetches pending items                                     │
│  - Validates workspace settings                              │
│  - Checks time windows                                       │
│  - Calls sendReply()                                        │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Email Sending                                        │
│  (src/lib/email/send.ts)                                    │
│  - sendGmailReply() / sendOutlookReply()                     │
│  - Updates queue status                                      │
│  - Logs to auto_send_log                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `supabase/migrations/20251206033326_add_auto_send_system.sql` | Database schema | ✅ Deployed |
| `src/data/user/settings.ts` | Server actions for settings | ✅ Complete |
| `src/lib/workers/auto-send-worker.ts` | Queue management logic | ✅ Complete |
| `src/lib/email/send.ts` | Email sending functions | ✅ Complete |
| `src/app/api/cron/auto-send/route.ts` | Cron job processor | ✅ Complete |
| `src/components/settings/SettingsView.tsx` | UI for settings | ✅ Complete |
| `src/lib/ai/reply-generator.ts` | Draft generation + queueing | ✅ Integrated |
| `vercel.json` | Cron schedule configuration | ✅ Updated |

---

## How It Works

### Flow Diagram

1. **User Configures Settings**:
   - Opens Settings → AI Features → Auto-Reply
   - Enables auto-send, sets delay, confidence threshold, time window
   - Settings saved to `workspace_settings` table

2. **AI Generates Draft**:
   - User opens message, AI generates reply draft
   - Draft saved with `is_auto_sendable` and `confidence_score`
   - If eligible (`isAutoSendable: true` AND `confidence >= threshold`):
     - `queueAutoSend()` calculates scheduled send time
     - Item inserted into `auto_send_queue` with `status: 'pending'`

3. **Cron Job Processes Queue**:
   - Runs every minute via Vercel Cron
   - Fetches pending items where `scheduled_send_at <= now()`
   - For each item:
     - Validates workspace settings (enabled, not paused)
     - Checks time window (current time within allowed hours)
     - Fetches draft content and message details
     - Calls `sendReply()` with appropriate provider
     - Updates queue status (`sent`, `failed`, or retry)
     - Logs action to `auto_send_log`

4. **Email Sent**:
   - Provider API (Gmail/Outlook) sends the reply
   - Queue item marked as `sent` with timestamp
   - Draft status updated to `sent`
   - Audit log entry created

---

## Safety Features Implemented

1. ✅ **Confidence Threshold** - Only auto-send above user-defined threshold (default 0.85)
2. ✅ **Time Window** - No auto-sending outside business hours (default 09:00-21:00)
3. ✅ **Kill Switch** - Instant pause of all auto-sends via `pauseAutoSendAction`
4. ✅ **Audit Log** - Every action logged to `auto_send_log` table
5. ✅ **Queue Visibility** - Users can view pending sends in Settings UI
6. ✅ **Max Attempts** - Failed sends retry up to 3 times then stop
7. ✅ **Pro-Only** - Feature gated to Pro/Enterprise plans (via `getHasFeature`)

---

## Testing Checklist

### ✅ Completed
- [x] Database migration deployed
- [x] TypeScript types regenerated
- [x] No linter errors
- [x] Server actions created
- [x] UI components integrated
- [x] Cron job route created
- [x] Vercel.json updated

### ⚠️ Needs Testing
- [ ] End-to-end flow: Draft generation → Queue → Send
- [ ] Gmail OAuth token refresh
- [ ] Outlook OAuth token refresh
- [ ] Time window enforcement
- [ ] Kill switch functionality
- [ ] Queue cancellation
- [ ] Retry logic (failed sends)
- [ ] Multiple workspace isolation
- [ ] Pro plan feature gating
- [ ] Settings persistence
- [ ] Cron job execution (Vercel)
- [ ] Error handling and logging

---

## Known Issues & Limitations

### 1. OAuth Token Refresh
**Status**: Implemented but untested  
**Location**: `src/lib/email/send.ts` - `getConnectionCredentials()`  
**Action Required**: Test with real Gmail/Outlook connections to verify token refresh works

### 2. Timezone Handling
**Status**: Basic implementation  
**Location**: `src/lib/workers/auto-send-worker.ts` - `adjustToSendingWindow()`  
**Note**: Currently uses workspace timezone from settings, falls back to UTC. May need refinement for edge cases (DST, etc.)

### 3. Cron Job Authorization
**Status**: Implemented  
**Location**: `src/app/api/cron/auto-send/route.ts`  
**Note**: Requires `CRON_SECRET` environment variable in Vercel. Ensure this is set before deployment.

### 4. Queue Processing Limits
**Status**: Set to 20 items per run  
**Location**: `src/app/api/cron/auto-send/route.ts`  
**Note**: May need adjustment based on actual usage patterns. Monitor queue size.

### 5. Error Recovery
**Status**: Basic retry logic (3 attempts)  
**Note**: Failed items remain in queue with `status: 'failed'`. Consider adding manual retry or cleanup job.

---

## Environment Variables Required

Add to Vercel environment variables:

```bash
CRON_SECRET=<generate-secure-random-string>
```

This is used to protect the cron endpoint from unauthorized access.

---

## Next Steps for Future Development

### Phase 1: Testing & Validation (Priority: High)
1. **End-to-End Testing**:
   - Create test workspace with Pro plan
   - Configure auto-send settings
   - Generate draft with high confidence
   - Verify queueing and sending
   - Test kill switch
   - Test time window enforcement

2. **Provider Testing**:
   - Test Gmail reply sending with real account
   - Test Outlook reply sending with real account
   - Verify OAuth token refresh
   - Test threading (In-Reply-To headers)

3. **Edge Cases**:
   - Test with multiple workspaces
   - Test concurrent sends
   - Test queue overflow scenarios
   - Test timezone edge cases

### Phase 2: UI Enhancements (Priority: Medium)
1. **Queue Management UI**:
   - Add "View Queue" section in Settings
   - Show pending sends with scheduled times
   - Add cancel button for each item
   - Show send history/logs

2. **Notifications**:
   - Toast notification when draft is queued
   - Notification when auto-send succeeds/fails
   - Email notification for critical failures

3. **Analytics Dashboard**:
   - Show auto-send statistics (sent count, success rate)
   - Confidence score distribution
   - Time-to-send metrics

### Phase 3: Advanced Features (Priority: Low)
1. **Smart Scheduling**:
   - Learn optimal send times per contact
   - Avoid sending during recipient's off-hours
   - Batch sends for efficiency

2. **A/B Testing**:
   - Test different delay strategies
   - Measure response rates
   - Optimize confidence thresholds

3. **Template System**:
   - Pre-defined reply templates
   - Customizable auto-send rules per category
   - Conditional auto-send based on message type

---

## Database Schema Reference

### `auto_send_queue` Table
```sql
- id (UUID, PK)
- workspace_id (UUID, FK → workspaces)
- message_id (UUID, FK → messages)
- draft_id (UUID, FK → message_drafts)
- connection_id (UUID, FK → channel_connections)
- scheduled_send_at (TIMESTAMPTZ)
- status ('pending' | 'processing' | 'sent' | 'failed' | 'cancelled')
- attempts (INTEGER, default 0)
- max_attempts (INTEGER, default 3)
- confidence_score (DECIMAL(3,2))
- delay_minutes (INTEGER)
- sent_at (TIMESTAMPTZ)
- sent_message_id (TEXT)
- error_message (TEXT)
- created_at, updated_at (TIMESTAMPTZ)
```

### `auto_send_log` Table
```sql
- id (UUID, PK)
- workspace_id (UUID, FK → workspaces)
- message_id (UUID, FK → messages, nullable)
- draft_id (UUID, FK → message_drafts, nullable)
- queue_id (UUID, FK → auto_send_queue, nullable)
- action ('queued' | 'sent' | 'cancelled' | 'failed' | 'paused' | 'skipped')
- confidence_score (DECIMAL(3,2))
- delay_used (INTEGER)
- error_message (TEXT)
- skip_reason (TEXT)
- details (JSONB)
- created_at (TIMESTAMPTZ)
```

---

## Code Patterns & Conventions

### Queue Status Flow
```
pending → processing → sent (success)
       ↘              ↘ failed (retry up to 3x)
       ↘ cancelled (user action)
```

### Error Handling
- Queue operations: Errors logged but don't fail draft generation
- Send operations: Errors logged, queue item marked as `failed`, retry scheduled
- Cron job: Errors logged per item, processing continues for other items

### Settings Validation
- Confidence threshold: 0.70 - 0.95 (enforced in UI slider)
- Delay min/max: Positive integers, min ≤ max
- Time window: Valid time format (HH:MM), start < end (or overnight)

---

## Monitoring & Debugging

### Key Metrics to Monitor
1. **Queue Size**: Number of pending items
2. **Success Rate**: `sent` vs `failed` ratio
3. **Average Delay**: Time from queue to send
4. **Retry Rate**: Items requiring multiple attempts
5. **Time Window Skips**: Items rescheduled due to time constraints

### Debug Queries

```sql
-- View pending queue
SELECT * FROM auto_send_queue 
WHERE status = 'pending' 
ORDER BY scheduled_send_at;

-- View recent logs
SELECT * FROM auto_send_log 
WHERE workspace_id = '<workspace-id>'
ORDER BY created_at DESC 
LIMIT 50;

-- Check failed items
SELECT * FROM auto_send_queue 
WHERE status = 'failed' 
AND attempts >= 3;
```

### Log Locations
- Server actions: Console logs with `[Auto-Send]` prefix
- Cron job: Console logs with processing results
- Email sending: Console logs with provider-specific errors

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `CRON_SECRET` environment variable in Vercel
- [ ] Verify Vercel cron is configured (check Vercel dashboard)
- [ ] Test with staging workspace
- [ ] Verify OAuth tokens refresh correctly
- [ ] Test kill switch functionality
- [ ] Monitor first few auto-sends closely
- [ ] Set up error alerting (if available)
- [ ] Document user-facing features

---

## Support & Troubleshooting

### Common Issues

**Issue**: Auto-sends not queuing
- Check: Workspace has Pro/Enterprise plan
- Check: `auto_send_enabled = true` in workspace_settings
- Check: Draft has `is_auto_sendable = true` and confidence ≥ threshold

**Issue**: Queue items not sending
- Check: Cron job is running (Vercel logs)
- Check: `CRON_SECRET` is set correctly
- Check: Time window allows sending
- Check: `auto_send_paused = false`

**Issue**: Sends failing
- Check: OAuth tokens are valid (may need refresh)
- Check: Connection credentials in `channel_connections`
- Check: Provider API rate limits
- Check: `auto_send_log` for error messages

---

## Contact & Resources

**Related Documentation**:
- Main project rules: `.cursor/rules/` directory
- Database migrations: `supabase/migrations/`
- Server action patterns: `src/data/user/`

**Key Dependencies**:
- `next-safe-action` - Server action framework
- `@supabase/supabase-js` - Database client
- `openai` - AI draft generation
- Gmail API / Microsoft Graph API - Email sending

---

## Conclusion

The Auto-Reply system is **functionally complete** and ready for testing. All core components have been implemented, integrated, and deployed to the database. The next phase should focus on comprehensive testing, especially:

1. End-to-end flow validation
2. Provider API integration (Gmail/Outlook)
3. Error handling and edge cases
4. User experience refinement

The system is designed with safety in mind, featuring multiple safeguards (confidence thresholds, time windows, kill switch) and comprehensive logging for audit and debugging.

**Status**: ✅ Ready for Testing Phase

---

*Last Updated: December 6, 2025*  
*Implementation by: AI Assistant (Auto)*  
*Next Review: After initial testing phase*

