# Aiva.io - User Flows & Experience Design

## Overview

This document outlines the complete user journey for Aiva.io, from initial discovery through daily usage. All flows are designed to leverage **Nextbase Ultimate** patterns: workspace-based organization, server-first architecture, and secure multi-tenant isolation.

## 0. Pre-App: Marketing & Entry Points

### 1. User Discovery
- User discovers Aiva through website, ad, referral, app store, Chrome extension
- Clear promise: "One AI assistant for all your messages and calendar – across Gmail, Slack, WhatsApp, LinkedIn & more"
- Built on Nextbase Ultimate messaging: "Secure, scalable, production-ready"

### 2. Landing Page CTAs
- "Get Started Free" → Sign up flow
- "Watch Demo" → Product demo
- "Book a Setup Call" (for teams) → Team onboarding

### 3. Sign-Up Triggers
- Click "Get Started" → taken to Sign Up screen (Nextbase auth pages)

## 1. Account Creation & Workspace Setup

### 1.1 Sign Up Screen
**Location**: `src/app/[locale]/(dynamic-pages)/(login-pages)/sign-up/`

**Options**:
- Sign up with Google (OAuth via Supabase)
- Sign up with Microsoft (OAuth via Supabase)
- Sign up with Email + Password (Supabase Auth)
- Choose region (if needed) and accept T&Cs + Privacy Policy

**Implementation**: Uses Nextbase authentication patterns with `signUpWithPasswordAction` or `signInWithProviderAction`

### 1.2 Create Workspace
**Location**: `src/app/[locale]/(dynamic-pages)/(authenticated-pages)/onboarding/`

**For Solo Users**:
- Default workspace created named "Aiva – [First Name]"
- Uses `createWorkspaceAction` with `workspaceType: "solo"`
- Automatically set as default workspace

**For Teams**:
- User specifies:
  - Workspace name (e.g., "MyTechM8", "ClearTrust Finance")
  - Role: Owner / Admin
  - Invite teammates now? (Yes / Skip for later)
- Uses `createWorkspaceAction` with `workspaceType: "team"`

### 1.3 Basic Profile Setup
**Server Component**: `src/app/[locale]/.../onboarding/ProfileUpdate.tsx`

- Name, profile picture (Supabase Storage)
- Timezone (auto-detect, can confirm/override)
- Working hours (e.g., Mon–Fri, 8am–5pm)
- Preferred language & tone:
  - Tone slider (Formal ↔ Friendly)
  - Short defaults: "Hey," vs "Hi [Name]," vs "Good morning [Name],"

**Data Storage**: `user_profiles` and `user_settings` tables (workspace-scoped)

### 1.4 Initial Goal Selection
**Client Component**: `src/components/onboarding/GoalSelection.tsx`

"What do you want Aiva to help with most?"
- ✅ Clearing inbox faster
- ✅ Managing my meetings & schedule
- ✅ Handling social DMs & leads
- ✅ All of the above

Used to tailor onboarding defaults and workspace settings.

## 2. Connecting Channels & Calendars (Onboarding Wizard)

### 2.1 Channel Connections
**Location**: `src/app/[locale]/.../onboarding/SetupChannels.tsx`

**Step-by-Step Wizard**:

#### Step 1: Connect Email
- "Connect your main inbox"
- Buttons:
  - "Connect Gmail" → OAuth flow (Supabase Auth)
  - "Connect Outlook / Office 365" → OAuth flow
- OAuth popup → user authorizes Aiva:
  - Read messages, metadata
  - Send/reply messages
- On success:
  - Success screen: "Gmail connected ✅"
  - Option: "Import last 30 days of emails" (default) or 90 days, or only new going forward

**Data Storage**: `channel_connections` table with encrypted tokens, workspace-scoped

#### Step 2: Connect Messaging / Collab Channels
- "Connect your messaging apps"
- Services shown with toggles:
  - Slack
  - Microsoft Teams
  - WhatsApp Business
  - Instagram DMs
  - Facebook Messenger
  - LinkedIn Messaging
- For each: "Connect" → OAuth / configuration → permissions summary
- "Skip for now" visible under each section

#### Step 3: Channel Sync Confirmation
- Status screen listing:
  - Connected: Gmail, Slack, WhatsApp
  - Not connected: Teams, LinkedIn, IG, FB
- Background tasks start:
  - First-time sync (e.g., last 30 days messages)
  - Progress indicator: "Syncing in background – you can continue"

**Implementation**: Uses Supabase Edge Functions for background sync jobs

