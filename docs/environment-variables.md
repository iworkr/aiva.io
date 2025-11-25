# Environment Variables

Complete guide to environment variables in Nextbase Ultimate.

## Overview

Nextbase uses environment variables for configuration. Create a `.env.local` file in the root directory for local development.

## Required Variables

### Supabase Configuration

```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous Key (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase Service Role Key (server-only, keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Supabase Project Reference
SUPABASE_PROJECT_REF=your_project_ref

# Supabase JWT Secret (for token verification)
SUPABASE_JWT_SECRET=your_jwt_secret
```

**Where to Find**:
- Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY`: `service_role` `secret` key
- `SUPABASE_PROJECT_REF`: Project reference ID
- `SUPABASE_JWT_SECRET`: JWT secret (Settings → API → JWT Settings)

### Application URLs

```env
# Public site URL (used for redirects, emails, etc.)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Vercel URL (optional, for Vercel deployments)
NEXT_PUBLIC_VERCEL_URL=your-vercel-url.vercel.app
```

### Stripe Configuration

```env
# Stripe Publishable Key (public)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Secret Key (server-only, keep secret!)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret (for webhook verification)
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Where to Find**:
- Stripe Dashboard → Developers → API keys
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Publishable key
- `STRIPE_SECRET_KEY`: Secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (Webhooks → Endpoint → Signing secret)

### Admin Configuration

```env
# Admin email (for admin user creation)
ADMIN_EMAIL=admin@example.com
```

## Optional Variables

### Analytics

```env
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_API_KEY=phc_...
NEXT_PUBLIC_POSTHOG_APP_ID=your_app_id
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Where to Find**:
- PostHog: Project Settings → API Key
- Google Analytics: Admin → Data Streams → Measurement ID

### Error Tracking

```env
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

**Where to Find**:
- Sentry Dashboard → Settings → Projects → Client Keys (DSN)

### API Key Management

```env
# Unkey API Key Management
UNKEY_ROOT_KEY=unkey_...
UNKEY_API_ID=api_...
```

**Where to Find**:
- Unkey Dashboard → API Keys → Root Key
- Unkey Dashboard → APIs → API ID

### AI Features

```env
# OpenAI API Key (for AI chat)
OPENAI_API_KEY=sk-...
```

**Where to Find**:
- OpenAI Dashboard → API Keys

### Email Testing

```env
# Testmail prefix (for development email testing)
TESTMAIL_PREFIX=your_prefix
```

**Where to Find**:
- Testmail.app → Get prefix

### Node Environment

```env
# Node environment
NODE_ENV=development
# Options: development | production | test
```

## Environment-Specific Files

### Development

`.env.local` (gitignored):
```env
# Local development variables
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### Production

Set in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Render: Environment → Environment Variables

## Variable Naming Conventions

### Public Variables

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser:
- Safe to use in client components
- Included in bundle
- Visible in browser

**Example**:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

### Private Variables

Variables without `NEXT_PUBLIC_` are server-only:
- Only available in Server Components, Server Actions, API Routes
- Not exposed to browser
- Keep secrets secure

**Example**:
```typescript
// Server Component or Server Action
const secretKey = process.env.STRIPE_SECRET_KEY;
```

## Type Safety

Environment variables are typed in `src/environment.d.ts`:

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      STRIPE_SECRET_KEY: string;
      // ... other variables
    }
  }
}
```

## Validation

### Required Variables Check

Create a validation script:

```typescript
// scripts/validate-env.ts
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "STRIPE_SECRET_KEY"
];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
});
```

## Security Best Practices

### 1. Never Commit Secrets

- Add `.env.local` to `.gitignore`
- Never commit `.env` files
- Use environment variables in CI/CD

### 2. Use Different Keys

- Use test keys for development
- Use production keys only in production
- Rotate keys regularly

### 3. Limit Access

- Only expose `NEXT_PUBLIC_` variables when necessary
- Keep server-only variables secret
- Use service role key only server-side

### 4. Validate Inputs

- Validate environment variables on startup
- Provide clear error messages
- Fail fast if required variables missing

## Local Development Setup

### 1. Copy Example File

```bash
cp .env.example .env.local
```

### 2. Fill in Values

Edit `.env.local` with your values.

### 3. Verify Setup

```bash
# Check Supabase connection
supabase status

# Test Stripe connection
# (Test in application)
```

## Production Setup

### Vercel

1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select environment (Production, Preview, Development)
4. Redeploy

### Netlify

1. Go to Site Settings → Environment Variables
2. Add each variable
3. Set scope (All scopes, Production, Deploy previews)
4. Redeploy

### Render

1. Go to Environment → Environment Variables
2. Add each variable
3. Set environment
4. Redeploy

## Troubleshooting

### Variable Not Available

**Check**:
1. Variable name spelling
2. `NEXT_PUBLIC_` prefix for client variables
3. Server vs client context
4. Restart dev server after changes

### Type Errors

**Check**:
1. `src/environment.d.ts` includes variable
2. Type matches actual value
3. Restart TypeScript server

### Missing Variables

**Check**:
1. `.env.local` exists
2. Variables are set correctly
3. No typos in variable names
4. Restart dev server

## Example Configuration

### Minimal Setup

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_REF=xxx
SUPABASE_JWT_SECRET=xxx

# URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe (optional, for billing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin
ADMIN_EMAIL=admin@example.com
```

### Full Setup

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_REF=xxx
SUPABASE_JWT_SECRET=xxx

# URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_VERCEL_URL=xxx.vercel.app

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin
ADMIN_EMAIL=admin@example.com

# Analytics
NEXT_PUBLIC_POSTHOG_API_KEY=phc_...
NEXT_PUBLIC_POSTHOG_APP_ID=xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_GA_ID=G-XXX

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# API Keys
UNKEY_ROOT_KEY=unkey_...
UNKEY_API_ID=api_...

# AI
OPENAI_API_KEY=sk-...

# Testing
TESTMAIL_PREFIX=xxx
NODE_ENV=development
```

## Further Reading

- [Getting Started](./getting-started.md) - Initial setup
- [Development Guide](./development.md) - Development workflow
- [Deployment Guide](./deployment.md) - Production deployment

---

**Next Steps**:
- [Getting Started](./getting-started.md) - Set up your environment
- [Development Guide](./development.md) - Start developing

