# 👋 Welcome to Aiva.io Development

**Last Updated**: November 25, 2025 | **Status**: ✅ Production Ready

---

## 🎯 New Developer? Start Here!

This document will get you up to speed in **< 30 minutes**.

---

## 📖 Step 1: Read This First (5 minutes)

### What is Aiva.io?
Aiva.io is a **unified AI communication assistant** that integrates multiple channels (Gmail, Outlook, Slack, etc.) into a single inbox with AI-powered features like message classification, reply drafting, and intelligent scheduling.

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js Server Actions, Supabase
- **Database**: PostgreSQL (via Supabase) with Row-Level Security
- **AI**: OpenAI API
- **Billing**: Stripe
- **Foundation**: Nextbase Ultimate v3.1.0

### Current Status
✅ Production-ready multi-tenant SaaS application with:
- Complete plan-based feature gating (Free/Basic/Pro/Enterprise)
- 14 integrations configured (Gmail, Outlook actively working)
- Calendar system with multi-day event support
- AI features (classification, reply drafts - Pro+)
- Secure workspace isolation
- Green theme (#5CE65C) with light/dark mode

---

## 🚀 Step 2: Set Up Your Environment (10 minutes)

### Prerequisites
- Node.js 18+ and pnpm
- Git
- Code editor (VS Code recommended with Cursor)

### Quick Setup
```bash
# 1. Clone and install
cd /path/to/Aiva.io
pnpm install

# 2. Set up environment variables
cp .env.example .env.local

# Add these to .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://lgyewlqzelxkpawnmiog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_FQasu83EL-o4aHeeVu_QZQ_-hcGyVBy
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xFWpLbcgb5bw81OV5BnDSw_Ss9dewCc
DATABASE_URL=postgresql://postgres:8XC7lkl75hKzCOzY@db.lgyewlqzelxkpawnmiog.supabase.co:5432/postgres

# Optional (for full functionality):
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...

# 3. Generate database types
pnpm generate:types

# 4. Start development server
pnpm dev

# 5. Open http://localhost:3000
```

---

## 📚 Step 3: Understand Recent Changes (10 minutes)

### Must-Read Documents (in order):
1. **[Development Session History](./docs/DEVELOPMENT-SESSIONS.md)** (3 min) - Overview of all sessions
2. **[Latest Session Briefing](./docs/development-briefings/2025-11-25-session-completion.md)** (5 min) - Recent major changes
3. **[Quick Reference](./docs/QUICK-REFERENCE.md)** (2 min) - Bookmark this for daily use

### Recent Major Changes (November 25, 2025):
- ✅ Tasks module removed → integrated into Calendar/Events
- ✅ Plan-based feature gating system implemented
- ✅ 14 integrations configured with centralized management
- ✅ Green theme applied throughout
- ✅ Calendar multi-day event rendering fixed
- ✅ Default "Aiva Calendar" for users without external calendars
- ✅ Security hardened (server-side feature gates)

---

## 🗺️ Step 4: Navigate the Codebase (5 minutes)

### Key Files You'll Work With:

```
📁 Configuration & Integrations
├─ src/lib/integrations/config.ts        ← All integrations defined here
├─ src/styles/globals.css                ← Theme colors (CSS variables)
└─ .env.local                            ← Environment variables

📁 Subscriptions & Plans
├─ src/utils/subscriptions.ts            ← Plan types, feature flags
├─ src/rsc-data/user/subscriptions.ts    ← Server utilities
├─ src/data/user/subscriptions.ts        ← Server actions
├─ src/components/ProFeatureGate.tsx     ← Client gates & hooks
└─ src/data/anon/pricing.ts              ← Pricing page data

📁 Calendar
├─ src/components/calendar/MotionCalendarView.tsx  ← Main calendar UI
├─ src/data/user/calendar.ts                       ← Calendar actions
└─ supabase/migrations/2025*_calendar*.sql         ← Calendar schema

📁 Inbox & Messages
├─ src/components/inbox/InboxView.tsx              ← Unified inbox
├─ src/components/inbox/MessageDetailView.tsx     ← Message details
└─ src/data/user/messages.ts                       ← Message actions

📁 AI Features
├─ src/lib/ai/reply-generator.ts         ← AI reply drafts
├─ src/lib/ai/classifier.ts              ← Message classification
└─ src/components/inbox/AIReplyComposer.tsx  ← AI composer UI

📁 Documentation
├─ docs/DEVELOPMENT-SESSIONS.md          ← Session index
├─ docs/development-briefings/           ← Detailed briefings
├─ docs/plan-gating.md                   ← Feature gating guide
├─ docs/QUICK-REFERENCE.md               ← Daily reference
└─ docs/ARCHITECTURE-OVERVIEW.md         ← System architecture
```

---

## 🎯 Common Tasks & Where to Start

### I'm working on...

#### **Subscriptions / Billing**
→ Read: [docs/plan-gating.md](./docs/plan-gating.md)  
→ Code: `src/utils/subscriptions.ts`, `src/data/user/subscriptions.ts`  
→ UI: `src/components/ProFeatureGate.tsx`, `src/data/anon/pricing.ts`

#### **Calendar Features**
→ Read: [Latest briefing - Calendar section](./docs/development-briefings/2025-11-25-session-completion.md#5-calendar-system-improvements-)  
→ Code: `src/components/calendar/MotionCalendarView.tsx`  
→ Actions: `src/data/user/calendar.ts`

#### **Adding New Integration**
→ Read: [Latest briefing - Integration section](./docs/development-briefings/2025-11-25-session-completion.md#adding-a-new-integration)  
→ Config: `src/lib/integrations/config.ts`  
→ Components: `src/components/integrations/`

#### **AI Features**
→ Code: `src/lib/ai/` directory  
→ Read: [Feature gating guide](./docs/plan-gating.md) (AI features are Pro+)  
→ UI: `src/components/inbox/AIReplyComposer.tsx`

#### **Theme / Styling**
→ Colors: `src/styles/globals.css` (CSS variables)  
→ Read: [Quick Reference - Theme section](./docs/QUICK-REFERENCE.md#-theme--colors)  
→ Tool: https://oklch.com (color picker)

#### **Database / Migrations**
→ Migrations: `supabase/migrations/`  
→ Rules: `.cursor/rules/db-migrations.mdc`  
→ Commands: `supabase db push`, `pnpm generate:types`

---

## 🧪 Testing Your Changes

### Before Committing:
```bash
# Build check
pnpm build

# Lint check
pnpm lint

# Type check (automatic during build)

# Regenerate types if DB changed
pnpm generate:types
```

### Manual Testing Checklist:
- [ ] Feature works in light + dark mode
- [ ] Mobile responsive
- [ ] Plan restrictions enforced (test Basic vs Pro)
- [ ] No console errors
- [ ] Loading states display correctly
- [ ] Error handling shows user-friendly messages

---

## 🔐 Security Reminders

### Always Follow:
✅ **Validate on server** - Don't trust client-only checks  
✅ **Use server actions** - For all mutations and sensitive data  
✅ **Check workspace membership** - Before accessing workspace data  
✅ **Feature gate on server** - UI gates + server validation  
✅ **Never expose admin keys** - Keep service role key server-side only

### Pattern to Follow:
```typescript
// ✅ CORRECT: Double-layer protection
function Component({ workspaceId }) {
  const { hasAccess } = useFeatureAccess(workspaceId, FeatureFlag.AiDrafts);
  
  return (
    <Button 
      disabled={!hasAccess}  // UI gate
      onClick={() => generateReplyDraft(messageId, workspaceId)}  // Server validates
    >
      Generate Draft
    </Button>
  );
}

export const generateReplyDraft = authActionClient
  .action(async ({ parsedInput }) => {
    // Server validation (required!)
    const hasAccess = await getHasFeature(workspaceId, FeatureFlag.AiDrafts);
    if (!hasAccess) throw new Error('Pro feature');
    // ... implementation
  });
```

---

## 📞 Getting Help

### Documentation Order (when stuck):
1. **[Quick Reference](./docs/QUICK-REFERENCE.md)** - Common patterns, commands, debugging
2. **[Latest Session Briefing](./docs/development-briefings/2025-11-25-session-completion.md)** - Recent changes and known issues
3. **[Architecture Overview](./docs/ARCHITECTURE-OVERVIEW.md)** - System architecture
4. **Code Comments** - Most complex code is well-documented inline
5. **[Cursor Rules](./cursor/rules/)** - Architecture patterns and best practices

### Specific Topics:
- **Plans/Billing**: [docs/plan-gating.md](./docs/plan-gating.md)
- **Calendar**: [Latest briefing - Calendar section](./docs/development-briefings/2025-11-25-session-completion.md#5-calendar-system-improvements-)
- **Integrations**: [src/lib/integrations/config.ts](./src/lib/integrations/config.ts) (see header comments)
- **Database**: [.cursor/rules/db-migrations.mdc](./.cursor/rules/db-migrations.mdc)
- **Security**: [.cursor/rules/security-guidelines.mdc](./.cursor/rules/security-guidelines.mdc)

---

## 🎉 You're Ready!

### Quick Checklist:
- ✅ Development environment set up
- ✅ Read development session history
- ✅ Understand recent changes (Nov 25 briefing)
- ✅ Bookmarked Quick Reference
- ✅ Know where to find things

### Next Steps:
1. Pick a task from the backlog or create a new one
2. Read relevant documentation (see "Common Tasks" above)
3. Check recent briefings for that area
4. Follow existing patterns in the codebase
5. Test thoroughly (especially plan restrictions)
6. Update docs if making significant changes

---

## 💡 Pro Tips

1. **Read recent briefings first** - Save hours by understanding recent architectural decisions
2. **Use Quick Reference daily** - It has all common commands and patterns
3. **Follow the security pattern** - Always implement UI gate + server validation
4. **Test with different plans** - Basic vs Pro to ensure feature gates work
5. **Check code comments** - Complex logic is documented inline
6. **Use CSS variables** - Theme changes should be CSS-only
7. **Run pnpm generate:types** - After any database schema change
8. **Ask questions early** - Check docs first, but don't spend hours stuck

---

## 🚦 Your First Task

### Suggested: Explore the App
```bash
# 1. Start dev server
pnpm dev

# 2. Create an account
# Visit http://localhost:3000 and sign up

# 3. Explore features:
# - Create a workspace
# - View the inbox (empty state shows integration avatars)
# - Open calendar (try creating an event)
# - Check settings (see plan badge and feature gates)
# - Toggle dark/light mode (green theme)

# 4. Check Supabase dashboard:
# - Visit https://lgyewlqzelxkpawnmiog.supabase.co
# - View your data in the tables
# - Check RLS policies
# - See the calendar_provider enum
```

### Suggested: Make a Small Change
```bash
# Try: Add a new integration to the config

# 1. Open src/lib/integrations/config.ts

# 2. Add a new integration object:
{
  id: 'discord',
  name: 'Discord',
  type: 'messaging',
  status: 'coming_soon',
  logo: 'https://static.cdnlogo.com/logos/d/43/discord.svg',
  description: 'Manage Discord messages with AI assistance.',
  features: ['Sync Messages', 'AI Summaries'],
  color: '#5865F2',
}

# 3. Save and refresh the browser

# 4. Check:
# - Connect channel dialog (should show Discord)
# - Empty inbox (Discord avatar in showcase if status='available')
# - Integrations page

# 5. Revert your change (it was just practice!)
```

---

## 📋 Daily Development Workflow

```
Morning:
├─ Check for new briefings in docs/development-briefings/
├─ Review your task list
└─ Read relevant documentation for today's tasks

During Development:
├─ Keep Quick Reference open
├─ Follow existing code patterns
├─ Write clear commit messages
└─ Test as you go (don't wait until the end)

Before Committing:
├─ pnpm build (no errors)
├─ pnpm lint (no warnings)
├─ Manual testing (light/dark mode, mobile)
├─ Test plan restrictions (Basic vs Pro)
└─ Update docs if significant changes

End of Day:
├─ Commit your work (even if not done)
├─ Document any blockers or questions
└─ Plan tomorrow's tasks
```

---

## 🎊 Welcome to the Team!

You now have everything you need to be productive on Aiva.io. The codebase is clean, well-documented, and follows consistent patterns.

**Remember**:
- Documentation is your friend (check it first!)
- Security is paramount (always validate on server)
- Consistency matters (follow existing patterns)
- Ask questions early (but check docs first)

**Happy coding!** 🚀

---

**Questions?** Check [docs/QUICK-REFERENCE.md](./docs/QUICK-REFERENCE.md) or [docs/DEVELOPMENT-SESSIONS.md](./docs/DEVELOPMENT-SESSIONS.md)

**Status**: ✅ Production Ready | **Last Updated**: November 25, 2025

