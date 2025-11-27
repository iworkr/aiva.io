# Aiva.io Architecture Overview

**Visual Guide for Developers** | Last Updated: November 25, 2025

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  Next.js 15 + React 19 + TypeScript + Tailwind + shadcn/ui │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│ ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│ │   Server    │  │   Client     │  │   Middleware      │  │
│ │  Components │  │  Components  │  │   (Auth, RLS)     │  │
│ └─────────────┘  └──────────────┘  └───────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │            Server Actions (next-safe-action)           │ │
│ │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐ │ │
│ │  │  Auth   │ │  User   │ │  Admin   │ │  Anonymous │ │ │
│ │  └─────────┘ └─────────┘ └──────────┘ └────────────┘ │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────────────────┐
│                    DATA & SERVICES LAYER                      │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│ │   Supabase   │  │   Stripe     │  │   OpenAI API     │   │
│ │  (Database)  │  │  (Billing)   │  │  (AI Features)   │   │
│ └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
│ ┌──────────────────────────────────────────────────────┐    │
│ │              External Integrations                    │    │
│ │  Gmail | Outlook | Slack | Teams | WhatsApp | etc.   │    │
│ └──────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Security Layers                       │
└────────────────────────────────────────────────────────┘

Layer 1: Authentication (Supabase Auth)
├─ Email/Password
├─ Magic Links
├─ OAuth (Google, GitHub, etc.)
└─ Session Management

Layer 2: Authorization (Middleware)
├─ Route Protection
├─ Workspace Membership Checks
└─ Role-Based Access (Owner, Admin, Member, Readonly)

Layer 3: Row-Level Security (RLS Policies)
├─ Workspace Isolation
├─ User-Scoped Data
└─ Helper Functions (is_workspace_member, is_workspace_admin)

Layer 4: Application Logic (Server Actions)
├─ Input Validation (Zod)
├─ Business Logic Checks
├─ Plan-Based Feature Gates
└─ Audit Logging

Layer 5: Plan-Based Feature Gating
├─ Free Plan (No AI features)
├─ Basic Plan (Basic AI, no drafts/auto-response)
├─ Pro Plan (Full AI features)
└─ Enterprise Plan (Pro + advanced features)
```

---

## 📊 Data Flow

### User Action → Database

```
1. User Interaction (Client Component)
   └─> onClick handler triggered
       │
2. Call Server Action (next-safe-action)
   └─> Execute server-side function
       │
3. Authentication Check (authActionClient)
   └─> Verify user session
       │
4. Authorization Check (Server Action)
   └─> Verify workspace membership
   └─> Check plan-based feature access
       │
5. Input Validation (Zod)
   └─> Validate and parse input
       │
6. Database Operation (Supabase Client)
   └─> INSERT/UPDATE/DELETE/SELECT
       │
7. RLS Policy Check (PostgreSQL)
   └─> Verify row-level permissions
       │
8. Return Result
   └─> Success: return data
   └─> Error: throw error with message
       │
9. Client Handling (useAction hook)
   └─> onSuccess: Update UI, show toast
   └─> onError: Display error message
       │
10. Revalidation (Next.js)
    └─> revalidatePath() updates cached data
```

### AI Feature Flow

```
User → AI Feature Request
  │
  ├─> 1. Client Hook: useFeatureAccess(workspaceId, FeatureFlag)
  │   └─> UI: Show "Pro Feature" badge if no access
  │
  ├─> 2. Server Action: generateReplyDraft(messageId, workspaceId)
  │   └─> Check: getHasFeature(workspaceId, FeatureFlag.AiDrafts)
  │   └─> If no access: throw Error('Pro feature')
  │   └─> If has access: continue
  │
  ├─> 3. OpenAI API Call
  │   └─> Generate AI response
  │
  ├─> 4. Store Draft in Database
  │   └─> RLS: Verify workspace_id matches user's workspace
  │
  └─> 5. Log AI Action
      └─> Track usage, tokens, confidence, etc.
```

---

## 🗄️ Database Schema (Key Tables)

```
users (Supabase Auth)
  ├─ id (uuid, PK)
  ├─ email
  ├─ encrypted_password
  └─ user_metadata (JSONB)

workspaces
  ├─ id (uuid, PK)
  ├─ name
  ├─ slug (unique)
  ├─ created_by (FK → users)
  └─ RLS: workspace members only

workspace_members
  ├─ workspace_id (FK → workspaces)
  ├─ user_id (FK → users)
  ├─ role (owner|admin|member|readonly)
  └─ RLS: workspace members only

subscriptions
  ├─ id (uuid, PK)
  ├─ workspace_id (FK → workspaces)
  ├─ billing_product_id (FK → billing_products)
  ├─ status (active|canceled|past_due)
  └─ RLS: workspace members only

