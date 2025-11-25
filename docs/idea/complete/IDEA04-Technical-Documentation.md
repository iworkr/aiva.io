# Aiva.io - Technical Documentation Plan

## Overview

This document outlines the technical documentation structure for Aiva.io, organized to leverage **Nextbase Ultimate** patterns and architecture. All documentation should reference Nextbase components, patterns, and best practices.

## 1. Product & Requirements Docs

### 1.1 Master PRD (Product Requirements Document)
**Location**: `docs/idea/complete/IDEA02-Product-Requirements.md`

**Contents**:
- Problem statement & target personas
- Feature list with must / should / could priorities
- MVP scope vs Phase 2 vs Phase 3
- Acceptance criteria per feature
- Non-functional requirements: performance, reliability, uptime

**Nextbase Integration**:
- Reference workspace-scoped features
- Use Nextbase authentication patterns
- Leverage Nextbase billing integration

### 1.2 Use Case & User Story Catalog
**Location**: `docs/idea/complete/IDEA03-User-Flows.md`

**For each major flow**:
- User stories: "As a busy consultant, I want Aiva to propose times automatically..."
- Detailed flows + edge cases
- Permissions assumptions: which features require which scopes
- Nextbase component references

## 2. Architecture & Backend Docs

### 2.1 System Architecture Overview
**Location**: `docs/architecture.md` (extend existing)

**High-level doc with diagrams**:
- Services: API gateway (Next.js routes), integration service, messaging service, AI service, calendar service, tasks service, notification service
- Data flow: Provider → webhook/cron → integration service → Supabase DB → AI engine → UI
- Multi-tenant model: Workspace isolation using Nextbase patterns
- AI call optimization: Minimize token usage

**Nextbase Components**:
- Reference `src/app/api/` for API routes
- Reference `src/data/` for Server Actions
- Reference `src/supabase-clients/` for database access
- Reference workspace RLS patterns

### 2.2 Database Schema & ERD
**Location**: `docs/database-schema.md` (extend existing)

**Fully spelled out**:
- Tables/entities: User, Workspace, ChannelConnection, Message, Thread, CalendarConnection, Event, Task, AIActionLog
- Relationships + indices
- Soft delete vs hard delete policies
- Migration strategy (Nextbase migration patterns)

**Nextbase Patterns**:
- All tables workspace-scoped
- RLS policies on all tables
- Use existing helper functions (`is_workspace_member`, `is_workspace_admin`)
- Follow Nextbase migration naming: `YYYYMMDDHHMMSS_description.sql`

### 2.3 API & Service Contracts
**Location**: `docs/api.md` (extend existing)

**For internal and external APIs**:
- REST endpoint spec: URL, method, request schema, response schema, error codes
- Server Actions: Input/output types, validation schemas
- Clear responsibilities per service
- Idempotency rules (webhook replays)
- Versioning strategy: `/v1`, changelog

**Nextbase Patterns**:
- Use `authActionClient` for protected actions
- Use `adminActionClient` for admin actions
- Zod schemas for validation
- Type-safe Server Actions

## 3. Integration Playbooks

### 3.1 Provider Integration Guides
**Location**: `docs/integrations/`

**One doc per platform**:
- Gmail: Scopes, OAuth setup, token storage, rate limits
- Outlook/Microsoft 365 / Graph
- Slack (events vs Web API, bot install steps)
- Teams / LinkedIn / WhatsApp / Instagram / Facebook
- Google/Outlook Calendar

**Each playbook covers**:
- Setup steps (dev keys, sandbox tenants)
- Data model mapping: provider fields → normalized Message / Event
- Webhook/event flows vs polling strategy
- Error handling: typical provider errors
- Rate limit strategy (backoff, queueing)

**Nextbase Integration**:
- OAuth via Supabase Auth
- Token storage in `channel_connections` table (encrypted)
- Webhook processing via Supabase Edge Functions
- Workspace-scoped storage

### 3.2 Permissions & Scope Rationale
**Location**: `docs/integrations/permissions.md`

**Explains**:
- Exactly which scopes required and why
- Which features depend on which scope
- Security review considerations
- App store approval requirements

## 4. AI / ML Documentation

### 4.1 AI Feature Specs
**Location**: `docs/ai/`

