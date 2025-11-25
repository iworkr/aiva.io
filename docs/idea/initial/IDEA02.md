1. Product Overview

1.1 Vision

Aiva.io is a cloud-based AI Virtual Assistant that unifies a user’s communication and schedule across channels and proactively manages their day.

It connects to:
	•	Email: Gmail, Outlook / Office 365, Exchange (via Graph / IMAP/SMTP where needed)
	•	Messaging / Collaboration: Slack, Microsoft Teams, WhatsApp (Business + personal where allowed), Instagram DMs, Facebook Messenger
	•	Professional Network: LinkedIn
	•	Calendars: Google Calendar, Outlook Calendar (Microsoft 365, Exchange), Apple Calendar (via CalDAV), other CalDAV-compatible calendars

Aiva centralises all messages and events into a single UI, uses AI to prioritise, summarise, draft replies, auto-send when safe, and manage scheduling without double-booking or missing important commitments.

⸻

2. Objectives & Success Metrics

2.1 Objectives
	•	Reduce time spent on email + messages by 50–70% for power users.
	•	Prevent missed messages and double bookings.
	•	Provide an AI assistant that can handle routine replies and scheduling end-to-end with minimal oversight.

2.2 Key Success Metrics
	•	Average time saved per user per week (self-reported + behavioural).
	•	Response time improvement across channels (before vs after).
	•	Number/percentage of messages handled via AI (drafted) and messages auto-sent.
	•	Reduction in double-booked events and time conflicts.
	•	DAU/WAU, retention (D30, D90).
	•	NPS and “trust” score for AI suggestions.

⸻

3. Target Users & Use Cases

3.1 Personas
	1.	Solo Professional / Consultant
	•	Has multiple inboxes + socials.
	•	Needs fast responses, lead qualification, and easy scheduling.
	2.	Agency Owner / SMB Founder
	•	Many client conversations across email, Slack, WhatsApp, Instagram, etc.
	•	Wants to delegate communication and scheduling tasks to AI instead of hiring a full-time VA.
	3.	Sales / BD / Recruiter
	•	Lives in Gmail/Outlook, LinkedIn, WhatsApp.
	•	Needs follow-ups, availability management, quick “yes/no/schedule” replies.
	4.	Executive
	•	High volume of email/slack/Teams.
	•	Wants AI to behave like an EA: triage inbox, summarise, draft responses, manage calendar.

3.2 Core Use Cases
	•	Morning briefing: “What do I need to care about today?” – across messages & calendar.
	•	Unified inbox view of email + DM + Slack + Teams messages.
	•	AI drafts replies in the user’s tone.
	•	Automatic sending of simple / low-risk replies (thank-yous, confirmations).
	•	Extracting tasks and follow-ups from messages and scheduling reminders.
	•	Detecting scheduling intents (“Can you do Thursday 3pm?”) and automatically:
	•	Checking the user’s calendar.
	•	Proposing available slots.
	•	Sending calendar invites.
	•	Ensuring calendar integrity: no double bookings, travel time buffers, respecting blocked “focus” time.

⸻

4. Functional Requirements

4.1 Integrations Layer

4.1.1 Channels

Required integrations (Phase 1/2):
	•	Email
	•	Gmail (OAuth, Gmail API)
	•	Outlook/Office 365 (Microsoft Graph API)
	•	Collab / Messaging
	•	Slack (bot/user token; events + Web API)
	•	Microsoft Teams (Graph / Teams APIs)
	•	Social / DM
	•	LinkedIn Messaging (where API allows)
	•	WhatsApp Business Cloud API
	•	Instagram Messaging API
	•	Facebook Messenger API

Features:
	•	Secure OAuth integration & token refresh.
	•	Read access to messages (with minimal scope – principle of least privilege).
	•	Send/reply capability via API.
	•	Webhooks / event subscriptions for new message events where supported.
	•	Rate-limit and failure handling.

4.1.2 Calendars
	•	Google Calendar
	•	Outlook / Microsoft 365 / Exchange Calendar
	•	Apple Calendar / generic CalDAV (Phase 2+)

Features:
	•	Read events and time-blocks (busy/free).
	•	Create, update, and delete events (with user consent).
	•	Time zone awareness (store user TZ; handle invite TZ).
	•	Read meeting metadata (title, description, attendees).

