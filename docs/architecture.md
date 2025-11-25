# Architecture Overview

This document provides a comprehensive overview of Nextbase Ultimate's architecture, design patterns, and system design decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Browser    │  │   Mobile     │  │   API        │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Application Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Pages      │  │  Components   │  │  Middleware  │    │
│  │  (App Router)│  │  (RSC/Client)│  │   Chain     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Server       │  │   API        │  │   Actions    │    │
│  │  Actions     │  │   Routes     │  │   (Safe)     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │   Auth       │  │   Storage    │    │
│  │  Database    │  │   (JWT)      │  │   (Files)    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │  Realtime    │  │   RLS        │                       │
│  │  (WebSocket) │  │   Policies   │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Stripe     │  │   OpenAI     │  │   PostHog     │    │
│  │  (Payments)  │  │   (AI Chat)  │  │  (Analytics) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Server-First Architecture

Nextbase prioritizes Server Components and Server Actions:

- **Server Components**: Default rendering on the server
- **Client Components**: Only when interactivity is needed (`"use client"`)
- **Server Actions**: Type-safe mutations without API routes
- **Reduced Bundle Size**: Less JavaScript sent to clients

### 2. Type Safety

End-to-end type safety:

- **Database Types**: Generated from Supabase schema
- **API Types**: Type-safe server actions and routes
- **Form Validation**: Zod schemas for runtime validation
- **Type Inference**: TypeScript inference throughout

### 3. Security by Default

Multiple layers of security:

- **Row Level Security (RLS)**: Database-level access control
- **Middleware Protection**: Route-level authentication
- **Server-Side Validation**: All inputs validated server-side
- **CSRF Protection**: Built-in Next.js protection

### 4. Multi-Tenant Architecture

Workspace-based isolation:

- **Data Isolation**: RLS policies enforce workspace boundaries
- **Resource Sharing**: Efficient database usage
- **Scalability**: Designed for horizontal scaling

## Application Layers

### 1. Presentation Layer

**Location**: `src/app/` and `src/components/`

- **Pages**: Next.js App Router pages (Server Components)
- **Components**: Reusable UI components
- **Layouts**: Page layouts and nested layouts
- **Templates**: Page templates

**Key Patterns**:
- Server Components by default
- Client Components for interactivity
- Parallel routes for complex layouts
- Route groups for organization

### 2. Data Layer

**Location**: `src/data/`

- **Server Actions**: Type-safe mutations (`next-safe-action`)
- **Data Fetching**: Server Component data fetching
- **Client Queries**: React Query for client-side data

**Structure**:
```
data/
├── admin/          # Admin-only queries
├── anon/           # Public/anonymous queries
├── auth/           # Authentication actions
└── user/           # User-scoped queries
```

### 3. Business Logic Layer

**Location**: `src/utils/`, `src/lib/`

- **Validation**: Zod schemas
- **Helpers**: Utility functions
- **Business Rules**: Domain logic
- **Error Handling**: Centralized error handling

### 4. Infrastructure Layer

**Location**: `src/supabase-clients/`, `src/middlewares/`

- **Supabase Clients**: Different client types for different contexts
- **Middleware**: Request processing chain
- **Authentication**: Auth flow management
- **Authorization**: Permission checks

## Key Architectural Patterns

### 1. Middleware Chain Pattern

**Location**: `src/middleware.ts`, `src/middlewares/`

A composable middleware system:

```typescript
const middlewareList: MiddlewareConfig[] = [
  localeMiddleware,           // Locale detection
  authMiddleware,            // Authentication
  dashboardOnboardingMiddleware, // Onboarding flow
  onboardingRedirectMiddleware,  // Redirects
  adminMiddleware,           // Admin checks
];
```

**Benefits**:
- Composable and reusable
- Single user session evaluation
- Clear separation of concerns

### 2. Multi-Client Pattern

**Location**: `src/supabase-clients/`

Different Supabase clients for different contexts:

- **User Client**: Authenticated user operations
- **Admin Client**: Admin operations with elevated permissions
- **Anon Client**: Public/unauthenticated operations
- **Unkey Client**: API key authentication
- **Middleware Client**: Request-time authentication

**Benefits**:
- Proper permission scoping
- Type safety per context
- Clear security boundaries

### 3. Server Action Pattern

**Location**: `src/data/`, `src/lib/safe-action.ts`

Type-safe server mutations:

```typescript
export const createProjectAction = authActionClient
  .schema(createProjectSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Type-safe input and context
    // Automatic error handling
    // Built-in validation
  });
```

**Benefits**:
- Type safety
- Automatic validation
- Error handling
- No API routes needed

### 4. RLS-First Security Pattern

**Location**: `supabase/migrations/`

Database-level security:

