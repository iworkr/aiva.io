1. Product & Requirements Docs

1.1 Master PRD (Product Requirements Document)

Expand what we’ve done into a single “source of truth”:
	•	Problem statement & target personas.
	•	Feature list with must / should / could priorities.
	•	MVP scope vs Phase 2 vs Phase 3.
	•	Acceptance criteria per feature (what “done” actually means).
	•	Non-functional requirements: performance, reliability, uptime.

This is the doc PMs & devs argue over before writing code.

1.2 Use Case & User Story Catalog

For each major flow:
	•	User stories:
	•	“As a busy consultant, I want Aiva to propose times automatically so I don’t manually check my calendar.”
	•	Detailed flows + edge cases:
	•	“What if calendar returns error?”
	•	“What if user has no availability in requested window?”
	•	Permissions assumptions: which features require which scopes.

⸻

2. Architecture & Backend Docs

2.1 System Architecture Overview

A high-level doc with diagrams:
	•	Services: API gateway, integration service, messaging service, AI service, calendar service, tasks service, notification service, etc.
	•	Data flow: from provider → webhook/cron → integration service → DB → AI engine → UI.
	•	Multi-tenant model: how tenants are isolated, how workspace/user relationships are handled.
	•	Where AI calls happen and how you minimise token usage.

2.2 Database Schema & ERD

Fully spelled out:
	•	Tables/entities: User, Workspace, ChannelConnection, Message, Thread, CalendarConnection, Event, Task, AIActionLog, etc.
	•	Relationships + indices (e.g., what we index for fast search & filter).
	•	Soft delete vs hard delete policies.
	•	Migration strategy (tools, naming conventions, rollback approach).

2.3 API & Service Contracts

For internal and external APIs:
	•	REST/GraphQL endpoint spec:
	•	URL, method, request schema, response schema, error codes.
	•	Clear responsibilities per service (e.g., “Calendar service owns event creation, not messaging service”).
	•	Idempotency rules (e.g., webhook replays).
	•	Versioning strategy: /v1, changelog.

⸻

3. Integration Playbooks (VERY important for Aiva)

3.1 Provider Integration Guides

One doc per platform:
	•	Gmail:
	•	Scopes requested, OAuth setup, token storage, rate limits.
	•	How we handle history sync vs new messages.
	•	Outlook/Microsoft 365 / Graph
	•	Slack (events vs Web API, bot install steps, workspace-level permissions).
	•	Teams / LinkedIn / WhatsApp / Instagram / Facebook:
	•	API limitations, special constraints (WhatsApp templates, IG biz requirements).
	•	Google/Outlook Calendar:
	•	How we handle recurring events, time zones, meeting links.

Each playbook should cover:
	•	Setup steps (dev keys, sandbox tenants).
	•	Data model mapping: provider fields → our normalized Message / Event.
	•	Webhook/event flows vs polling strategy.
	•	Error handling: typical provider errors and how to respond.
	•	Rate limit strategy (backoff, queueing).

3.2 Permissions & Scope Rationale

A doc that explains:
	•	Exactly which scopes we require and why (for security reviews & app store approvals).
	•	Which features depend on which scope (e.g., if user denies “send mail” we only draft, not send).

⸻

4. AI / ML Documentation

4.1 AI Feature Specs

One per major AI capability:
	•	Classification & prioritisation
	•	Summarisation (threads, daily briefing)
	•	Reply drafting
	•	Scheduling intent detection
	•	Task extraction

Each should specify:
	•	Inputs: which fields from Message/Thread/Event.
	•	Outputs: priority enum, categories, suggested actions, etc.
	•	Prompt formats/examples.
	•	When we call which model (cheap vs expensive).
	•	Constraints (max tokens, timeouts).

4.2 Prompt Library & Style Guidelines

Centralised prompt repo:
	•	Base system prompts for:
	•	Email reply.
	•	Slack response.
	•	WhatsApp DM.
	•	Scheduling negotiation.
	•	Channel-specific tone guidelines (WhatsApp vs LinkedIn vs email).
	•	Do/Don’t rules:
	•	Don’t promise things we don’t know.
	•	Don’t change pricing/terms.
	•	Never share internal tokens/IDs.

4.3 Auto-Send Safety Policy

Separate doc that devs + product respect:
	•	What qualifies as “simple / low-risk” message?
	•	Rules for enabling auto-send (e.g., after X successful drafts for that user).
	•	Confidence thresholds and fallback behaviour.
	•	Audit logging requirements for any auto-sent message.
	•	How users can review/flag/undo.

⸻

5. Frontend & UX Docs

5.1 Design System & Component Library
	•	Design tokens: colours, typography, spacing.
	•	Standard components:
	•	Message list item.
	•	Thread view.
	•	AI suggestion bar.
	•	Calendar widget.
	•	Task chip.
	•	UX patterns:
	•	How we show AI suggestions.
	•	How we surface errors/warnings.
	•	Loading states & skeletons.