**One per major AI capability**:
- Classification & prioritization
- Summarization (threads, daily briefing)
- Reply drafting
- Scheduling intent detection
- Task extraction

**Each specifies**:
- Inputs: which fields from Message/Thread/Event
- Outputs: priority enum, categories, suggested actions
- Prompt formats/examples
- When to call which model (cheap vs expensive)
- Constraints (max tokens, timeouts)

**Nextbase Integration**:
- Server Actions for AI calls
- Store results in workspace-scoped tables
- Log actions in `ai_action_logs` table

### 4.2 Prompt Library & Style Guidelines
**Location**: `docs/ai/prompts.md` (see IDEA07)

**Centralized prompt repo**:
- Base system prompts for: Email reply, Slack response, WhatsApp DM, Scheduling negotiation
- Channel-specific tone guidelines
- Do/Don't rules
- Versioning policy

**Implementation**:
- Store prompts in `src/ai/prompts/`
- Reference from AI Orchestration Service
- Version control prompts

### 4.3 Auto-Send Safety Policy
**Location**: `docs/ai/auto-send-safety.md`

**Separate doc that devs + product respect**:
- What qualifies as "simple / low-risk" message?
- Rules for enabling auto-send
- Confidence thresholds and fallback behavior
- Audit logging requirements
- How users can review/flag/undo

**Nextbase Integration**:
- Store auto-send rules in `workspace_settings`
- Log all auto-sends to `ai_action_logs`
- Use Server Actions for send operations

## 5. Frontend & UX Docs

### 5.1 Design System & Component Library
**Location**: `docs/frontend/design-system.md`

**Design tokens**:
- Colors, typography, spacing (Tailwind CSS)
- Standard components (shadcn/ui):
  - Message list item
  - Thread view
  - AI suggestion bar
  - Calendar widget
  - Task chip

**UX patterns**:
- How to show AI suggestions
- How to surface errors/warnings
- Loading states & skeletons

**Nextbase Components**:
- Use `src/components/ui/` for base components
- Follow Nextbase component patterns
- Server Components for data display
- Client Components for interactivity

### 5.2 UX Flows / Wireframes
**Location**: `docs/frontend/flows.md`

**Figma (or similar) flows for**:
- Onboarding
- Connecting channels
- Drafting & sending replies
- Scheduling from message
- Auto-send review page
- Tasks view

**Edge case screens**:
- No channels connected
- No messages for filter
- Calendar access revoked

### 5.3 UX Copy & Microcopy Guide
**Location**: `docs/frontend/copy-guide.md`

**Consistent phrasing**:
- "Aiva suggests…" vs "AI says…"
- Tone: friendly, clear, non-technical
- Error messages that are actionable
- Legal/privacy-sensitive copy

## 6. Security, Privacy & Compliance Docs

### 6.1 Security Architecture Doc
**Location**: `docs/security/architecture.md`

**How auth works**:
- Supabase Auth (JWT, sessions, SSO)
- Workspace-based access control
- RLS policies for data isolation

**Data security**:
- Encryption at rest (Supabase)
- Encryption in transit (HTTPS/TLS)
- Secrets management (environment variables)

**Access control**:
- Multi-tenant isolation (workspace-scoped)
- Role-based permissions (workspace roles)
- Least-privilege models

**Nextbase Patterns**:
- Reference `docs/features/authentication.md`
- Reference `docs/features/workspaces.md`
- Use existing RLS helper functions

### 6.2 Data Governance & Retention Policy
**Location**: `docs/security/data-governance.md`

**What data we store**:
- Full content vs summaries vs metadata
- Retention windows for logs, AI traces
- Backups and restore processes

**User rights**:
- Export data (GDPR compliance)
- Delete data (cascade deletes)
- Right to be forgotten

**Nextbase Integration**:
- Workspace-scoped data deletion
- Cascade delete patterns
- Data export utilities

### 6.3 Threat Model & Abuse Cases
**Location**: `docs/security/threat-model.md`

**Possible threats**:
- Account takeover
- Abuse of auto-send to spam contacts
- Rogue integration (compromised Slack workspace)

**Mitigations**:
- 2FA (Supabase Auth)
- Unusual send volume alerts
- IP / device heuristics
- Rate limiting