- All tables have RLS enabled
- Policies enforce access control
- Helper functions for common checks
- Workspace isolation guaranteed

**Benefits**:
- Security at the data layer
- Prevents data leaks
- Workspace isolation
- Scalable security model

## Data Flow

### Read Operations

```
Client Request
    ↓
Middleware (Auth, Locale)
    ↓
Server Component
    ↓
Data Fetching Function
    ↓
Supabase Client (with RLS)
    ↓
PostgreSQL Database
    ↓
RLS Policy Check
    ↓
Return Data
```

### Write Operations

```
Client Form Submission
    ↓
Server Action (Validation)
    ↓
Supabase Client (with RLS)
    ↓
PostgreSQL Database
    ↓
RLS Policy Check
    ↓
Mutation Execution
    ↓
Return Result
```

## Routing Architecture

### Route Structure

```
[locale]/
├── (dynamic-pages)/
│   ├── (authenticated-pages)/  # Protected routes
│   ├── (login-pages)/         # Auth pages
│   └── (external-pages)/      # Public pages
└── api/                       # API routes
```

### Route Groups

- **`(dynamic-pages)`**: Pages with dynamic content
- **`(authenticated-pages)`**: Require authentication
- **`(login-pages)`**: Authentication pages
- **`(external-pages)`**: Public marketing pages

### Parallel Routes

Used for complex layouts:
- `@navbar`: Navigation bar slot
- `@sidebar`: Sidebar slot
- Multiple parallel routes per layout

## State Management

### Server State

- **React Query**: Client-side server state caching
- **Server Components**: Server-side data fetching
- **Revalidation**: Next.js revalidation strategies

### Client State

- **React Hook Form**: Form state
- **React State**: Component state
- **Context API**: Shared client state

### Real-Time State

- **Supabase Realtime**: Live database updates
- **WebSocket Connections**: Persistent connections
- **Subscription Management**: Automatic cleanup

## Security Architecture

### Authentication Flow

```
User Login
    ↓
Supabase Auth
    ↓
JWT Token Generated
    ↓
Token Stored (HttpOnly Cookie)
    ↓
Middleware Validates Token
    ↓
User Session Established
```

### Authorization Flow

```
Request Received
    ↓
Middleware Checks Auth
    ↓
Route Handler Checks Permissions
    ↓
Database Query with RLS
    ↓
RLS Policy Evaluates Access
    ↓
Data Returned (if authorized)
```

### Multi-Tenant Isolation

```
User Request
    ↓
Workspace Context Identified
    ↓
RLS Policy Checks Membership
    ↓
Query Filtered by Workspace
    ↓
Only Workspace Data Returned
```

## Performance Optimizations

### 1. Server Components

- Reduced JavaScript bundle
- Faster initial page load
- Better SEO

### 2. Database Indexing

- Strategic indexes on foreign keys
- Composite indexes for common queries
- Query optimization

### 3. Caching Strategies

- React Query caching
- Next.js data cache
- Static page generation where possible

### 4. Code Splitting

- Automatic route-based splitting
- Dynamic imports for heavy components
- Lazy loading

## Scalability Considerations

### Horizontal Scaling

- Stateless application servers
- Shared database (Supabase)
- CDN for static assets

### Database Scaling

- Connection pooling
- Read replicas (Supabase)
- Query optimization

### Caching Layers

- React Query cache
- Next.js cache
- CDN caching
- Database query cache

## Extension Points

### Adding New Features

1. **Database**: Create migrations in `supabase/migrations/`
2. **Types**: Generate types with `pnpm generate:types`
3. **Data Layer**: Add server actions in `src/data/`
4. **Components**: Create UI in `src/components/`
5. **Pages**: Add routes in `src/app/`

### Customizing Authentication

- Modify `src/middlewares/auth-middleware.ts`
- Update `src/data/auth/auth.ts`
- Customize auth pages in `src/app/[locale]/(dynamic-pages)/(login-pages)/`

### Adding Payment Gateways

- Implement `PaymentGateway` interface
- Add to `src/payments/`
- Update `PAYMENT_PROVIDER` constant

## Best Practices

1. **Use Server Components** by default
2. **Validate on the server** with Zod
3. **Use RLS policies** for security
4. **Type everything** with TypeScript
5. **Test thoroughly** with Playwright and Vitest
6. **Follow conventions** in the codebase
7. **Document changes** in migrations

## Further Reading

- [Project Structure](./project-structure.md) - Detailed file organization
- [Database Schema](./database-schema.md) - Database design
- [Development Guide](./development.md) - Development workflow
- [Feature Documentation](./features/) - Feature-specific architecture

---

**Next Steps**:
- [Project Structure](./project-structure.md) - Understand codebase organization
- [Database Schema](./database-schema.md) - Learn about data modeling
- [Development Guide](./development.md) - Start developing

