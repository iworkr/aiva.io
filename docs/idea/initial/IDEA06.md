🔷 Gmail + Outlook Integration Playbook — Aiva.io Internal Specification

Last updated: v1.0
Coverage: Gmail (Google Workspace + personal Gmail) & Outlook (Microsoft 365 + Exchange Online via Microsoft Graph)

⸻

1. Goals of This Integration

Aiva needs to:

Capability	Gmail	Outlook
Read inbox messages	✔	✔
Fetch metadata	✔	✔
Fetch thread / conversation history	✔	Partial via Graph
Send replies	✔	✔
Draft replies (user review)	UI responsibility	UI responsibility
Auto-send replies	✔	✔
Detect unread / read status	✔	✔
Update read status	✔	✔
Create “Sent” items	✔	✔
Detect spam/Promotions/Social	✔ (labels)	Partial
Webhook new-message notifications	✔ (watch API)	✔ (subscription API)
Search	✔ (query)	✔ (OData filter)


⸻

2. Required Scopes (Least Privilege)

Gmail OAuth Scopes

We request the smallest scopes needed to operate:

Scope	Why
https://www.googleapis.com/auth/gmail.modify	Read, label, mark read, move, draft
https://www.googleapis.com/auth/gmail.send	Send + auto-send
https://www.googleapis.com/auth/userinfo.profile	Resolve sender name

We do NOT request gmail.readonly because sending & marking read require modify.

Outlook / Microsoft Graph OAuth Scopes

Scope	Why
Mail.ReadWrite	Read inbox, mark read/unread
Mail.Send	Send + auto-send
offline_access	Refresh token
User.Read	Profile info (display name, photo)

Do NOT request Calendar scopes during email onboarding — those are requested separately during calendar onboarding.

⸻

3. Token Storage & Security

Data	Storage
Access tokens	Encrypted at rest (AES-256)
Refresh tokens	Encrypted at rest, separate table + encryption key rotation
OAuth provider IDs	Stored in plaintext
Scopes	Stored in plaintext for debugging

	•	Tokens should never be sent to frontend or logs.
	•	Rotate encryption keys using key versioning (KMS or Vault recommended).

⸻

4. Message Sync Architecture

Ingestion Modes

Mode	Gmail	Outlook
Webhook / push	✔ (watch → history)	✔ (subscriptions)
Polling fallback	✔	✔

Sync Strategy

Never do full mailbox sync — too slow, too costly.
Instead:
	1.	On initial connect:
	•	Import last 30 days of messages (configurable: 7 / 30 / 90 days).
	2.	After initial sync:
	•	Subscribe to new-message notifications.
	3.	Periodic fallback job:
	•	Every 6 hours: resync last 72 hours for drift & webhook recovery.

Sync Rules

Action	Behavior
Incoming new message	Ingest + store message + thread mapping
Sent from Aiva	Store message + update thread
Manual send from Gmail/Outlook	Captured next webhook/poll sync
Delete in provider	Mark status = archived but do not delete from Aiva
Spam/Promotions	Mark category = Noise


⸻

5. Normalised Message Mapping

Aiva Normalised Email Object

Message {
  id
  provider_id
  provider = "gmail" | "outlook"
  thread_id (Aiva generated)
  external_thread_id (gmail threadId or conversationId)
  from { name, email }
  to { name, email }[]
  cc[] / bcc[]
  subject
  body_html
  body_text
  timestamp
  is_read
  is_sent_by_user
  labels[]
}

Key Notes
	•	Gmail threadId is stable.
	•	Outlook conversationId is not reliable for full threading → we map threads using subject + participants + 24h window fallback.

⸻

6. Sending Emails (Replies & New Messages)

Gmail Send APIs

POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
Raw MIME required

Outlook Send APIs

POST https://graph.microsoft.com/v1.0/me/sendMail
JSON payload supported

Implementation Rules
	•	Always include In-Reply-To and References headers for threading.
	•	Always send as REPLY when provider_id exists.
	•	For auto-send, check:
	•	User has allowed auto-send for email channel.
	•	Confidence > threshold.
	•	No pricing/legal/sensitive topic flags.