## 7. Observability, Testing & Ops

### 7.1 Logging & Monitoring Spec
**Location**: `docs/operations/logging.md`

**What events must be logged**:
- User actions
- AI actions
- Integration errors
- Send failures

**PII-safe logging patterns**:
- Don't log message content
- Log message IDs and metadata only
- Mask sensitive data

**Metrics to track**:
- Ingestion latency
- AI call failures
- Auto-send volume & error rate
- Integration health per provider

**Dashboards & alerts**:
- Sync failures per provider spike
- 500 error rate on APIs
- Abnormal drop in messages processed

**Nextbase Integration**:
- Use Supabase logging
- Sentry for error tracking
- PostHog for analytics

### 7.2 Testing Strategy & QA Plan
**Location**: `docs/testing/strategy.md`

**Levels of testing**:
- Unit tests (Vitest) for utilities
- Integration tests with mocked providers
- End-to-end tests (Playwright)
- AI behavior tests (prompt regression tests)

**Test environments**:
- Staging vs production
- Sample data / fixtures

**Nextbase Patterns**:
- Reference `docs/testing.md`
- Use existing test helpers
- Follow Playwright patterns

### 7.3 Runbooks & Incident Response
**Location**: `docs/operations/runbooks.md`

**Runbooks for**:
- "Gmail integration down"
- "WhatsApp API rate limited"
- "AI provider failing"

**Incident steps**:
- Triage → rollback / degrade gracefully → comms to users
- Templates for status page updates & customer comms

## 8. Dev Workflow & Repo Hygiene

### 8.1 Contribution Guide
**Location**: `docs/contributing.md`

**Branch naming, PR process**:
- Follow Nextbase patterns
- Code review expectations
- Commit message conventions
- How to run app locally

### 8.2 Coding Standards & Patterns
**Location**: `.cursor/rules/` (existing)

**Language-specific guidelines**:
- TypeScript strict mode
- Error handling & result types
- How to call AI services (central client)
- How to write migrations

**Nextbase Patterns**:
- Server Components by default
- Server Actions for mutations
- Zod validation
- RLS policies

### 8.3 Environment & Deployment Docs
**Location**: `docs/environment-variables.md`, `docs/deployment.md`

**Environment variables**:
- Dev/staging/prod secrets
- Supabase configuration
- AI provider keys

**CI/CD pipeline**:
- GitHub Actions / Vercel
- Release process
- Feature flags

## 9. Business & GTM Supporting Docs

### 9.1 Pricing & Limits Spec
**Location**: `docs/business/pricing.md`

**Plans**:
- Solo / Pro / Team
- AI usage limits
- Number of connected channels
- Message limits

**Feature Flag Matrix**:
- Which features on/off per plan
- Workspace type restrictions

**Nextbase Integration**:
- Use Nextbase Stripe billing
- Reference `docs/features/billing.md`

### 9.2 Roadmap & Prioritization
**Location**: `docs/business/roadmap.md`

**What's in MVP**:
- Core integrations
- Basic AI features
- Simple scheduling

**What's explicitly not**:
- Advanced analytics (Phase 2)
- Team features (Phase 3)
- Voice interface (Phase 3)

## 10. Aiva-Specific "Playbooks"

### 10.1 "How Aiva Decides What's Important"
**Location**: `docs/ai/priority-logic.md`

**Rules + ML signals**:
- Priority scoring algorithm
- Category detection
- Sentiment analysis
- Actionability scoring

**Informs**:
- Dev implementation
- Support responses to "Why did Aiva mark this as low?"

### 10.2 Scheduling Logic Playbook
**Location**: `docs/ai/scheduling-logic.md` (see IDEA06)

**Exact decision tree**:
- Suggesting time slots
- Handling time zones
- Managing buffers & max meetings
- What happens when everything is full

### 10.3 Trust & Transparency Playbook
**Location**: `docs/ai/trust-transparency.md`

**Guidelines for**:
- Showing AI rationale ("Because of X, I did Y")
- When to ask for confirmation vs acting autonomously
- UI affordances for undoing/overriding Aiva

---

**Built on Nextbase Ultimate** - All technical documentation references Nextbase patterns, components, and best practices for consistency and maintainability.

