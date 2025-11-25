# Aiva.io - Product Requirements Document

## 1. Product Overview

### 1.1 Vision

Aiva.io is a cloud-based AI Virtual Assistant that unifies a user's communication and schedule across channels and proactively manages their day. Built on **Nextbase Ultimate**, it provides a secure, scalable, multi-tenant platform for communication management.

### 1.2 Core Value Proposition

- **Reduce time spent on email + messages by 50–70%** for power users
- **Prevent missed messages and double bookings**
- **Provide an AI assistant** that can handle routine replies and scheduling end-to-end with minimal oversight
- **Unified workspace** for all communication channels

## 2. Objectives & Success Metrics

### 2.1 Objectives
- Reduce communication overhead by 50–70%
- Zero missed high-priority messages
- Automated scheduling without conflicts
- High user trust in AI suggestions (>80% approval rate)

### 2.2 Key Success Metrics
- **Time Saved**: Average time saved per user per week (self-reported + behavioral)
- **Response Time**: Improvement across channels (before vs after)
- **AI Adoption**: Number/percentage of messages handled via AI (drafted) and messages auto-sent
- **Scheduling Accuracy**: Reduction in double-booked events and time conflicts
- **Engagement**: DAU/WAU, retention (D30, D90)
- **Trust**: NPS and "trust" score for AI suggestions

## 3. Target Users & Use Cases

### 3.1 Personas

#### Solo Professional / Consultant
- **Workspace Type**: Solo workspace
- **Channels**: Multiple inboxes + socials
- **Needs**: Fast responses, lead qualification, easy scheduling
- **Use Case**: Manage all client communications from one place

#### Agency Owner / SMB Founder
- **Workspace Type**: Team workspace
- **Channels**: Many client conversations across email, Slack, WhatsApp, Instagram
- **Needs**: Delegate communication and scheduling tasks to AI
- **Use Case**: Replace full-time VA with AI assistant

#### Sales / BD / Recruiter
- **Workspace Type**: Solo or team workspace
- **Channels**: Gmail/Outlook, LinkedIn, WhatsApp
- **Needs**: Follow-ups, availability management, quick replies
- **Use Case**: Never miss a lead, respond instantly

#### Executive
- **Workspace Type**: Team workspace
- **Channels**: High volume of email/slack/Teams
- **Needs**: AI behaves like an EA: triage inbox, summarize, draft responses, manage calendar
- **Use Case**: Focus on strategic work, delegate routine communication

### 3.2 Core Use Cases

1. **Morning Briefing**: "What do I need to care about today?" – across messages & calendar
2. **Unified Inbox**: View of email + DM + Slack + Teams messages in one place
3. **AI Draft Replies**: Drafts replies in user's tone, context-aware
4. **Automatic Sending**: Simple/low-risk replies sent automatically
5. **Task Extraction**: Extract tasks and follow-ups from messages, schedule reminders
6. **Smart Scheduling**: Detect scheduling intents, check calendar, propose slots, send invites
7. **Calendar Integrity**: No double bookings, travel time buffers, respect blocked "focus" time

## 4. Functional Requirements

### 4.1 Integration Layer

#### 4.1.1 Channels (Phase 1/2)

**Email**:
- Gmail (OAuth, Gmail API)
- Outlook/Office 365 (Microsoft Graph API)

**Collaboration / Messaging**:
- Slack (bot/user token; events + Web API)
- Microsoft Teams (Graph / Teams APIs)

**Social / DM**:
- LinkedIn Messaging (where API allows)
- WhatsApp Business Cloud API
- Instagram Messaging API
- Facebook Messenger API

**Features**:
- Secure OAuth integration & token refresh (Supabase Auth patterns)
- Read access to messages (minimal scope – principle of least privilege)
- Send/reply capability via API
- Webhooks / event subscriptions for new message events
- Rate-limit and failure handling
- Workspace-scoped storage with RLS