billing_products
  ├─ id (uuid, PK)
  ├─ name (Free|Basic|Pro|Enterprise)
  ├─ price
  └─ active

channel_connections
  ├─ id (uuid, PK)
  ├─ workspace_id (FK → workspaces)
  ├─ provider (gmail|outlook|slack|etc.)
  ├─ access_token (encrypted)
  ├─ status (active|error|syncing)
  └─ RLS: workspace members only

messages
  ├─ id (uuid, PK)
  ├─ workspace_id (FK → workspaces)
  ├─ channel_connection_id (FK → channel_connections)
  ├─ provider_message_id
  ├─ subject, body, sender_email
  ├─ priority, category, sentiment (AI-generated)
  └─ RLS: workspace members only

calendar_connections
  ├─ id (uuid, PK)
  ├─ workspace_id (FK → workspaces)
  ├─ provider (aiva|google_calendar|outlook_calendar|apple_calendar)
  ├─ status (active|error)
  └─ RLS: workspace members only

events
  ├─ id (uuid, PK)
  ├─ workspace_id (FK → workspaces)
  ├─ calendar_connection_id (FK → calendar_connections)
  ├─ title, description, location
  ├─ start_time, end_time
  ├─ is_all_day, is_recurring
  └─ RLS: workspace members only

ai_action_logs
  ├─ id (uuid, PK)
  ├─ workspace_id (FK → workspaces)
  ├─ user_id (FK → users)
  ├─ action_type (reply_draft|classification|etc.)
  ├─ model_used, tokens, confidence_score
  └─ RLS: workspace members only
```

---

## 🎯 Plan-Based Feature Matrix

```
┌──────────────────┬──────┬───────┬─────┬────────────┐
│     Feature      │ Free │ Basic │ Pro │ Enterprise │
├──────────────────┼──────┼───────┼─────┼────────────┤
│ Workspaces       │  1   │   1   │  1  │     ∞      │
│ Channels         │  0   │   3   │  ∞  │     ∞      │
│ Messages/month   │  0   │ 1,000 │  ∞  │     ∞      │
│ Auto-classify    │  ❌  │   ✅  │  ✅ │     ✅     │
│ Deep search      │  ❌  │   ✅  │  ✅ │     ✅     │
│ Calendar extract │  ❌  │   ✅  │  ✅ │     ✅     │
│ AI drafts        │  ❌  │   ❌  │  ✅ │     ✅     │
│ Auto-responses   │  ❌  │   ❌  │  ✅ │     ✅     │
│ Custom prompts   │  ❌  │   ❌  │  ✅ │     ✅     │
│ Team members     │  ❌  │   ❌  │  5  │     ∞      │
│ SSO              │  ❌  │   ❌  │  ❌ │     ✅     │
│ API access       │  ❌  │   ❌  │  ❌ │     ✅     │
└──────────────────┴──────┴───────┴─────┴────────────┘

Implementation:
├─ Enum: src/utils/subscriptions.ts (PlanType, FeatureFlag)
├─ Server: src/rsc-data/user/subscriptions.ts
├─ Actions: src/data/user/subscriptions.ts
├─ Client: src/components/ProFeatureGate.tsx
└─ Pricing: src/data/anon/pricing.ts
```

---

## 🔄 Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│          Integration Configuration                   │
│         (src/lib/integrations/config.ts)            │
└─────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │  Email  │    │Messaging│    │ Social  │
   │ Gmail   │    │  Slack  │    │Instagram│
   │ Outlook │    │  Teams  │    │LinkedIn │
   └─────────┘    │WhatsApp │    │    X    │
                  │Telegram │    └─────────┘
                  └─────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
         ┌───────────────────────────────┐
         │   channel_connections table   │
         │   (OAuth tokens, status)      │
         └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │      messages table           │
         │   (Unified message storage)   │
         └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   AI Processing (optional)    │
         │  - Classification             │
         │  - Priority                   │
         │  - Sentiment                  │
         │  - Reply drafts (Pro+)        │
         └───────────────────────────────┘

Integration Status:
├─ Available: Gmail, Outlook, Shopify
└─ Coming Soon: All others (OAuth pending)
```

---

## 📅 Calendar Architecture

