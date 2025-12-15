# Aiva.io - Session Understanding Brief

**Date**: November 25, 2025  
**Purpose**: New session context pickup from previous development handover  
**Status**: ✅ Project Fully Understood - Ready for Development

---

## 🎯 Executive Summary

**Aiva.io** is a unified AI communication assistant built on **Nextbase Ultimate v3.1.0**. The project aims to integrate multiple communication channels (Gmail, Outlook, Slack, Teams, WhatsApp, Instagram, LinkedIn, etc.) into a single "command centre" with AI-powered message prioritization, smart reply drafting, auto-send capabilities, and intelligent scheduling.

**Current State**: Production-ready foundation with comprehensive feature gating, 14 integrations configured, working calendar system, and robust security architecture.

---

## 📊 Project Status Overview

### ✅ What's Complete & Working

| Area | Status | Notes |
|------|--------|-------|
| **Foundation** | ✅ Complete | Nextbase Ultimate v3.1.0 integrated |
| **Authentication** | ✅ Complete | Email/password, magic links, OAuth (Google, GitHub) |
| **Multi-Tenancy** | ✅ Complete | Workspace-based isolation with RLS |
| **Database Schema** | ✅ Complete | 8+ Aiva tables, 30+ RLS policies, indexes |
| **Plan Gating** | ✅ Complete | Free/Basic/Pro/Enterprise tiers |
| **Calendar** | ✅ Complete | Multi-day events, Aiva Calendar default |
| **Integrations Config** | ✅ Complete | 14 integrations defined |
| **Theme System** | ✅ Complete | Green (#5CE65C) OKLCH-based |
| **Animated Borders** | ✅ Complete | CSS-based gradient animations |
| **Layout System** | ✅ Complete | Full viewport height, proper scrolling |

### ⚙️ Ready for Configuration

| Area | Status | Required |
|------|--------|----------|
| **Gmail Integration** | 🔶 Needs OAuth | Google Cloud Console setup |
| **Outlook Integration** | 🔶 Needs OAuth | Microsoft Entra app |
| **Google Calendar** | 🔶 Needs OAuth | Google Cloud Console |
| **Slack Integration** | 🔶 Needs OAuth | Slack app credentials |
| **OpenAI Features** | 🔶 Needs API Key | `OPENAI_API_KEY` in .env.local |
| **Stripe Billing** | 🔶 Needs Keys | `STRIPE_SECRET_KEY` in .env.local |

### 📋 Next Priority Tasks

1. **QA Testing** - Comprehensive testing of all features
2. **OAuth Setup** - Gmail, Outlook, Google Calendar credentials
3. **Performance Optimization** - Lighthouse audit, bundle analysis
4. **Mobile Responsiveness** - Review and refine

---

## 🏗️ Architecture Understanding

### Tech Stack

```
Frontend:  Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
Backend:   Supabase (PostgreSQL, Auth, Storage, Realtime)
AI:        OpenAI API (lazy-loaded)
Payments:  Stripe (ready, not configured)
Testing:   Playwright (E2E) + Vitest (Unit)
```

### Key Architectural Patterns

1. **Server-First**: Server Components by default, Server Actions for mutations
2. **Type-Safe**: TypeScript + Zod + generated database types
3. **Multi-Tenant**: Workspace-scoped data with RLS policies
4. **Plan Gating**: Double-layer protection (UI + server validation)
5. **Security**: 8 defense layers (network → audit logs)

### Database Schema Highlights

```
Core Tables (Workspace-Scoped):
├── workspaces           - Multi-tenant workspaces
├── workspace_members    - User-workspace junction
├── channel_connections  - OAuth tokens, provider info
├── messages            - Unified inbox messages
├── calendar_connections - Calendar provider links
├── events              - Calendar events (tasks integrated)
├── contacts            - Contact management
└── ai_action_logs      - AI operation audit trail
```

---

## 📁 Key File Locations

### Configuration & Integration

```
src/lib/integrations/config.ts        ← All 14 integrations defined here
src/styles/globals.css                ← Theme colors (OKLCH CSS variables)
src/utils/subscriptions.ts            ← Plan types, feature flags
.env.local                            ← Environment variables (not in git)
```

### Plan-Based Feature Gating

```
src/utils/subscriptions.ts            ← Enums: PlanType, FeatureFlag
src/rsc-data/user/subscriptions.ts    ← Server-side utilities
src/data/user/subscriptions.ts        ← Server actions (safe for client)
src/components/ProFeatureGate.tsx     ← Client hooks & components
src/data/anon/pricing.ts              ← Pricing page data
```

### Core Features

```
Calendar:
├── src/components/calendar/MotionCalendarView.tsx  ← Main UI
├── src/data/user/calendar.ts                       ← Server actions
└── supabase/migrations/2025*_calendar*.sql         ← Schema

Inbox:
├── src/components/inbox/InboxView.tsx              ← Unified inbox
├── src/components/inbox/MessageDetailView.tsx      ← Message details
├── src/components/inbox/AIReplyComposer.tsx        ← AI drafts (Pro+)
└── src/data/user/messages.ts                       ← Server actions

AI:
├── src/lib/ai/reply-generator.ts     ← AI reply drafts (gated)
├── src/lib/ai/classifier.ts          ← Message classification
└── src/lib/ai/scheduler.ts           ← Scheduling intent detection
```

### Documentation

```
docs/DEVELOPMENT-SESSIONS.md          ← Session index
docs/development-briefings/           ← Detailed session briefings
docs/plan-gating.md                   ← Feature gating guide
docs/QUICK-REFERENCE.md               ← Developer cheat sheet
docs/ARCHITECTURE-OVERVIEW.md         ← System architecture
.cursor/rules/                        ← Architecture patterns (MDC files)
```

---

## 🎨 Visual Design System

### Theme: Green (#5CE65C)

```css
/* OKLCH Color Space */
Light Mode:
  --primary: oklch(0.60 0.20 138)

Dark Mode:
  --primary: oklch(0.75 0.22 138)

/* Standard Hover Pattern */
hover:bg-primary/5 hover:border-primary/30 transition-colors
```

### Animated Borders

Applied to interactive cards via CSS class:
```tsx
<Card className="animated-border">
  {/* Content */}
</Card>
```

---

## 🔐 Security Architecture

### 8 Defense Layers

1. **Network**: HTTPS, secure cookies, CORS
2. **Authentication**: Supabase Auth, JWT tokens
3. **Middleware**: Route protection, session validation
4. **Authorization**: Workspace membership, role checks
5. **RLS Policies**: Database-level data isolation
6. **Server Actions**: Input validation (Zod), business logic
7. **Plan Gates**: Feature access control
8. **Audit Logs**: Track all sensitive operations

### Security Pattern to Follow

```typescript
// ✅ CORRECT: Double-layer protection
function ProFeature({ workspaceId }) {
  // Layer 1: UI gate
  const { hasAccess } = useFeatureAccess(workspaceId, FeatureFlag.AiDrafts);
  
  return (
    <Button 
      disabled={!hasAccess}                    // UI disabled
      onClick={() => serverAction(workspaceId)} // Server validates
    >
      Generate Draft
    </Button>
  );
}

// Server action also validates (Layer 2)
export const serverAction = authActionClient
  .action(async ({ parsedInput, ctx }) => {
    const hasAccess = await getHasFeature(workspaceId, FeatureFlag.AiDrafts);
    if (!hasAccess) throw new Error('Pro feature');
    // ... safe implementation
  });
```

---

## 💳 Plan Tiers & Features

| Feature | Free | Basic | Pro | Enterprise |
|---------|------|-------|-----|------------|
| Unified Inbox | ❌ | ✅ (3 channels) | ✅ (unlimited) | ✅ |
| Auto-classify | ❌ | ✅ | ✅ | ✅ |
| Calendar extraction | ❌ | ✅ | ✅ | ✅ |
| Deep search | ❌ | ✅ | ✅ | ✅ |
| **AI Reply Drafts** | ❌ | ❌ | ✅ | ✅ |
| **Auto-responses** | ❌ | ❌ | ✅ | ✅ |
| Custom AI prompts | ❌ | ❌ | ✅ | ✅ |
| Team workspaces | ❌ | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |

---

## 📅 Development Session History

### Session 1: November 20, 2025 - Initial Development
- Complete database schema (8 new tables, 30+ RLS policies)
- All Server Actions for CRUD operations
- Full integration implementations (Gmail, Outlook, Slack, etc.)
- AI features (classification, reply generation, task extraction)
- Frontend: Inbox, Tasks, Calendar, Channels, Settings
- Motion-style calendar view

### Session 2: November 25, 2025 - Major Feature Updates
- ✅ Tasks module removed → integrated into Events
- ✅ Centralized integration management (14 integrations)
- ✅ Complete plan-based feature gating system
- ✅ Green theme implementation (#5CE65C)
- ✅ Calendar alignment and multi-day event rendering fixes
- ✅ Default Aiva Calendar implementation
- ✅ User profile standardization
- ✅ Security hardening (server-side feature gates)

### Session 3: December 2024 - UI/UX Enhancements
- ✅ Animated gradient border system (CSS `@property`)
- ✅ Layout/height fixes (full viewport utilization)
- ✅ Briefing section enhancements
- ✅ Chat interface refinements

---

## 🚀 Quick Start Commands

```bash
# Development
pnpm install                    # Install dependencies
pnpm dev                        # Start dev server (localhost:3000)
pnpm generate:types             # Regenerate database types

# Database
supabase db push                # Push migrations
supabase db pull                # Pull schema

# Testing
pnpm build                      # Production build (checks for errors)
pnpm lint                       # Run linter
pnpm test                       # Run tests
```

---

## 🔧 Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://lgyewlqzelxkpawnmiog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_FQasu83EL-o4aHeeVu_QZQ_-hcGyVBy
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xFWpLbcgb5bw81OV5BnDSw_Ss9dewCc
DATABASE_URL=postgresql://postgres:8XC7lkl75hKzCOzY@db.lgyewlqzelxkpawnmiog.supabase.co:5432/postgres

# Optional (for full functionality)
OPENAI_API_KEY=sk-...           # AI features
STRIPE_SECRET_KEY=sk_test_...   # Billing
```

---

## 🐛 Known Issues & Edge Cases

### Handled ✅
- No calendar connections → Creates Aiva calendar automatically
- No subscription → Defaults to Free plan
- Stripe not configured → Defaults to Pro in development
- Missing integration logo → Shows fallback icon
- Multi-day events across weeks → Renders correctly

### Minor Considerations
1. **Integration Logos**: CDN-dependent, fallback icon shows if unavailable
2. **Plan Badge**: Brief flash on mount (client-side check)
3. **Timezone**: Currently uses browser timezone (user preference coming)

---

## 📚 Must-Read Documentation

**Before starting any task, read in order:**

1. **[QUICK-REFERENCE.md](./docs/QUICK-REFERENCE.md)** - Daily cheat sheet
2. **[Latest Briefing](./docs/development-briefings/2025-11-25-session-completion.md)** - Recent changes
3. **[Plan Gating Guide](./docs/plan-gating.md)** - Feature access implementation
4. **[Architecture Overview](./docs/ARCHITECTURE-OVERVIEW.md)** - System design

**For specific areas:**
- **Calendar**: Latest briefing → Calendar section
- **Integrations**: `src/lib/integrations/config.ts`
- **Database**: `.cursor/rules/db-migrations.mdc`
- **Security**: `.cursor/rules/security-guidelines.mdc`

---

## 🎯 Recommended Next Steps

### Immediate (This Session)
1. **Verify Dev Environment**
   - Check `pnpm dev` is running
   - Verify database connection
   - Test a simple feature flow

2. **Understand Current State**
   - Browse the app at localhost:3000
   - Test light/dark theme toggle
   - Check calendar functionality
   - View inbox (empty state shows integration avatars)

### Short-Term Priorities
1. **QA Testing** - Systematic CRUD testing per checklist
2. **OAuth Setup** - Gmail and Outlook integration credentials
3. **AI Features** - Add OPENAI_API_KEY and test AI drafts

### Medium-Term Priorities
1. **Webhook Configuration** - Real-time message ingestion
2. **Search Implementation** - Full-text search in inbox
3. **Performance Audit** - Lighthouse, bundle analysis

---

## 💡 Development Guidelines

### Do's ✅
- Use Server Components by default
- Validate all inputs with Zod
- Use RLS policies for security
- Check workspace membership before operations
- Use `authActionClient` for protected actions
- Revalidate paths after mutations
- Follow existing code patterns
- Map camelCase ↔ snake_case between app and DB

### Don'ts ❌
- Don't fetch data in client components unnecessarily
- Don't skip validation
- Don't bypass RLS policies
- Don't trust client-side checks alone
- Don't use `any` types
- Don't expose admin keys to client
- Don't forget to revalidate after mutations

---

## 🎉 Session Ready

**Understanding Level**: ✅ Complete

I have thoroughly reviewed:
- Project vision and goals (Aiva.io as unified AI communication assistant)
- Technical architecture (Nextbase Ultimate foundation)
- Database schema and RLS policies
- Current implementation state (production-ready)
- All previous session handoffs
- Code organization and patterns
- Security architecture
- Plan-based feature gating
- Theme and UI system

**Ready to proceed with any development tasks.**

---

**Questions to Ask Before Starting:**
1. What specific feature or area should I focus on?
2. Are there any blocking issues from previous sessions?
3. Should I prioritize QA testing or new feature development?
4. Are OAuth credentials available for integration testing?

---

**Document Version**: 1.0  
**Generated**: November 25, 2025  
**Context Source**: Complete project documentation review  
**Status**: ✅ Ready for Development