#### 4.1.2 Calendars
- Google Calendar
- Outlook / Microsoft 365 / Exchange Calendar
- Apple Calendar / generic CalDAV (Phase 2+)

**Features**:
- Read events and time-blocks (busy/free)
- Create, update, and delete events (with user consent)
- Time zone awareness
- Read meeting metadata (title, description, attendees)
- Workspace-scoped with RLS policies

### 4.2 Unified Inbox & Dashboard

#### 4.2.1 Unified Inbox View
- List of all conversations aggregated from all channels
- Each item shows: Contact name, channel icon, snippet, time, priority
- Tags: "Client", "Lead", "Internal", etc.
- Filters:
  - By channel (Email / Slack / WhatsApp / LinkedIn / etc)
  - By priority (High, Medium, Low, Noise)
  - By status (Unread, Action required, Waiting on others, Done)
- Conversation view: Full thread view, even across channels

#### 4.2.2 Morning Briefing
- Daily summary widget:
  - "Top X messages you should see"
  - Today's meetings (with potential conflicts highlighted)
  - Overdue responses & tasks
- Option to get via email/push notification
- Server Component for fast loading

### 4.3 AI Assistant Engine

#### 4.3.1 Message Ingestion & Normalization
- Normalized message model stored in Supabase:
  - `id`, `source_channel`, `thread_id`, `sender`, `recipient(s)`, `timestamp`, `subject/title`, `body`, `attachments`, `labels/tags`, `status`
  - Workspace-scoped with RLS
- Content tokenization for AI pipelines
- Real-time ingestion via webhooks

#### 4.3.2 Classification & Prioritization
- Models/rules to assign:
  - Priority (High/Medium/Low/Noise)
  - Category: Sales lead, Client support, Internal, Social, Marketing, Personal
  - Sentiment: neutral / positive / negative / urgent
  - Actionability: "Question", "Request", "FYI", etc.

#### 4.3.3 Summarization & Context
- Per-thread summary: short paragraph explanation
- Extracted key points: who wants what, by when
- Cross-channel context: "Last contact: LinkedIn on DATE, now emailing you"

#### 4.3.4 Reply Drafting
- Draft replies using:
  - User's writing style (tone model trained on previous replies)
  - Context (prior conversation across channels)
  - User preferences (formal vs casual, sign-offs, disclaimers)
- UX:
  - One-click "Draft with AI" (Server Action)
  - Inline editing
  - Multiple options ("Short reply", "Detailed response", "Friendly tone")

#### 4.3.5 Auto-Send
- Configurable auto-send rules:
  - Message type: simple acknowledgements, scheduling confirmations
  - Priority/importance threshold
  - Sender whitelist/blacklist
- Confidence scoring:
  - For each draft, compute confidence score (0–1)
  - If above user-defined threshold + matches rule, Aiva sends automatically
- Safety mechanisms:
  - "Outbox" view of recently auto-sent messages
  - Global kill-switch to pause auto-send
  - Logging and easy revert for mis-sends

### 4.4 Scheduling & Calendar Intelligence

#### 4.4.1 Calendar Awareness
- Maintain up-to-date model of user's availability:
  - Busy/free times from integrated calendars
  - Preferred working hours, days, and time zones
  - Personal "no-meeting" blocks (focus time, family time)
- Support time buffer rules:
  - Minimum gap between meetings
  - Travel time between meetings

#### 4.4.2 Scheduling from Messages
- Detect scheduling intent:
  - "Can we meet tomorrow afternoon?"
  - "Are you free next Wednesday at 3pm?"
- AI workflow:
  1. Identify time proposal windows
  2. Check user's calendar for conflicts
  3. Suggest options back to sender
  4. Upon confirmation, create event in calendar, send invite

#### 4.4.3 Smart Conflict Management
- Detect conflicting events across multiple calendars
- Suggest resolutions:
  - Move less-important event
  - Propose alternate time
  - Mark as tentative / decline with polite AI-generated response
- Show conflicts in UI