```
┌──────────────────────────────────────────────┐
│         Calendar Connections                  │
└──────────────────────────────────────────────┘
           │
     ┌─────┴─────┬─────────┬─────────┐
     ▼           ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌────────┐ ┌────────┐
│  Aiva   │ │ Google  │ │Outlook │ │ Apple  │
│Calendar │ │Calendar │ │Calendar│ │Calendar│
│(Built-in)│ │  (API)  │ │  (API) │ │  (API) │
└─────────┘ └─────────┘ └────────┘ └────────┘
     │           │         │         │
     └───────────┴─────────┴─────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │       events table          │
    │  - Single-day events        │
    │  - Multi-day events         │
    │  - Recurring events         │
    │  - All-day events           │
    └─────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │   Calendar Rendering        │
    │  - Day view                 │
    │  - Week view                │
    │  - Month view               │
    │  - Agenda view              │
    └─────────────────────────────┘

Multi-Day Event Rendering:
Each day column renders event segment for that day only
├─ Calculate visible portion: max(eventStart, dayStart) → min(eventEnd, dayEnd)
├─ Position: percentage of day (0-100%)
└─ Absolute positioning within day column

Example: Mon 2pm → Wed 10am
├─ Monday:   2pm-11:59pm (58.33% → 100%)
├─ Tuesday:  12am-11:59pm (0% → 100%)
└─ Wednesday: 12am-10am (0% → 41.67%)
```

---

## 🎨 Theme System

```
┌─────────────────────────────────────────────┐
│         CSS Variables (globals.css)          │
│         OKLCH Color Space                    │
└─────────────────────────────────────────────┘
                    │
     ┌──────────────┴──────────────┐
     ▼                             ▼
┌──────────┐                  ┌──────────┐
│   Light  │                  │   Dark   │
│   Mode   │                  │   Mode   │
└──────────┘                  └──────────┘
     │                             │
     │  Primary: #5CE65C           │
     │  oklch(0.60 0.20 138)       │
     │                             │  Primary: #5CE65C
     │                             │  oklch(0.75 0.22 138)
     └─────────────┬───────────────┘
                   ▼
     ┌─────────────────────────────┐
     │   All Components Inherit    │
     │  - Buttons                  │
     │  - Badges                   │
     │  - Links                    │
     │  - Focus rings              │
     │  - Hover states             │
     └─────────────────────────────┘

Hover Pattern:
background: primary/5 (5% opacity)
border: primary/30 (30% opacity)
transition: 200ms ease
```

---

## 🚦 Request Flow Example: Create Event

```
User clicks "Create Event" button
  │
  ▼
1. Client Component (CreateEventDialog.tsx)
   └─> Form submit with react-hook-form + Zod validation
       │
  ▼
2. Server Action (src/data/user/calendar.ts: createEventAction)
   └─> authActionClient verifies authentication
   └─> schema validates input (Zod)
       │
  ▼
3. Authorization Checks
   └─> isWorkspaceMember(userId, workspaceId)
   └─> If no calendar connection: create Aiva Calendar default
       │
  ▼
4. Map CamelCase → Snake_case
   └─> eventData.startTime → start_time
   └─> eventData.endTime → end_time
   └─> (Database uses snake_case)
       │
  ▼
5. Database Insert (Supabase)
   └─> INSERT INTO events (workspace_id, start_time, end_time, ...)
       │
  ▼
6. RLS Policy Check (PostgreSQL)
   └─> Verify: auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = events.workspace_id)
       │
  ▼
7. Success Response
   └─> Return inserted event data
   └─> revalidatePath('/calendar')
       │
  ▼
8. Client Updates (useAction hook)
   └─> onSuccess: Close dialog, show toast
   └─> UI automatically re-renders with new data
```

---

## 🔍 Component Hierarchy

```
App Router Layout
├─ RootLayout (src/app/layout.tsx)
│  ├─ Providers (Theme, React Query)
│  └─ Fonts, Metadata
│
├─ Locale Layout (src/app/[locale]/layout.tsx)
│  └─ Internationalization
│
└─ Dynamic Pages
   ├─ Marketing (Public)
   │  ├─ Landing Page
   │  ├─ Pricing
   │  ├─ Blog
   │  └─ Changelog
   │
   └─ Authenticated Pages
      ├─ Middleware (Auth Check)
      │
      ├─ Application Layout
      │  ├─ Sidebar (@sidebar slot)
      │  │  ├─ Workspace Selector
      │  │  ├─ Navigation Menu
      │  │  ├─ Integrations Link
      │  │  └─ User Profile Dropdown
      │  │
      │  └─ Main Content
      │     ├─ Navbar (Page Title)
      │     └─ Page Content
      │
      └─ Pages
         ├─ Dashboard (/)
         ├─ Inbox (/inbox)
         ├─ Calendar (/calendar)
         ├─ Channels (/channels)
         ├─ Contacts (/contacts)
         ├─ Settings (/settings)
         └─ Integrations (/integrations)
```

---

## 📦 Module Organization