⸻

4.2 Unified Inbox & Dashboard

4.2.1 Unified Inbox View
	•	List of all conversations aggregated from all channels.
	•	Each item shows:
	•	Contact name, channel icon, snippet, time, priority.
	•	Tags: “Client”, “Lead”, “Internal”, etc.
	•	Filters:
	•	By channel (Email / Slack / WhatsApp / LinkedIn / etc).
	•	By priority (High, Medium, Low, Noise).
	•	By status (Unread, Action required, Waiting on others, Done).
	•	Conversation view:
	•	Full thread view, even across channels where possible (e.g., see last email & last WhatsApp from same person).

4.2.2 Morning Briefing
	•	Daily summary widget:
	•	“Top X messages you should see.”
	•	Today’s meetings (with potential conflicts highlighted).
	•	Overdue responses & tasks.
	•	Option to get via email/push notification.

⸻

4.3 AI Assistant Engine

4.3.1 Message Ingestion & Normalisation
	•	Normalised message model:
	•	id, source_channel, thread_id, sender, recipient(s), timestamp, subject/title, body, attachments, labels/tags, status.
	•	Store in core DB with reference to original provider ID.
	•	Content tokenisation for AI pipelines (summarisation, classification, reply generation).

4.3.2 Classification & Prioritisation
	•	Models / rules to assign:
	•	Priority (High/Medium/Low/Noise).
	•	Category: Sales lead, Client support, Internal, Social, Marketing, Personal, etc.
	•	Sentiment: neutral / positive / negative / urgent.
	•	Actionability: “Question”, “Request”, “FYI”, etc.

4.3.3 Summarisation & Context
	•	Per-thread summary: short paragraph explanation of the thread.
	•	Extracted key points: who wants what, by when.
	•	Cross-channel context: “Last contact: LinkedIn on DATE, now emailing you” to give Aiva context for responses.

4.3.4 Reply Drafting
	•	Draft replies for each message or thread, using:
	•	User’s writing style (tone model trained on previous replies where allowed).
	•	Context (prior conversation across channels).
	•	User preferences (formal vs casual, sign-offs, disclaimers).
	•	UX:
	•	One-click “Draft with AI”.
	•	Inline editing.
	•	Multiple options (“Short reply”, “Detailed response”, “Friendly tone”).

4.3.5 Auto-Send
	•	Configurable auto-send rules:
	•	Message type: simple acknowledgements, scheduling confirmations, info clarifications.
	•	Priority/importance threshold.
	•	Sender whitelist/blacklist.
	•	Confidence scoring:
	•	For each draft, compute confidence score (0–1) based on pattern and model certainty.
	•	If above user-defined threshold + matches rule, Aiva sends automatically.
	•	Safety mechanisms:
	•	“Outbox” view of recently auto-sent messages.
	•	Global kill-switch to pause auto-send.
	•	Logging and easy revert for mis-sends (if provider allows message recall/update).

⸻

4.4 Scheduling & Calendar Intelligence

4.4.1 Calendar Awareness
	•	Maintain an up-to-date model of user’s availability:
	•	Busy/free times from integrated calendars.
	•	Preferred working hours, days, and time zones.
	•	Personal “no-meeting” blocks (focus time, family time).
	•	Support time buffer rules:
	•	Minimum gap between meetings.
	•	Travel time between meetings (optional future: Google Maps integration).

4.4.2 Scheduling from Messages
	•	Detect scheduling intent:
	•	“Can we meet tomorrow afternoon?”
	•	“Are you free next Wednesday at 3pm?”
	•	AI workflow:
	1.	Identify time proposal windows.
	2.	Check user’s calendar for conflicts.
	3.	Suggest options back to the sender, either:
	•	In natural language (e.g. “I’m free Thursday 2–4pm or Friday 9–11am”).
	•	With a scheduling link (Phase 2).
	4.	Upon confirmation, create event in calendar, send invite.

4.4.3 Smart Conflict Management
	•	Detect conflicting events across multiple calendars.
	•	Suggest resolutions:
	•	Move less-important event.
	•	Propose alternate time.
	•	Mark as tentative / decline with polite AI-generated response.
	•	Show conflicts in UI (Badge: “Conflict risk”).