### 4.5 Tasks & Follow-Ups
- Aiva extracts tasks from messages:
  - "Can you send me the report by Friday?" → Task with due date
  - "Let's revisit this next week" → Reminder
- Tasks panel:
  - View tasks by due date, type, contact
  - Mark complete, snooze, reassign due date
- Integration with workspace projects (Nextbase feature)

### 4.6 Search & Knowledge
- Global search across:
  - Messages (all channels)
  - Contacts
  - Events
  - Tasks
- Filters: by channel, date range, contact, sentiment, priority
- "Ask Aiva" free-form questions:
  - "Show me all emails from Sarah about contract revisions"
  - "What did I agree with John about pricing last week?"
- Vector search using Supabase Vector extension

### 4.7 Settings, Controls & Personalization
- Channel connection page: manage connected accounts, revoke access
- Auto-send settings:
  - Turn on/off per channel
  - Confidence threshold slider
  - Rule management
- Tone & style:
  - Formal/informal sliders
  - Signature templates
  - Language preferences
- Calendar preferences:
  - Timezone, work hours, meeting duration defaults
  - Buffer preferences & max meetings/day
- Privacy controls:
  - Whether to let AI "learn" from past messages
  - Whether to store content long-term or only metadata/summaries

### 4.8 Security, Privacy & Compliance
- OAuth 2.0 for all integrations (Supabase Auth)
- Store tokens encrypted at rest with role-based access
- Use HTTPS/TLS for all network communications
- Multi-tenant data isolation (workspace-scoped RLS)
- SSO / SAML for enterprise accounts (Phase 3)
- Data retention policies:
  - Configurable per workspace
  - Options to store only metadata vs full message bodies
- Compliance roadmap:
  - GDPR readiness (right to be forgotten, export data)
  - SOC 2 / ISO-27001 in longer term

## 5. Non-Functional Requirements

### 5.1 Performance
- New message ingestion < 30 seconds from provider event
- Reply draft generation < 5–7 seconds for 95th percentile
- Dashboard load time < 2 seconds

### 5.2 Scalability
- Support thousands of messages/day per user
- Architected to scale horizontally (workers/queues)
- Workspace-based isolation for efficient resource usage

### 5.3 Availability
- 99.9% uptime target for core services
- Graceful degradation if AI services unavailable

### 5.4 Observability
- Structured logging (Supabase logging)
- Metrics and alerting
- Audit logs for actions (auto-send, event creation, etc.)

## 6. High-Level Architecture

### 6.1 Tech Stack (Nextbase Ultimate Foundation)

**Frontend**:
- Next.js 15 (App Router) with Server Components
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui components

**Backend**:
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- Next.js API Routes & Server Actions
- Supabase Edge Functions for webhooks

**Database**:
- PostgreSQL (multi-tenant schema with RLS)
- Redis for caching and queues (via Supabase)
- Vector extension for semantic search

**AI Layer**:
- Hosted LLMs (OpenAI / others) via API
- Internal services for: classification, summarization, reply generation

**Message & Job Queue**:
- Supabase Realtime for live updates
- Background jobs via Supabase Edge Functions

**Storage**:
- Supabase Storage for attachments

**Deployment**:
- Vercel/Netlify for Next.js app
- Supabase Cloud for database and services

### 6.2 Service Breakdown (Nextbase Architecture)

1. **API Gateway / BFF**: Next.js API routes
2. **User & Auth Service**: Supabase Auth (workspace-scoped)
3. **Integration Service**: Manages OAuth, tokens, webhooks, background sync jobs
4. **Messaging Service**: Stores normalized messages & threads (workspace-scoped)
5. **Calendar & Scheduling Service**: Syncs calendars, manages availability, event creation
6. **AI Orchestration Service**: Calls LLMs for classification, summarization, drafting
7. **Task / Follow-up Service**: Stores and manages tasks (integrated with workspace projects)
8. **Notification Service**: Emails, push notifications, in-app notifications
9. **Analytics & Reporting Service** (Phase 2+): Tracks metrics, usage dashboards