```
src/
├─ app/                    # Next.js App Router
│  ├─ api/                # API routes
│  ├─ [locale]/           # Internationalized pages
│  └─ layout.tsx          # Root layout
│
├─ components/            # React components
│  ├─ ui/                # shadcn/ui primitives
│  ├─ calendar/          # Calendar components
│  ├─ inbox/             # Inbox components
│  ├─ integrations/      # Integration components
│  ├─ settings/          # Settings components
│  └─ ...                # Other feature components
│
├─ data/                 # Server Actions (next-safe-action)
│  ├─ admin/            # Admin-only actions
│  ├─ anon/             # Public actions
│  ├─ auth/             # Auth actions
│  └─ user/             # User-scoped actions
│
├─ rsc-data/            # React Server Component data fetching
│  └─ user/             # User-scoped queries
│
├─ lib/                 # Utility libraries
│  ├─ ai/              # AI features (OpenAI)
│  ├─ integrations/    # Integration config
│  └─ sync/            # Channel sync orchestrator
│
├─ supabase-clients/   # Supabase client configurations
│  ├─ admin/           # Admin client (server-only)
│  └─ user/            # User client (RLS-protected)
│
├─ utils/              # Utility functions
│  ├─ zod-schemas/    # Validation schemas
│  └─ subscriptions.ts # Plan utilities
│
├─ styles/             # Global styles
│  └─ globals.css      # CSS variables, Tailwind
│
└─ types.ts            # TypeScript types
```

---

## 🎓 Key Concepts

### Server Actions (next-safe-action)
- Type-safe server functions callable from client
- Automatic validation with Zod
- Built-in error handling
- Used for all mutations and sensitive operations

### Row-Level Security (RLS)
- PostgreSQL feature for data isolation
- Policies run on every query
- Workspace-scoped: users only see their workspace data
- Helper functions: `is_workspace_member()`, `is_workspace_admin()`

### Multi-Tenancy
- Each workspace is isolated
- All data tables have `workspace_id` column
- RLS policies enforce workspace boundaries
- Users can belong to multiple workspaces

### Plan-Based Feature Gating
- Client-side: UI gates (disabled buttons, badges)
- Server-side: Server action validation (security)
- Double-layer: Both client + server checks
- Fail-open in dev, fail-closed in production

### OKLCH Color Space
- Perceptually uniform (unlike HSL)
- Better for gradients and interpolation
- Native CSS support
- Used for theme system

---

## 📊 Performance Considerations

```
Optimizations Applied:
├─ Server Components (default)
│  └─> Render on server, less JS to client
│
├─ CSS Variables for Theming
│  └─> No JS re-renders on theme change
│
├─ Lazy Loading
│  └─> OpenAI client, heavy components
│
├─ React Query (Client)
│  └─> Automatic caching, deduplication
│
├─ Next.js Cache (Server)
│  └─> Cached data fetching
│
├─ Parallel Queries
│  └─> Feature checks run concurrently
│
└─ Database Indexes
   └─> All foreign keys, common queries
```

---

## 🔐 Security Layers (Defense in Depth)

```
Layer 1: Network
└─> HTTPS, secure cookies, CORS

Layer 2: Authentication
└─> Supabase Auth, JWT tokens

Layer 3: Middleware
└─> Route protection, session validation

Layer 4: Authorization
└─> Workspace membership, role checks

Layer 5: RLS Policies
└─> Database-level data isolation

Layer 6: Server Actions
└─> Input validation, business logic

Layer 7: Plan Gates
└─> Feature access control

Layer 8: Audit Logs
└─> Track all sensitive operations
```

---

## 🎯 Development Workflow

```
1. New Task
   └─> Read recent briefings
   └─> Check cursor rules
   └─> Review relevant code

2. Plan Changes
   └─> Database migration needed?
   └─> New feature gate needed?
   └─> Security implications?

3. Implement
   └─> Follow existing patterns
   └─> Server-first architecture
   └─> Type-safe with TypeScript

4. Test
   └─> Manual testing
   └─> Check RLS policies
   └─> Test plan restrictions

5. Document
   └─> Update code comments
   └─> Update docs if significant
   └─> Create briefing if major session

6. Deploy
   └─> Push migrations
   └─> Regenerate types
   └─> Verify in production
```

---

## 📚 Further Reading

- [Development Sessions](./DEVELOPMENT-SESSIONS.md) - Session history
- [Latest Briefing](./development-briefings/2025-11-25-session-completion.md) - Recent changes
- [Plan Gating](./plan-gating.md) - Feature access guide
- [Quick Reference](./QUICK-REFERENCE.md) - Developer cheat sheet
- [Cursor Rules](../.cursor/rules/) - Architecture patterns

---

**Bookmark This Document!** Refer to it when understanding system architecture or planning new features.

**Last Updated**: November 25, 2025  
**Status**: ✅ Production Ready


