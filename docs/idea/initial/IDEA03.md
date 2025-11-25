0. Pre-App: Marketing & Entry Points
	1.	User discovers Aiva
	•	Through website, ad, referral, app store, Chrome extension, etc.
	•	Clear promise: “One AI assistant for all your messages and calendar – across Gmail, Slack, WhatsApp, LinkedIn & more.”
	2.	Landing page CTAs
	•	“Get Started Free”
	•	“Watch Demo”
	•	“Book a Setup Call” (for teams)
	3.	Sign-up triggers
	•	Click “Get Started” → taken to Sign Up screen.

⸻

1. Account Creation & Workspace Setup
	1.	Sign Up Screen
	•	Options:
	•	Sign up with Google
	•	Sign up with Microsoft
	•	Sign up with Email + Password
	•	Choose region (if needed) and accept T&Cs + Privacy Policy.
	2.	Create Workspace (optional for solo)
	•	For solo users: default workspace created named “Aiva – [First Name]”.
	•	For teams: user can specify:
	•	Workspace name (e.g., “MyTechM8”, “ClearTrust Finance”)
	•	Role: Owner / Admin
	•	Invite teammates now? (Yes / Skip for later)
	3.	Basic Profile Setup
	•	Name, profile picture.
	•	Timezone (auto-detect, can confirm/override).
	•	Working hours (e.g., Mon–Fri, 8am–5pm).
	•	Preferred language & tone:
	•	Tone slider (Formal ↔ Friendly).
	•	Short defaults: “Hey,” vs “Hi [Name],” vs “Good morning [Name],”
	4.	Initial Goal Selection (optional but powerful)
	•	“What do you want Aiva to help with most?”
	•	✅ Clearing inbox faster
	•	✅ Managing my meetings & schedule
	•	✅ Handling social DMs & leads
	•	✅ All of the above
	•	Used to tailor onboarding defaults.

⸻

2. Connecting Channels & Calendars (Onboarding Wizard)

2.1 Channel Connections

You present a step-by-step wizard:
	1.	Connect Email
	•	Step: “Connect your main inbox”
	•	Buttons:
	•	“Connect Gmail”
	•	“Connect Outlook / Office 365”
	•	OAuth popup → user authorises Aiva to:
	•	Read messages, metadata.
	•	Send/reply messages.
	•	On success:
	•	Success screen: “Gmail connected ✅”
	•	Option: “Import last 30 days of emails” (default) or 90 days, or only new going forward.
	2.	Connect Messaging / Collab Channels
	•	Next screen: “Connect your messaging apps”
	•	Services shown with toggles:
	•	Slack
	•	Microsoft Teams
	•	WhatsApp Business
	•	Instagram DMs
	•	Facebook Messenger
	•	LinkedIn Messaging
	•	For each:
	•	“Connect” → OAuth / configuration → permissions summary.
	•	For any user not ready: “Skip for now” visible under each section.
	3.	Channel Sync Confirmation
	•	A status screen listing:
	•	Connected: Gmail, Slack, WhatsApp
	•	Not connected: Teams, LinkedIn, IG, FB
	•	Background tasks start:
	•	First-time sync (e.g., last 30 days messages).
	•	Aiva shows progress indicator (“Syncing in background – you can continue”).

2.2 Calendar Connections
	4.	Connect Calendar
	•	Step: “Let Aiva manage your schedule”
	•	Options:
	•	Connect Google Calendar
	•	Connect Outlook Calendar / Microsoft 365
	•	Connect via CalDAV / Apple (Phase 2)
	•	OAuth → user grants calendar read/write.
	5.	Calendar Preferences
	•	Confirm timezone & working hours (pre-filled from profile).
	•	Toggle:
	•	Allow Aiva to:
	•	✅ Suggest meeting times only
	•	✅ Create events after I confirm
	•	✅ Auto-create events when scheduling is explicit & simple (advanced, default off)
	•	Meeting defaults:
	•	Default meeting length: 30 / 45 / 60 min.
	•	Buffer: e.g., 15 mins before & after meetings.
	•	Max meetings per day.

⸻

3. AI Learning & Safety Setup