## 7. Data Model (Supabase Schema)

### Core Entities (Workspace-Scoped)

- **User**: `id`, `email`, `name`, `timezone`, `preferences`, `plan`
- **Workspace**: Multi-tenant workspace (Nextbase pattern)
- **ChannelConnection**: `id`, `workspace_id`, `user_id`, `provider`, `access_token` (encrypted), `refresh_token`, `scopes`, `status`
- **Message**: `id`, `provider_message_id`, `channel_connection_id`, `thread_id`, `sender`, `recipients`, `subject`, `body`, `timestamp`, `labels`, `priority`, `category`, `sentiment`, `status`, `workspace_id`
- **Thread**: `id`, `workspace_id`, `primary_subject`, `participants`, `channel(s)`, `last_message_at`, `summary`
- **CalendarConnection**: `id`, `workspace_id`, `user_id`, `provider`, `tokens`, `sync_status`
- **Event**: `id`, `workspace_id`, `provider_event_id`, `calendar_connection_id`, `title`, `description`, `start_time`, `end_time`, `attendees`, `status`, `location`, `time_zone`
- **Task**: `id`, `workspace_id`, `user_id`, `source_message_id`, `title`, `description`, `due_date`, `status`, `priority`
- **AIActionLog**: `id`, `workspace_id`, `user_id`, `type`, `input_ref`, `output_ref`, `confidence`, `timestamp`

**All tables have RLS policies enforcing workspace isolation.**

## 8. AI / ML Logic Overview

### 8.1 Models & Pipelines
- **Classification Model**: Priority, category, sentiment, actionability
- **Summarization Model**: Message/thread summarization, daily briefing
- **Reply Generation Model**: Thread context + metadata + user tone profile
- **Scheduling Intent Model**: Detects "meeting intent" + proposed times/dates
- **Tone Profiling** (Opt-in): Analysis of user's past replies

### 8.2 Safety & Guardrails
- Filters for sensitive information
- Tone mismatches
- Human-in-the-loop for first N messages
- A/B testing of different reply strategies

## 9. Phased Roadmap

### Phase 1 – MVP (3–4 months)
- User auth & onboarding (Nextbase patterns)
- Integrations: Gmail, Outlook, Slack, WhatsApp (where feasible), Google Calendar
- Unified inbox (basic)
- Classification & prioritization
- AI drafting (manual send only)
- Simple calendar awareness
- Basic daily briefing

### Phase 2 – Smart Scheduling & More Channels (3–6 months)
- Add: Teams, LinkedIn, Instagram DM, Facebook Messenger, Outlook/Exchange Calendar
- Full scheduling intent detection + automatic suggestions
- Event creation & conflict resolution
- Task extraction & basic tasks UI
- Auto-send with rules & logging
- Mobile-friendly web app

### Phase 3 – Team Features & Analytics (6–12 months)
- Multi-user workspaces (Nextbase team workspaces)
- Deeper analytics & insights dashboard
- External task/CRM integrations
- Voice/Chat interface to Aiva
- Regional hosting options + compliance certifications

## 10. Risks & Mitigations

### 10.1 API Access / Platform Limitations
- **Mitigate**: Start with most open APIs (Gmail, Office 365, Slack, Google Calendar, WhatsApp Business)

### 10.2 User Trust & Auto-Send
- **Mitigate**: Gradual rollout: start with draft-only, then optional auto-send with strict rules, transparent logs, easy disabling

### 10.3 Compliance & Data Protection
- **Mitigate**: Robust architecture (encryption, access control, RLS), plan early for audits and policies

### 10.4 LLM Cost & Latency
- **Mitigate**: Use caching & summarized context, tune prompts for minimal tokens, consider "mini" model for cheap classification

---

**Built on Nextbase Ultimate** - Leveraging production-ready multi-tenant architecture, security, and scalability patterns.