### 2.2 Calendar Connections
**Location**: `src/app/[locale]/.../onboarding/SetupCalendar.tsx`

#### Step 4: Connect Calendar
- "Let Aiva manage your schedule"
- Options:
  - Connect Google Calendar
  - Connect Outlook Calendar / Microsoft 365
  - Connect via CalDAV / Apple (Phase 2)
- OAuth → user grants calendar read/write

#### Step 5: Calendar Preferences
- Confirm timezone & working hours (pre-filled from profile)
- Toggle:
  - ✅ Suggest meeting times only
  - ✅ Create events after I confirm
  - ✅ Auto-create events when scheduling is explicit & simple (advanced, default off)
- Meeting defaults:
  - Default meeting length: 30 / 45 / 60 min
  - Buffer: e.g., 15 mins before & after meetings
  - Max meetings per day

**Data Storage**: `calendar_connections` and `workspace_settings` tables

## 3. AI Learning & Safety Setup

### 3.1 Tone Training (Optional)
**Location**: `src/app/[locale]/.../onboarding/ToneTraining.tsx`

- Question: "Do you want Aiva to learn your writing style?"
- Options:
  - "Yes, learn from my past replies"
  - "No, just use default tone"
- If yes:
  - Aiva samples X of user's previous sent emails/messages
  - Shows progress: "Analysing your writing style… (~30–60 seconds)"
  - Summary result: "You usually write: short, friendly, with casual greetings"
  - Let user adjust via sliders:
    - Concise ↔ Detailed
    - Casual ↔ Formal
    - Emojis rarely ↔ Frequently

**Implementation**: Server Action analyzes user's sent messages, stores tone profile

### 3.2 Signature & Identity
- User configures:
  - Name and role (e.g., "Theo Lewis – Mortgage Broker")
  - Email signature(s) per email account
  - Aiva will use appropriate signatures by channel

**Data Storage**: `user_settings` table (workspace-scoped)

### 3.3 Auto-Send Safety
**Location**: `src/app/[locale]/.../onboarding/AutoSendSetup.tsx`

- Explanation: "Aiva can auto-send certain replies when it's very confident. You stay in control."
- Defaults:
  - Initially, auto-send OFF
- Options:
  - Mode:
    - "Review everything before sending" (default)
    - "Allow Aiva to auto-send simple replies" (e.g. thanks, confirmations)
  - If turned on:
    - Show example: "Got it, thanks!" / "Thanks for sending this through"
    - Options:
      - Only to existing contacts
      - Never to new contacts
      - Never on social channels (email only) – can be toggled

**Data Storage**: `workspace_settings` table with auto-send configuration

## 4. First-Time Dashboard Experience

### 4.1 Unified Inbox Overview
**Location**: `src/app/[locale]/.../dashboard/page.tsx` (Server Component)

**Layout**:
- Left sidebar (Nextbase sidebar pattern):
  - Inbox
  - Today
  - Tasks
  - Calendar
  - Settings/Profile
- Secondary filter bar:
  - All | Email | Slack | WhatsApp | LinkedIn | IG | FB | Teams
  - Priority filter: High / Medium / Low / Noise
  - Status filter: Unread | Action needed | Waiting | Done

**Center Panel: Message List**
- Each message row shows:
  - Contact name, channel icon, time
  - Priority tag (High in red, etc)
  - Short snippet of message
  - Status indicator (AI thinks: "Action required", "FYI")

**Right Panel: Message Details / AI Actions**
- When user selects a message:
  - Full thread view
  - AI summary at top: "Summary: John is asking if you can meet Thursday 3pm"
  - "Detected actions: schedule meeting, confirm availability"
  - Buttons:
    - "Draft reply with Aiva" (Server Action)
    - "Mark as done"
    - "Create task"
    - "Schedule meeting"

**Data Fetching**: Server Components fetch messages with workspace filtering

### 4.2 First "Morning Briefing"
**Location**: `src/components/dashboard/MorningBriefing.tsx`

If first login is in morning, or next day:
- Aiva pops: "Good morning, Theo 👋"
- Today's briefing:
  - 3 urgent messages needing replies
  - 2 meetings scheduled
  - 1 potential conflict flagged
  - 4 tasks due this week
