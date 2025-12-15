# Project Structure

This document provides a detailed overview of the Nextbase Ultimate codebase structure and organization.

## Root Directory Structure

```
Aiva.io/
├── docs/                    # Documentation
├── e2e/                     # End-to-end tests
├── emails/                  # React Email templates
├── messages/                # i18n translation files
├── playwright/              # Playwright test configuration
├── public/                  # Static assets
├── src/                     # Source code
├── supabase/                # Supabase configuration and migrations
├── .cursor/                 # Cursor IDE configuration
├── components.json          # shadcn/ui configuration
├── content-collections.ts   # Content collections config
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies and scripts
├── playwright.config.ts     # Playwright test config
├── tsconfig.json            # TypeScript configuration
└── vitest.config.ts         # Vitest test configuration
```

## Source Code Structure (`src/`)

### Application Pages (`src/app/`)

```
app/
├── [locale]/                # Internationalized routes
│   ├── (dynamic-pages)/     # Main application pages
│   │   ├── (authenticated-pages)/
│   │   │   ├── (application-pages)/
│   │   │   │   ├── (solo-workspace-pages)/  # Solo workspace views
│   │   │   │   ├── project/[projectSlug]/   # Project pages
│   │   │   │   └── workspace/[workspaceSlug]/ # Workspace pages
│   │   │   ├── app_admin/   # Admin dashboard
│   │   │   ├── dashboard/   # Main dashboard
│   │   │   ├── onboarding/ # Onboarding flow
│   │   │   └── user/        # User profile and settings
│   │   ├── (login-pages)/   # Authentication pages
│   │   ├── (misc-login-pages)/ # Auth callbacks
│   │   └── (updates-pages)/ # Feedback and roadmap
│   ├── (external-pages)/    # Public pages (blog, changelog)
│   └── (fumadocs)/          # Documentation pages
├── api/                     # API routes
│   ├── stripe/webhooks/     # Stripe webhooks
│   ├── v1/me/              # API endpoints
│   └── ...
└── layout.tsx              # Root layout
```

**Key Patterns**:
- Route groups `()` for organization without affecting URLs
- Dynamic segments `[param]` for dynamic routes
- Parallel routes `@slot` for complex layouts
- API routes in `api/` directory

### Components (`src/components/`)

```
components/
├── ui/                      # shadcn/ui components
├── workspaces/              # Workspace-related components
├── Projects/                # Project components
├── NavigationMenu/         # Navigation components
├── LandingPage/            # Marketing page components
├── form-components/         # Form input components
├── auth-form-components/    # Auth form components
├── chat-*.tsx              # AI chat components
└── ...
```

**Component Types**:
- **UI Components**: Reusable UI primitives (`ui/`)
- **Feature Components**: Feature-specific components
- **Layout Components**: Layout and navigation
- **Form Components**: Form inputs and validation

### Data Layer (`src/data/`)

```
data/
├── admin/                   # Admin-only queries
│   ├── billing.ts
│   ├── marketing-*.ts
│   ├── user.tsx
│   └── workspaces.ts
├── anon/                    # Public/anonymous queries
│   ├── marketing-*.ts
│   ├── pricing.ts
│   └── ...
├── auth/                    # Authentication actions
│   └── auth.ts
├── user/                    # User-scoped queries
│   ├── billing.tsx
│   ├── chats.ts
│   ├── client/              # Client-side queries
│   ├── projects.tsx
│   ├── workspaces.ts
│   └── ...
└── feedback.ts              # Feedback queries
```

**Data Layer Patterns**:
- **Server Actions**: Type-safe mutations (`next-safe-action`)
- **Server Queries**: Server Component data fetching
- **Client Queries**: React Query hooks (`client/`)

### Supabase Clients (`src/supabase-clients/`)

```
supabase-clients/
├── admin/                   # Admin client (elevated permissions)
│   └── supabaseAdminClient.ts
├── anon/                    # Anonymous client (public access)
│   └── supabaseAnonClient.ts
├── unkey/                   # Unkey client (API key auth)
│   └── createSupabaseUnkeyClient.ts
└── user/                    # User client (authenticated)
    ├── createSupabaseMiddlewareClient.ts
    ├── createSupabaseUserRouteHandlerClient.ts
    ├── createSupabaseUserServerActionClient.ts
    ├── createSupabaseUserServerComponentClient.ts
    └── supabaseUserClientComponent.ts
```

**Client Types**:
- **User Client**: Authenticated user operations
- **Admin Client**: Admin operations with service role
- **Anon Client**: Public/unauthenticated operations
- **Unkey Client**: API key authentication
- **Middleware Client**: Request-time authentication

### Middlewares (`src/middlewares/`)

```
middlewares/
├── admin-middleware.ts      # Admin access control
├── auth-middleware.ts       # Authentication checks
├── locale-middleware.ts     # Locale detection
├── onboarding-middleware.ts # Onboarding flow
├── middlewareList.ts        # Middleware chain configuration
├── paths.ts                 # Path matching utilities
├── types.ts                 # Middleware types
└── utils.ts                 # Middleware utilities
```

**Middleware Chain**:
1. Locale detection
2. Authentication
3. Onboarding flow
4. Admin checks

### Utilities (`src/utils/`)