4.4.4 Meeting Prep & Follow-up (Phase 2+)
	•	Pre-meeting brief:
	•	Short summary of previous communications with attendees.
	•	Open tasks or topics to cover.
	•	Post-meeting:
	•	Generate draft follow-up email.
	•	Extract action items and due dates.

⸻

4.5 Tasks & Follow-Ups
	•	Aiva extracts tasks from messages:
	•	“Can you send me the report by Friday?” → Task with due date.
	•	“Let’s revisit this next week” → Reminder.
	•	Tasks panel:
	•	View tasks by due date, type, contact.
	•	Mark complete, snooze, reassign due date.
	•	Optional integration with external task managers (Asana, Todoist, Trello) in later phases.

⸻

4.6 Search & Knowledge
	•	Global search across:
	•	Messages (all channels).
	•	Contacts.
	•	Events.
	•	Tasks.
	•	Filters: by channel, date range, contact, sentiment, priority.
	•	“Ask Aiva” free-form questions:
	•	“Show me all emails from Sarah about contract revisions.”
	•	“What did I agree with John about pricing last week?”
	•	AI uses vector search + semantic retrieval to find relevant threads and summarise them.

⸻

4.7 Settings, Controls & Personalisation
	•	Channel connection page: manage connected accounts, revoke access.
	•	Auto-send settings:
	•	Turn on/off per channel.
	•	Confidence threshold slider.
	•	Rule management (e.g., “Never auto-send to new contacts”).
	•	Tone & style:
	•	Formal/informal sliders.
	•	Signature templates.
	•	Language preferences.
	•	Calendar preferences:
	•	Timezone, work hours, meeting duration defaults.
	•	Buffer preferences & max meetings/day.
	•	Privacy controls:
	•	Whether to let AI “learn” from past messages for tone modelling.
	•	Whether to store content long-term or only metadata/summaries.

⸻

4.8 Security, Privacy & Compliance
	•	OAuth 2.0 for all integrations.
	•	Store tokens encrypted at rest with role-based access.
	•	Use HTTPS/TLS for all network communications.
	•	Multi-tenant data isolation.
	•	SSO / SAML for enterprise accounts (Phase 3).
	•	Data retention policies:
	•	Configurable per workspace.
	•	Options to store only metadata vs full message bodies.
	•	Compliance roadmap:
	•	GDPR readiness (right to be forgotten, export data).
	•	SOC 2 / ISO-27001 in longer term.

⸻

5. Non-Functional Requirements
	•	Performance:
	•	New message ingestion < 30 seconds from provider event.
	•	Reply draft generation < 5–7 seconds for 95th percentile.
	•	Scalability:
	•	Support thousands of messages/day per user.
	•	Architected to scale horizontally (workers/queues).
	•	Availability:
	•	99.9% uptime target for core services.
	•	Observability:
	•	Structured logging, metrics, alerting.
	•	Audit logs for actions (auto-send, event creation, etc.).

⸻

6. High-Level Architecture

6.1 Proposed Tech Stack (example – can be adjusted)
	•	Frontend:
	•	React / Next.js, TypeScript
	•	Tailwind + component library (e.g., shadcn)
	•	Backend API:
	•	Node.js (NestJS/Express) or C# (.NET) – your call, but multi-service friendly
	•	REST + WebSockets (or GraphQL if preferred)
	•	Database:
	•	PostgreSQL (multi-tenant schema)
	•	Redis for caching and queues
	•	AI Layer:
	•	Hosted LLMs (OpenAI / others) via API
	•	Internal services for: classification, summarisation, reply generation
	•	Message & Job Queue:
	•	e.g., Redis-backed queue (BullMQ), or RabbitMQ / Kafka
	•	Storage:
	•	Object storage (S3 compatible) for any attachments, logs if needed.
	•	Deployment:
	•	Containerised (Docker) on a cloud provider (e.g., Render, AWS, GCP, Azure).

6.2 Service Breakdown
	1.	API Gateway / BFF
	•	Auth, routing, rate limiting.
	2.	User & Auth Service
	•	User accounts, organisations, roles.
	3.	Integration Service
	•	Manages OAuth, tokens, webhooks, background sync jobs.
	4.	Messaging Service
	•	Stores normalized messages & threads.
	•	Handles fetching, status updates, sending replies.
	5.	Calendar & Scheduling Service
	•	Syncs calendars, manages availability, event creation, conflict logic.
	6.	AI Orchestration Service
	•	Calls LLMs for classification, summarisation, drafting.
	•	Maintains tone/profile models.
	7.	Task / Follow-up Service
	•	Stores and manages tasks extracted from messages.
	8.	Notification Service
	•	Emails, push notifications, in-app notifications.
	9.	Analytics & Reporting Service (Phase 2+)
	•	Tracks metrics, usage dashboards.