3.1 Tone Training (Optional but recommended)
	1.	Tone Training Screen
	•	Question: “Do you want Aiva to learn your writing style?”
	•	Options:
	•	“Yes, learn from my past replies”
	•	“No, just use default tone”
	•	If yes:
	•	Aiva samples X of user’s previous sent emails/messages (only metadata & aggregated style, no long-term raw storage needed from UX perspective).
	•	Shows progress: “Analysing your writing style… (~30–60 seconds)”
	•	Summary result:
	•	“You usually write: short, friendly, with casual greetings and quick sign-offs.”
	•	Let user adjust via sliders:
	•	Concise ↔ Detailed
	•	Casual ↔ Formal
	•	Emojis rarely ↔ Frequently
	2.	Signature & Identity
	•	User configures:
	•	Name and role (e.g., “Theo Lewis – Mortgage Broker, Oz Finance Solutions”).
	•	Email signature(s) per email account.
	•	Aiva will use appropriate signatures by channel.

3.2 Auto-Send Safety
	3.	Auto-Send Rules Setup
	•	A step explaining:
“Aiva can auto-send certain replies when it’s very confident. You stay in control.”
	•	Defaults:
	•	Initially, auto-send OFF.
	•	Options:
	•	Mode:
	•	“Review everything before sending” (default).
	•	“Allow Aiva to auto-send simple replies” (e.g. thanks, confirmations).
	•	If turned on:
	•	Show example: “Got it, thanks!” / “Thanks for sending this through – I’ll take a look and get back to you.”
	•	Options:
	•	Only to existing contacts.
	•	Never to new contacts.
	•	Never on social channels (email only) – can be toggled.

⸻

4. First-Time Dashboard Experience

Once onboarding is done, user lands in the main Aiva dashboard.

4.1 Unified Inbox Overview
	1.	Layout
	•	Left sidebar:
	•	Inbox
	•	Today
	•	Tasks
	•	Calendar
	•	Settings/Profile
	•	Secondary filter bar:
	•	All | Email | Slack | WhatsApp | LinkedIn | IG | FB | Teams
	•	Priority filter: High / Medium / Low / Noise
	•	Status filter: Unread | Action needed | Waiting | Done
	2.	Center panel: Message List
	•	Each message row shows:
	•	Contact name, channel icon, time.
	•	Priority tag (High in red, etc).
	•	Short snippet of message.
	•	Status indicator (AI thinks: “Action required”, “FYI”).
	3.	Right panel: Message details / AI actions
	•	When user selects a message:
	•	Full thread view.
	•	AI summary at top:
	•	“Summary: John is asking if you can meet Thursday 3pm.”
	•	“Detected actions: schedule meeting, confirm availability.”
	•	Buttons:
	•	“Draft reply with Aiva”
	•	“Mark as done”
	•	“Create task”
	•	“Schedule meeting”

4.2 First “Morning Briefing”

If first login is in morning, or next day:
	•	Aiva pops:
	•	“Good morning, Theo 👋”
	•	Today’s briefing:
	•	3 urgent messages needing replies.
	•	2 meetings scheduled.
	•	1 potential conflict flagged.
	•	4 tasks due this week.
	•	Action buttons:
	•	“Review urgent messages”
	•	“Review today’s schedule”
	•	“Skip briefing” (and don’t show again today).

⸻

5. Daily Use – Message Handling Flow

5.1 Triage Flow
	1.	User enters Inbox
	•	Aiva by default shows:
	•	“Important & Unread” filter.
	•	At top, a quick filter:
	•	“[ ] Show everything”
	•	“[✓] Show important only”
	2.	For each important message:
	•	Aiva displays inline chips:
	•	“Reply likely needed”
	•	“Schedule something”
	•	“FYI only”
	•	User can:
	•	Click “Reply with Aiva”
	•	Click “Schedule with Aiva”
	•	Click “Mark as done”

5.2 Drafting Replies with Aiva
	1.	Click “Draft with Aiva”
	•	Aiva:
	•	Pulls entire thread, relevant context across channels, & user tone.
	•	Generates draft message.
	•	UI shows:
	•	Draft text in a reply editor.
	•	AI summary of “Why this reply”:
“You previously agreed to send pricing. I’ve drafted a short reply with pricing link and invite to call.”
	2.	User actions:
	•	Accept draft and click “Send”.
	•	Edit text before sending.
	•	Request alternative: “Make it shorter”, “Make it more formal”, “Add more detail”.
	3.	Post-send handling
	•	Message status set to Done by default or Waiting on others if reply expects response.
	•	Aiva can auto-create a follow-up task:
	•	“If no reply in 3 days, remind me.”

5.3 Auto-Send in Action (After User Enables)

Once auto-send is enabled for simple replies:
	1.	Incoming simple message example:
	•	“Thanks Theo!”
	•	“Got it”
	•	“Can you confirm the booking for tomorrow at 10am?”
	2.	Aiva pipeline:
	•	Classifies as low-risk simple acknowledgement / confirmation.
	•	Checks:
	•	Sender matches rules (known contact).
	•	No contradictions with the schedule (if confirming meeting).
	•	Autogenerates reply and sends:
	•	“Thanks, looking forward to it!”
	•	“Yes, tomorrow at 10am works – see you then.”
	3.	User sees in “Recent activity”
	•	A small panel:
	•	“Aiva auto-sent 3 replies in the last hour.”
	•	Click to expand and review; user can thumbs-up/down to train future behaviour.

⸻

6. Scheduling & Calendar Flow

6.1 Scheduling from Messages
	1.	User gets a scheduling message
	•	Example email / DM:
	•	“Could we chat sometime Thursday afternoon or Friday morning about the loan options?”
	2.	Aiva detection
	•	Recognises scheduling intent.
	•	Extracts:
	•	Candidate days: Thursday, Friday.
	•	Preferred times: afternoon, morning.
	3.	Aiva checks calendar
	•	Finds user’s availability:
	•	Thursday: free slots 2–3pm, 4–5pm.
	•	Friday: free slots 9–10am, 11–12pm.
	•	Applies rules:
	•	Avoid back-to-back with 1h meeting?
	•	Respect buffers.
	4.	Aiva proposes reply
	•	Prepares draft:
“Thanks for reaching out! I’m free Thursday between 2–3pm or 4–5pm, and Friday between 9–10am or 11–12pm (AEST).
Let me know what works best and I’ll send a calendar invite.”
	5.	User Action
	•	Approves/edit the draft.
	•	Sends.
	6.	Upon Confirmation from Other Person
	•	Other side responds: “Let’s do Thursday at 2:30pm.”
	•	Aiva:
	•	Detects confirmation.
	•	Confirms no new conflicts.
	•	Creates event:
	•	Title: “Chat re: loan options with [Name]”.
	•	Time: Thursday 2:30–3:00pm (AEST).
	•	Attendees: user + contact email.
	•	Location: “Zoom” or user’s default meeting link.
	•	Drafts a confirmation message:
	•	“Great! I’ve sent a calendar invite for Thursday 2:30–3:00pm AEST. Looking forward to it.”

6.2 Conflict Detection & Resolution
	1.	User manually or AI tries to book a time that overlaps
	•	Aiva sees another meeting at 2:30–3pm same day.
	2.	Flow
	•	Aiva warns:
	•	“This time conflicts with XYZ meeting.”
	•	Options:
	•	Suggest alternative: “Propose 3:30–4pm instead.”
	•	Mark as tentative & notify user to manually resolve.
	•	Ask user: “Is it okay to move XYZ meeting to tomorrow at 3pm?” (if allowed).
	3.	User chooses action
	•	Aiva executes:
	•	Reschedules event.
	•	Sends explanation to affected parties with AI-drafted apology/notice if move is accepted.

6.3 Calendar View & Daily Planning
	1.	Calendar tab
	•	Displays a weekly view (day / week switch).
	•	Integration with tasks and messages:
	•	Tasks visible as all-day or time-blocks.
	•	Indicator on events: “Has prep notes” / “Has related email”.
	2.	Pre-meeting brief (Phase 2+)
	•	Clicking on an event or 10 minutes before:
	•	Aiva shows:
	•	Who is attending.
	•	Last few messages with them.
	•	Open tasks we need to address.
	•	Quick notes area.

⸻