⸻

7. Marking Read / Unread

Provider	API
Gmail	Modify message → remove UNREAD label
Outlook	PATCH /messages/{id} body { "isRead": true }

Never modify read status until user takes action in Aiva or auto-send handles.

⸻

8. Thread Reconstruction Logic

Gmail
	•	Use Gmail threadId to fetch all messages in thread.
	•	Preserve order via timestamp.

Outlook

Use fallback sequence:
	1.	Attempt via conversationId
	2.	If fails:
	•	Match subject (strip “Re: / Fwd:” prefixes)
	•	Match participants
	•	Match within last 10 days

Thread Summaries
	•	Store compact thread summaries for fast UI load.
	•	Full content only fetched on demand when user expands.

⸻

9. Rate Limits & Backoff

Gmail
	•	RFC 4291 style soft limits → use exponential backoff.
	•	Strict daily quotas for end users (not Aiva).

Outlook
	•	Throttling returns 429 with Retry-After → respect strictly.
	•	Heavy syncing must go through delta queries — not full inbox scans.

Anti-Overload Rules
	•	Queue outgoing sends — never burst more than 6/min per account.
	•	Cap thread historics scanning to avoid O(∞) loops.

⸻

10. Error Handling & Recovery

Error Type	Action
Token expired	Attempt refresh → if fail → mark reconnect required
401 / 403	Disable sync + notify user with reconnect card
429	Backoff + retry after provider hint
5xx	Retry exponential
Message not found	Mark status = provider_removed

Provider Disconnect UX Triggers
	•	Banner: “Aiva lost access to Gmail/Outlook. Click to reconnect.”
	•	Messaging & auto-send pause automatically until fixed.

⸻

11. Auto-Send Safeguards (Email Edition)

Auto-send may only trigger when:
	•	Contact ≠ new contact
	•	Message classification = “simple acknowledgement” or “confirming”
	•	Thread ≠ pricing / contract / refund / negative feedback
	•	Confidence > user threshold (default 0.82)
	•	No scheduling ambiguity
	•	No attachments requested

Auto-send must not run if:
	•	Time > 9pm local time (unless overridden)
	•	Draft contains new promises
	•	Thread contains emotionally sensitive language

Logging (required):

AIActionLog {
  user_id,
  provider="gmail"|"outlook",
  message_id,
  action="auto-send",
  confidence_score,
  summary,
  timestamp
}


⸻

12. Testing Matrix (QA Checklist)

Scenario	Gmail	Outlook
First connect & initial 30-day import	✔	✔
Real-time webhook delivery	✔	✔
Fallback polling if webhook disabled	✔	✔
Reply to thread → appears threaded	✔	✔
Outlook conversation fallback thread	N/A	✔
Mark read in Aiva → reflected in inbox	✔	✔
Auto-send simple reply	✔	✔
Auto-send blocked due to sensitive content	✔	✔
Token renewal	✔	✔
Disconnect → reconnection banner	✔	✔


⸻

13. Monitoring & Alerting

Required Metrics
	•	Ingestion latency per provider
	•	Webhook success/failure
	•	Token refresh failure rate
	•	Auto-send success/failure
	•	New errors per provider per hour

Alert Thresholds

Event	Trigger
Webhook no events	30 min with 0 messages
>5% send failures	15 min window
Token refresh fails	3 attempts
429 spikes	20% in 5 min


⸻

14. Versioning Policy

Integration layer is versioned separately from product release:

gmail-integration-v1.0
outlook-integration-v1.0

Once stable:
	•	New features → v1.1
	•	Breaking changes → v2.0

⸻

15. Roadmap for Enhancements

Priority	Feature
High	Delta sync for Outlook to reduce overhead
Med	Offline send queue retry support
Med	Contact photos / signatures fetch
Low	Sentiment scoring using provider metadata


⸻

End of Playbook v1.0