5.2 UX Flows / Wireframes

We’ve described flows in text; now:
	•	Figma (or similar) flows for:
	•	Onboarding.
	•	Connecting channels.
	•	Drafting & sending replies.
	•	Scheduling from a message.
	•	Auto-send review page.
	•	Tasks view.
	•	Edge case screens:
	•	No channels connected.
	•	No messages for filter.
	•	Calendar access revoked.

5.3 UX Copy & Microcopy Guide
	•	Consistent phrasing for AI-related things:
	•	“Aiva suggests…” vs “AI says…”
	•	Tone: friendly, clear, non-technical.
	•	Error messages that are actionable, not cryptic.
	•	Legal/privacy-sensitive copy for permissions and AI usage.

⸻

6. Security, Privacy & Compliance Docs

6.1 Security Architecture Doc
	•	How auth works (JWT, sessions, SSO).
	•	Data-at-rest and in-transit encryption strategies.
	•	Secrets management (where keys and tokens live).
	•	Least-privilege models for services.
	•	Access control model: who can see what in multi-user workspaces.

6.2 Data Governance & Retention Policy
	•	What data we store long-term (full content vs summaries vs metadata).
	•	How users can export/delete data (for GDPR-like compliance).
	•	Retention windows for logs, AI traces, etc.
	•	Backups and restore processes.

6.3 Threat Model & Abuse Cases
	•	Possible threats:
	•	Account takeover.
	•	Abuse of auto-send to spam contacts.
	•	Rogue integration (compromised Slack workspace).
	•	Mitigations & checks:
	•	2FA.
	•	Unusual send volume alerts.
	•	IP / device heuristics.

⸻

7. Observability, Testing & Ops

7.1 Logging & Monitoring Spec
	•	What events must be logged (user actions, AI actions, integration errors, send failures).
	•	PII-safe logging patterns.
	•	Metrics to track:
	•	Ingestion latency.
	•	AI call failures.
	•	Auto-send volume & error rate.
	•	Integration health per provider.
	•	Dashboards & alerts:
	•	Sync failures per provider spike.
	•	500 error rate on APIs.
	•	Abnormal drop in messages processed.

7.2 Testing Strategy & QA Plan
	•	Levels of testing:
	•	Unit tests per service.
	•	Integration tests with mocked providers.
	•	End-to-end tests (Cypress/Playwright).
	•	AI behaviour tests (prompt regression tests where possible).
	•	Test environments:
	•	Staging vs production.
	•	Sample data / fixtures for:
	•	Messages (different channels).
	•	Events.
	•	Edge cases (weird characters, giant threads).

7.3 Runbooks & Incident Response
	•	Runbooks for:
	•	“Gmail integration down”.
	•	“WhatsApp API rate limited”.
	•	“AI provider failing”.
	•	Incident steps:
	•	Triage → rollback / degrade gracefully → comms to users.
	•	Templates for status page updates & customer comms.

⸻

8. Dev Workflow & Repo Hygiene

8.1 Contribution Guide (CONTRIBUTING.md)
	•	Branch naming, PR process.
	•	Code review expectations.
	•	Commit message conventions.
	•	How to run the app locally (dev env setup).

8.2 Coding Standards & Patterns
	•	Language-specific guidelines (TS/Node or C#).
	•	Error handling & result types.
	•	How to call AI services (central client, not ad-hoc everywhere).
	•	How to write migrations.

8.3 Environment & Deployment Docs
	•	Dev/staging/prod environment variables & secrets.
	•	CI/CD pipeline overview.
	•	Release process (feature flags? canary releases?).

⸻

9. Business & GTM Supporting Docs

Not strictly dev, but makes the product coherent:
	•	Pricing & Limits Spec:
	•	Plans, AI usage limits, number of connected channels, message limits.
	•	Feature Flag Matrix:
	•	Which features are on/off per plan.
	•	Roadmap & Prioritisation doc:
	•	What’s in MVP, what’s explicitly not.

⸻

10. Aiva-Specific “Playbooks”

Because this product is opinionated, a few special ones:
	1.	“How Aiva Decides What’s Important”
	•	Rules + ML signals that define priority.
	•	This informs both dev and support when users ask “Why did Aiva mark this as low?”.
	2.	Scheduling Logic Playbook
	•	Exact decision tree for:
	•	Suggesting time slots.
	•	Handling time zones.
	•	Managing buffers & max meetings.
	•	What happens when everything is full.
	3.	Trust & Transparency Playbook
	•	Guidelines for:
	•	Showing AI rationale (“Because of X, I did Y”).
	•	When to ask for confirmation vs acting autonomously.
	•	UI affordances for undoing/overriding Aiva.

⸻