# Aiva.io Quick Reference Card

**Last Updated**: November 25, 2025 | **Status**: ✅ Production Ready

---

## 📍 Essential Links

| Resource | Location |
|----------|----------|
| **Latest Session Briefing** | [docs/development-briefings/2025-11-25-session-completion.md](./development-briefings/2025-11-25-session-completion.md) |
| **Session History Index** | [docs/DEVELOPMENT-SESSIONS.md](./DEVELOPMENT-SESSIONS.md) |
| **Plan Gating Guide** | [docs/plan-gating.md](./plan-gating.md) |
| **Supabase Dashboard** | https://lgyewlqzelxkpawnmiog.supabase.co |
| **Integration Config** | [src/lib/integrations/config.ts](../src/lib/integrations/config.ts) |

---

## 🎨 Theme & Colors

```css
/* Primary Color: Green #5CE65C */
Light Mode: oklch(0.60 0.20 138)
Dark Mode:  oklch(0.75 0.22 138)

/* Hover Pattern */
hover:bg-primary/5 hover:border-primary/30 transition-colors
```

**Color Picker**: https://oklch.com

---

## 🔐 Plan Tiers & Features

| Plan | AI Drafts | Auto-Response | Channels | Team |
|------|-----------|---------------|----------|------|
| Free | ❌ | ❌ | 0 | ❌ |
| Basic | ❌ | ❌ | 3 | ❌ |
| Pro | ✅ | ✅ | ∞ | ✅ |
| Enterprise | ✅ | ✅ | ∞ | ✅+ |

---

## 🚀 Common Commands

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)
pnpm generate:types         # Regenerate DB types
pnpm lint                   # Run linter
pnpm build                  # Production build

# Database
supabase db push            # Push migrations
supabase db pull            # Pull schema
supabase db reset           # Reset local DB

# Testing
pnpm test                   # Run tests
pnpm test:watch            # Watch mode
```

---

## 📂 Key File Locations

```
Configuration
├─ src/lib/integrations/config.ts       # All integrations
├─ src/styles/globals.css               # Theme variables
└─ .env.local                           # Environment vars

Subscriptions / Plans
├─ src/utils/subscriptions.ts           # Plan types, enums
├─ src/rsc-data/user/subscriptions.ts   # Server utilities
├─ src/data/user/subscriptions.ts       # Server actions
├─ src/components/ProFeatureGate.tsx    # Client gates
└─ src/data/anon/pricing.ts             # Pricing page

Calendar
├─ src/components/calendar/MotionCalendarView.tsx  # Main view
├─ src/data/user/calendar.ts                       # Server actions
└─ supabase/migrations/2025*_calendar*.sql         # DB schema

Integrations
├─ src/lib/integrations/config.ts           # Config
├─ src/components/integrations/             # Components
└─ src/components/channels/                 # Channel management

Documentation
├─ docs/DEVELOPMENT-SESSIONS.md             # Session index
├─ docs/development-briefings/              # Detailed briefings
├─ docs/plan-gating.md                      # Feature gating guide
└─ .cursor/rules/                           # Architecture rules
```

---

## 🛠️ Adding New Features

### New Feature Gate

```typescript
// 1. Add to enum (src/utils/subscriptions.ts)
export enum FeatureFlag {
  NewFeature = "new_feature",
}

// 2. Define plan access
export function hasFeature(plan: PlanType, feature: FeatureFlag) {
  switch (feature) {
    case FeatureFlag.NewFeature:
      return plan === PlanType.Pro || plan === PlanType.Enterprise;
  }
}

// 3. Gate server action (src/data/user/your-action.ts)
const hasAccess = await getHasFeature(workspaceId, FeatureFlag.NewFeature);
if (!hasAccess) throw new Error('Pro feature');

// 4. Gate UI (your-component.tsx)
const { hasAccess } = useFeatureAccess(workspaceId, FeatureFlag.NewFeature);
return <Button disabled={!hasAccess}>...</Button>;
```

### New Integration

```typescript
// Add to src/lib/integrations/config.ts
{
  id: 'new_integration',
  name: 'Integration Name',
  type: 'email|messaging|social|calendar|e-commerce',
  status: 'available|coming_soon',
  logo: 'https://cdn.url/logo.svg',
  description: 'Description here',
  features: ['Feature 1', 'Feature 2'],
  color: '#HEXCOLOR',
}
// Automatically appears in UI!
```

### New Calendar Provider

```sql
-- 1. Create migration: supabase/migrations/YYYYMMDDHHMMSS_add_provider.sql
ALTER TYPE calendar_provider ADD VALUE IF NOT EXISTS 'new_provider';

-- 2. Push migration
-- supabase db push

-- 3. Update ManageAccountsDialog.tsx getProviderLogo() function
```

### Database Migration

```bash
# 1. Create migration file
# Name: YYYYMMDDHHMMSS_description.sql
# Get timestamp: date +"%Y%m%d%H%M%S"

# 2. Write SQL
# Enable RLS: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
# Add policies using existing helper functions

# 3. Push to Supabase
supabase db push