⸻

7. Data Model (Simplified)

Core Entities
	•	User
	•	id, email, name, timezone, preferences, plan, etc.
	•	Workspace / Organisation
	•	Optional multi-user context, billing owner, seats.
	•	ChannelConnection
	•	id, user_id, provider (gmail/outlook/slack/etc), access_token (encrypted), refresh_token, scopes, status.
	•	Message
	•	id, provider_message_id, channel_connection_id, thread_id, sender, recipients, subject, body, timestamp, labels, priority, category, sentiment, status.
	•	Thread
	•	id, primary_subject, participants, channel(s), last_message_at, summary.
	•	CalendarConnection
	•	id, user_id, provider (google, outlook, caldav), tokens, sync status.
	•	Event
	•	id, provider_event_id, calendar_connection_id, title, description, start_time, end_time, attendees, status, location, time_zone.
	•	Task
	•	id, user_id, source_message_id, title, description, due_date, status, priority.
	•	AIActionLog
	•	id, user_id, type (classification, draft, auto-send, schedule), input_ref (message/event), output_ref, confidence, timestamp.

⸻

8. AI / ML Logic Overview

8.1 Models & Pipelines
	•	Classification Model
	•	Input: message text, metadata.
	•	Outputs: priority, category, sentiment, actionability.
	•	Summarisation Model
	•	Message/thread summarisation, daily briefing.
	•	Reply Generation Model
	•	Input: thread context + metadata + user tone profile.
	•	Output: one or more reply drafts.
	•	Scheduling Intent Model
	•	Detects “meeting intent” + proposed times/dates.
	•	Works with Calendar Service to craft suggested replies.
	•	Tone Profiling (Opt-in)
	•	Analysis of user’s past replies to determine writing style.
	•	Generates style configuration, not storing raw content necessarily.

8.2 Safety & Guardrails
	•	Filters for:
	•	Sensitive information (don’t send bank details, etc).
	•	Tone mismatches (avoid rude or off-brand responses).
	•	Human-in-the-loop for first N messages before enabling auto-send for each user.
	•	A/B testing of different reply strategies.

⸻

9. Phased Roadmap (High Level)

Phase 1 – MVP (3–4 months)
	•	User auth & onboarding.
	•	Integrations: Gmail, Outlook, Slack, WhatsApp (where feasible), Google Calendar.
	•	Unified inbox (basic).
	•	Classification & prioritisation.
	•	AI drafting (manual send only).
	•	Simple calendar awareness (view events, show conflicts).
	•	Basic daily briefing.

Phase 2 – Smart Scheduling & More Channels (3–6 months)
	•	Add: Teams, LinkedIn, Instagram DM, Facebook Messenger, Outlook/Exchange Calendar.
	•	Full scheduling intent detection + automatic suggestions.
	•	Event creation & conflict resolution.
	•	Task extraction & basic tasks UI.
	•	Auto-send with rules & logging.
	•	Mobile-friendly web app or basic mobile app.

Phase 3 – Team Features & Analytics (6–12 months)
	•	Multi-user workspaces, shared inboxes.
	•	Deeper analytics & insights dashboard.
	•	External task/CRM integrations.
	•	Voice/Chat interface to Aiva.
	•	Regional hosting options + compliance certifications.

⸻

10. Risks & Mitigations
	•	API access / platform limitations
	•	Mitigate by starting with most open APIs (Gmail, Office 365, Slack, Google Calendar, WhatsApp Business).
	•	User trust & auto-send
	•	Gradual rollout: start with draft-only, then optional auto-send with strict rules, transparent logs, and easy disabling.
	•	Compliance & data protection
	•	Start with robust architecture (encryption, access control, least privilege) and plan early for audits and policies.
	•	LLM cost & latency
	•	Use caching & summarised context; tune prompts for minimal tokens; consider a “mini” model for cheap classification + a larger model for complex replies.

⸻