```
utils/
├── api-routes/              # API route utilities
├── server/                  # Server-side utilities
│   ├── serverGetLoggedInUser.ts
│   ├── serverGetUserType.ts
│   └── serverSessionUtils.ts
├── zod-schemas/             # Zod validation schemas
│   ├── auth.ts
│   ├── workspaces.ts
│   ├── projects.ts
│   └── ...
└── ...                      # Various utility functions
```

### Types (`src/types.ts`)

Central type definitions:
- Database types (generated)
- Application types
- Utility types
- Type helpers

### Configuration Files

#### `next.config.ts`
Next.js configuration:
- Content collections integration
- Internationalization plugin
- Bundle analyzer
- Image domains
- Turbo configuration

#### `tsconfig.json`
TypeScript configuration:
- Path aliases (`@/*`)
- Strict mode enabled
- Next.js plugin
- Content collections types

#### `package.json`
Dependencies and scripts:
- **Dependencies**: Production packages
- **Scripts**: Development and build commands
- **Engines**: Node.js version requirement

## Supabase Structure (`supabase/`)

```
supabase/
├── migrations/              # Database migrations
│   ├── 20240830135911_supabase_settings.sql
│   ├── 20240830135913_enums.sql
│   ├── 20240830140153_user.sql
│   ├── 20240830140215_workspaces.sql
│   ├── 20240830140217_projects.sql
│   ├── 20240830141927_ai.sql
│   ├── 20240830142138_marketing.sql
│   ├── 20240830143521_billing.sql
│   └── ...
├── config.toml              # Supabase local configuration
└── seed.sql                 # Database seed data
```

**Migration Naming**:
- Timestamp prefix: `YYYYMMDDHHMMSS`
- Descriptive name: Feature or table name
- Sequential order: Applied in order

## Testing Structure

### E2E Tests (`e2e/`)

```
e2e/
├── _helpers/                # Test helpers
│   ├── admin.helper.ts
│   ├── authjson.helper.ts
│   ├── login-user.helper.ts
│   └── ...
├── _setups/                 # Test setup files
│   ├── admin.setup.ts
│   ├── user.setup.ts
│   └── user2.setup.ts
├── admin/                   # Admin tests
├── anon/                    # Anonymous user tests
├── user/                    # Authenticated user tests
└── password-updation/      # Password update tests
```

### Unit Tests (`src/`)

Unit tests co-located with source files:
- `*.test.ts` - Test files
- `*.spec.ts` - Spec files
- Vitest configuration

## Public Assets (`public/`)

```
public/
├── assets/                  # General assets
├── images/                  # Images
├── logos/                   # Logo files
└── mockups/                 # Mockup images
```

## Email Templates (`emails/`)

React Email templates:
- `welcome.tsx`
- `email-confirmation.tsx`
- `forgot-password.tsx`
- `invitation-to-join.tsx`
- And more...

## Internationalization (`messages/`)

```
messages/
├── en.json                  # English translations
└── de.json                  # German translations
```

## Key Conventions

### File Naming

- **Components**: PascalCase (`UserProfile.tsx`)
- **Utilities**: camelCase (`helpers.ts`)
- **Types**: PascalCase (`types.ts`)
- **Constants**: UPPER_SNAKE_CASE (`constants.ts`)

### Directory Naming

- **Features**: kebab-case (`user-settings/`)
- **Components**: PascalCase (`UserProfile/`)
- **Utils**: camelCase (`utils/`)

### Import Paths

- **Aliases**: `@/` for `src/`
- **Public**: `@public/` for `public/`
- **Relative**: For local imports

### Code Organization

1. **Imports**: External → Internal → Relative
2. **Exports**: Named exports preferred
3. **Types**: Co-located or in `types.ts`
4. **Constants**: In `constants.ts` or co-located

## Adding New Features

### 1. Database Changes

```bash
# Create migration
supabase migration new feature_name

# Edit migration file
# supabase/migrations/TIMESTAMP_feature_name.sql

# Apply migration
supabase migration up

# Generate types
pnpm generate:types
```

### 2. Data Layer

```typescript
// src/data/user/new-feature.ts
export const createFeatureAction = authActionClient
  .schema(createFeatureSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Implementation
  });
```

### 3. Components

```typescript
// src/components/NewFeature/NewFeature.tsx
export function NewFeature() {
  // Component implementation
}
```

### 4. Pages

```typescript
// src/app/[locale]/(dynamic-pages)/(authenticated-pages)/new-feature/page.tsx
export default async function NewFeaturePage() {
  // Page implementation
}
```

## Best Practices

1. **Follow Existing Patterns**: Match existing code structure
2. **Type Everything**: Use TypeScript types
3. **Validate Inputs**: Use Zod schemas
4. **Test Thoroughly**: Write tests for new features
5. **Document Changes**: Update documentation
6. **Use RLS**: Always add RLS policies
7. **Follow Conventions**: Stick to naming conventions

## Further Reading

- [Architecture Overview](./architecture.md) - System architecture
- [Database Schema](./database-schema.md) - Database structure
- [Development Guide](./development.md) - Development workflow
- [Feature Documentation](./features/) - Feature-specific guides

---

**Next Steps**:
- [Database Schema](./database-schema.md) - Understand data structure
- [Development Guide](./development.md) - Learn development workflow
- [Feature Documentation](./features/) - Explore specific features