7. Tasks & Follow-Up Flow
	1.	From messages
	•	Aiva: “I detected a task: ‘Send pricing by Friday’.”
	•	Suggest:
	•	Create task with title: “Send pricing to [Name]”.
	•	Due: Friday, 5pm AEST.
	•	User can accept or adjust.
	2.	Tasks tab
	•	List grouped by:
	•	Today, This week, Later.
	•	Each task:
	•	Title, due date, priority, related message link.
	•	User can:
	•	Mark complete.
	•	Snooze.
	•	Open linked message/thread.
	3.	Task reminders
	•	At start of day:
	•	“You have 3 tasks due today.”
	•	Before due time:
	•	Notification: “Task ‘Send contract to John’ is due in 30 minutes.”

⸻

8. Notifications & Multi-Device Flow
	1.	Web Notifications
	•	In-browser notifications when:
	•	New urgent messages.
	•	Upcoming meetings.
	•	Tasks due soon.
	•	Can be turned on/off per category.
	2.	Mobile App (or PWA)
	•	Push notifications:
	•	High priority messages.
	•	Daily briefing.
	•	Meeting reminders.
	3.	Email Summary (for meta)
	•	Daily or weekly summary:
	•	Summary of messages handled by Aiva.
	•	Time saved estimation.
	•	Auto-sent messages list.

⸻

9. Settings, Preferences & Management Flow
	1.	Profile Settings
	•	Change name, avatar, language, tone preferences.
	•	Update email signature.
	2.	Channels & Calendars
	•	See all connected accounts.
	•	Toggle sync on/off.
	•	Reconnect if tokens expired.
	•	Disconnect account (with clear explanation of effect).
	3.	AI Behaviour
	•	Auto-send toggle + thresholds.
	•	Per-channel rules:
	•	Email: allow auto-send simple replies.
	•	WhatsApp: draft only, manual send.
	•	Slack: allow auto-send for internal acknowledgements.
	•	Task extraction toggle.
	•	Scheduling behaviour:
	•	Ask always vs auto-create events for clear confirmations.
	4.	Privacy & Data
	•	Toggle:
	•	Allow training on my messages for tone and improvements (yes/no).
	•	Export my data.
	•	Delete account & data.
	5.	Team / Workspace (if applicable)
	•	Invite/remove members.
	•	Assign roles (Owner / Admin / Member).
	•	Shared inboxes (e.g., support@, info@) management.
	•	Central policies:
	•	Turn auto-send off globally.
	•	Require human review for external communication.

⸻

10. Billing & Plan Flow
	1.	Trial
	•	Typically 7–14 day free trial.
	•	Banner: “X days left in your trial – Upgrade to keep Aiva as your assistant.”
	2.	Upgrade
	•	Pricing page in-app.
	•	Plans:
	•	Solo / Pro / Team.
	•	Stripe/Payment screen.
	3.	Plan Management
	•	View current plan and usage.
	•	Add seats (team).
	•	Change card / cancel subscription.

⸻

11. Error Handling & Edge Case Flows
	1.	Integration Errors
	•	If Gmail/Outlook token expires:
	•	Banner: “We lost connection to Gmail. Click here to reconnect.”
	•	If an API returns an error:
	•	For message send: show “Sending failed, please try again.”
	•	Log error to AIActionLog & monitoring.
	2.	AI Failures
	•	If model times out or fails:
	•	Show a friendly message: “Aiva couldn’t generate this reply. Try again, or write manually.”
	•	Fallback to simple templates.
	3.	Conflict & Policy Violations
	•	If auto-send would violate user setting:
	•	Don’t send; log event.
	•	Maybe notify: “I prepared a reply but didn’t send it due to your settings.”

⸻

12. Offboarding / Account Deletion Flow
	1.	User initiates delete
	•	Settings → Privacy → “Delete my account & data.”
	•	Explain what will happen:
	•	All messages/summaries/tasks deleted from Aiva.
	•	External email/Slack accounts unaffected.
	2.	Confirmation
	•	Double-confirm: password + “Type DELETE to confirm.”
	3.	Execution
	•	Queued job deletes data in safe order (respecting legal retention if necessary).
	•	Final email confirming deletion (optional).

⸻