- Action buttons:
  - "Review urgent messages"
  - "Review today's schedule"
  - "Skip briefing" (and don't show again today)

**Implementation**: Server Component fetches data, Client Component handles interactions

## 5. Daily Use – Message Handling Flow

### 5.1 Triage Flow
**Location**: `src/app/[locale]/.../inbox/page.tsx`

1. User enters Inbox
   - Aiva by default shows: "Important & Unread" filter
   - Quick filter: "[ ] Show everything" / "[✓] Show important only"

2. For each important message:
   - Aiva displays inline chips:
     - "Reply likely needed"
     - "Schedule something"
     - "FYI only"
   - User can:
     - Click "Reply with Aiva" → Opens draft modal
     - Click "Schedule with Aiva" → Opens scheduling flow
     - Click "Mark as done" → Updates status

### 5.2 Drafting Replies with Aiva
**Location**: `src/components/messages/DraftReplyModal.tsx` (Client Component)

1. Click "Draft with Aiva"
   - Server Action: `draftReplyAction`
   - Aiva:
     - Pulls entire thread, relevant context across channels, & user tone
     - Generates draft message
   - UI shows:
     - Draft text in reply editor
     - AI summary of "Why this reply": "You previously agreed to send pricing. I've drafted a short reply with pricing link"

2. User actions:
   - Accept draft and click "Send" → Server Action `sendReplyAction`
   - Edit text before sending
   - Request alternative: "Make it shorter", "Make it more formal", "Add more detail"

3. Post-send handling:
   - Message status set to Done or Waiting on others
   - Aiva can auto-create follow-up task: "If no reply in 3 days, remind me"

**Implementation**: Uses Server Actions for AI calls, React Hook Form for editing

### 5.3 Auto-Send in Action (After User Enables)

Once auto-send is enabled:
1. Incoming simple message example:
   - "Thanks Theo!"
   - "Got it"
   - "Can you confirm the booking for tomorrow at 10am?"

2. Aiva pipeline (Background job):
   - Classifies as low-risk simple acknowledgement / confirmation
   - Checks: Sender matches rules, no contradictions
   - Autogenerates reply and sends via Server Action

3. User sees in "Recent activity":
   - Panel: "Aiva auto-sent 3 replies in the last hour"
   - Click to expand and review
   - User can thumbs-up/down to train future behavior

**Implementation**: Supabase Edge Function processes auto-send, logs to `ai_action_logs`

## 6. Scheduling & Calendar Flow

### 6.1 Scheduling from Messages
**Location**: `src/components/scheduling/ScheduleFromMessage.tsx`

1. User gets scheduling message
   - Example: "Could we chat sometime Thursday afternoon or Friday morning?"

2. Aiva detection
   - Server Action: `detectSchedulingIntentAction`
   - Recognizes scheduling intent
   - Extracts: Candidate days, preferred times

3. Aiva checks calendar
   - Server Action: `getAvailableSlotsAction`
   - Finds user's availability:
     - Thursday: free slots 2–3pm, 4–5pm
     - Friday: free slots 9–10am, 11–12pm
   - Applies rules: Avoid back-to-back, respect buffers

4. Aiva proposes reply
   - Server Action: `generateSchedulingProposalAction`
   - Draft: "Thanks for reaching out! I'm free Thursday between 2–3pm or 4–5pm, and Friday between 9–10am or 11–12pm (AEST). Let me know what works best and I'll send a calendar invite."

5. User Action
   - Approves/edits the draft
   - Sends via `sendReplyAction`

6. Upon Confirmation
   - Other side responds: "Let's do Thursday at 2:30pm"
   - Aiva:
     - Detects confirmation
     - Confirms no new conflicts
     - Creates event via `createCalendarEventAction`
     - Drafts confirmation message

**Implementation**: Server Actions for all operations, workspace-scoped data

### 6.2 Conflict Detection & Resolution
**Location**: `src/components/calendar/ConflictResolution.tsx`

1. User manually or AI tries to book conflicting time
   - Aiva sees another meeting at 2:30–3pm same day

2. Flow:
   - Aiva warns: "This time conflicts with XYZ meeting"
   - Options:
     - Suggest alternative: "Propose 3:30–4pm instead"
     - Mark as tentative & notify user
     - Ask user: "Is it okay to move XYZ meeting to tomorrow at 3pm?"

3. User chooses action
   - Aiva executes via Server Actions:
     - Reschedules event
     - Sends explanation to affected parties

### 6.3 Calendar View & Daily Planning
**Location**: `src/app/[locale]/.../calendar/page.tsx`

1. Calendar tab
   - Displays weekly view (day / week switch)
   - Integration with tasks and messages:
     - Tasks visible as all-day or time-blocks
     - Indicator on events: "Has prep notes" / "Has related email"

2. Pre-meeting brief (Phase 2+)
   - Clicking on event or 10 minutes before:
     - Aiva shows: Who is attending, last few messages, open tasks, quick notes area

## 7. Tasks & Follow-Up Flow
**Location**: `src/app/[locale]/.../tasks/page.tsx`

1. From messages
   - Aiva: "I detected a task: 'Send pricing by Friday'"
   - Suggests: Create task with title, due date
   - User can accept or adjust

2. Tasks tab
   - List grouped by: Today, This week, Later
   - Each task: Title, due date, priority, related message link
   - User can: Mark complete, snooze, open linked message/thread

3. Task reminders
   - At start of day: "You have 3 tasks due today"
   - Before due time: Notification: "Task 'Send contract to John' is due in 30 minutes"

**Integration**: Tasks stored in workspace-scoped table, can link to workspace projects

## 8. Notifications & Multi-Device Flow

### 8.1 Web Notifications
- In-browser notifications when:
  - New urgent messages
  - Upcoming meetings
  - Tasks due soon
- Can be turned on/off per category

### 8.2 Mobile App (or PWA)
- Push notifications:
  - High priority messages
  - Daily briefing
  - Meeting reminders

### 8.3 Email Summary
- Daily or weekly summary:
  - Summary of messages handled by Aiva
  - Time saved estimation
  - Auto-sent messages list

**Implementation**: Uses Supabase Realtime for live notifications

## 9. Settings, Preferences & Management Flow
**Location**: `src/app/[locale]/.../settings/`

### 9.1 Profile Settings
- Change name, avatar, language, tone preferences
- Update email signature

### 9.2 Channels & Calendars
- See all connected accounts
- Toggle sync on/off
- Reconnect if tokens expired
- Disconnect account

### 9.3 AI Behavior
- Auto-send toggle + thresholds
- Per-channel rules:
  - Email: allow auto-send simple replies
  - WhatsApp: draft only, manual send
  - Slack: allow auto-send for internal acknowledgements
- Task extraction toggle
- Scheduling behavior settings

### 9.4 Privacy & Data
- Toggle: Allow training on my messages
- Export my data (GDPR compliance)
- Delete account & data

### 9.5 Team / Workspace (if applicable)
- Invite/remove members (Nextbase workspace management)
- Assign roles (Owner / Admin / Member)
- Shared inboxes management
- Central policies:
  - Turn auto-send off globally
  - Require human review for external communication

**Implementation**: Uses Nextbase workspace management patterns

## 10. Billing & Plan Flow
**Location**: `src/app/[locale]/.../workspace/[slug]/settings/billing/`

### 10.1 Trial
- Typically 7–14 day free trial
- Banner: "X days left in your trial – Upgrade to keep Aiva"

### 10.2 Upgrade
- Pricing page in-app
- Plans: Solo / Pro / Team
- Stripe checkout (Nextbase billing integration)

### 10.3 Plan Management
- View current plan and usage
- Add seats (team)
- Change card / cancel subscription

**Implementation**: Uses Nextbase Stripe billing integration

## 11. Error Handling & Edge Case Flows

### 11.1 Integration Errors
- If Gmail/Outlook token expires:
  - Banner: "We lost connection to Gmail. Click here to reconnect"
- If API returns error:
  - For message send: "Sending failed, please try again"
  - Log error to `ai_action_logs` & monitoring

### 11.2 AI Failures
- If model times out or fails:
  - Show: "Aiva couldn't generate this reply. Try again, or write manually"
  - Fallback to simple templates

### 11.3 Conflict & Policy Violations
- If auto-send would violate user setting:
  - Don't send; log event
  - Notify: "I prepared a reply but didn't send it due to your settings"

## 12. Offboarding / Account Deletion Flow
**Location**: `src/app/[locale]/.../settings/account/delete`

### 12.1 User Initiates Delete
- Settings → Privacy → "Delete my account & data"
- Explain what will happen:
  - All messages/summaries/tasks deleted from Aiva
  - External email/Slack accounts unaffected

### 12.2 Confirmation
- Double-confirm: password + "Type DELETE to confirm"

### 12.3 Execution
- Queued job deletes data in safe order
- Respects legal retention if necessary
- Final email confirming deletion

**Implementation**: Uses Nextbase account deletion patterns with cascade deletes

---

**Built on Nextbase Ultimate** - All flows leverage Nextbase patterns: workspace isolation, Server Components, Server Actions, RLS policies, and secure authentication.