# 4. Regenerate types
pnpm generate:types
```

---

## 🔒 Security Checklist

```typescript
// ✅ DO: Server action with validation
export const action = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const hasAccess = await getHasFeature(...);
    if (!hasAccess) throw new Error('Unauthorized');
    // ... safe implementation
  });

// ❌ DON'T: Client-only gate
function Component() {
  const { hasPro } = useProSubscription();
  if (!hasPro) return null; // ← Can be bypassed!
}

// ✅ DO: Double-layer protection
function Component() {
  const { hasPro } = useProSubscription();
  return <Button disabled={!hasPro} onClick={safeServerAction} />;
  // UI gate + server validation
}
```

**Remember**: 
- ✅ Always validate on server
- ✅ Use RLS policies as primary security
- ✅ Never expose admin keys to client
- ✅ Use `authActionClient` for protected actions

---

## 🐛 Debugging Tips

```typescript
// Check current plan
const plan = await getWorkspacePlanType(workspaceId);
console.log('Current plan:', plan);

// Check feature access
const hasAccess = await getHasFeature(workspaceId, FeatureFlag.AiDrafts);
console.log('Has AI drafts:', hasAccess);

// Check RLS policies
// In Supabase SQL Editor:
SELECT * FROM pg_policies WHERE tablename = 'your_table';

// Regenerate types after schema changes
pnpm generate:types

// Check database enum values
SELECT enum_range(NULL::calendar_provider);
```

---

## 📦 Environment Variables

```bash
# Required for production
NEXT_PUBLIC_SUPABASE_URL=https://lgyewlqzelxkpawnmiog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_FQasu83EL-o4aHeeVu_QZQ_-hcGyVBy
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xFWpLbcgb5bw81OV5BnDSw_Ss9dewCc
DATABASE_URL=postgresql://postgres:8XC7lkl75hKzCOzY@db.lgyewlqzelxkpawnmiog.supabase.co:5432/postgres

# Optional features
OPENAI_API_KEY=sk-...                    # For AI features
STRIPE_SECRET_KEY=sk_test_...            # For billing
STRIPE_WEBHOOK_SECRET=whsec_...          # For webhooks
```

---

## 🎯 Testing Checklist

### Before Committing
- [ ] No TypeScript errors (`pnpm build`)
- [ ] No linter warnings (`pnpm lint`)
- [ ] Feature gating works (test Basic vs Pro)
- [ ] RLS policies prevent unauthorized access
- [ ] Migrations applied (`supabase db push`)
- [ ] Types regenerated (`pnpm generate:types`)

### Manual Testing
- [ ] Feature works in light + dark mode
- [ ] Mobile responsive
- [ ] Loading states display correctly
- [ ] Error handling shows user-friendly messages
- [ ] Plan restrictions enforced (UI + server)

---

## 💡 Pro Tips

1. **Read Recent Briefings First**: Save hours by understanding recent architectural decisions
2. **Use CSS Variables**: Theme changes should be CSS-only (no JS)
3. **Feature Gates**: Always implement both UI gate + server validation
4. **Integration Logos**: CDN may fail, plan for fallbacks
5. **Calendar Times**: Handle timezones carefully (use ISO strings)
6. **Database**: snake_case in DB, camelCase in app (map explicitly)
7. **Security**: When in doubt, validate on server
8. **Performance**: Lazy load heavy components, use React Query for client data
9. **Documentation**: Update docs when you make significant changes
10. **Ask for Help**: Check briefings, code comments, then ask

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| **"supabaseKey is required"** | Don't use admin client in client components. Use server actions. |
| **Calendar columns misaligned** | Fixed in Nov 25 session. See `MotionCalendarView.tsx`. |
| **Button inside button error** | Use `<div>` with `onClick` for containers, `<button>` for actions only. |
| **Feature gate not working** | Check both client hook AND server action validation. |
| **Migration not applied** | Run `supabase db push` and verify in dashboard. |
| **Types out of sync** | Run `pnpm generate:types` after any schema change. |
| **Enum value not recognized** | Add to enum via migration, push, regenerate types. |

---

## 📞 Getting Help

1. **Check Briefings**: [docs/development-briefings/](./development-briefings/)
2. **Check Code Comments**: Most complex logic is well-documented
3. **Check Cursor Rules**: [.cursor/rules/](../.cursor/rules/)
4. **Specific Topics**:
   - Plans/Billing → [docs/plan-gating.md](./plan-gating.md)
   - Calendar → [Latest briefing](./development-briefings/2025-11-25-session-completion.md#5-calendar-system-improvements-)
   - Integrations → [src/lib/integrations/config.ts](../src/lib/integrations/config.ts)
   - Database → [.cursor/rules/db-migrations.mdc](../.cursor/rules/db-migrations.mdc)

---

## 🎉 Current Status

**Production Ready** ✅
- Multi-tenant architecture
- Complete plan gating system
- 14 integrations configured
- Calendar with multi-day events
- Security hardened
- Comprehensive documentation

**Next Priority Tasks**:
1. QA testing of all features
2. Integration OAuth implementations
3. Performance optimization
4. Mobile responsiveness review

---

**Keep This Reference Handy!** Bookmark or print for quick access during development.

**Last Updated**: November 25, 2025  
**Session Status**: ✅ Complete

