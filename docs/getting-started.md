# Getting Started with Nextbase Ultimate

This guide will help you set up and run Nextbase Ultimate on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.6 (recommended) or npm/yarn
- **Git**
- **Supabase CLI** (for local development)
- **PostgreSQL** (if running Supabase locally)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Aiva.io
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local  # If example exists, or create manually
```

Required environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PROJECT_REF=your_project_ref
SUPABASE_JWT_SECRET=your_jwt_secret

# Application URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe (for billing features)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Admin Configuration
ADMIN_EMAIL=admin@example.com

# Analytics (Optional)
NEXT_PUBLIC_POSTHOG_API_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_APP_ID=your_posthog_app_id
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# API Key Management (Optional)
UNKEY_ROOT_KEY=your_unkey_root_key
UNKEY_API_ID=your_unkey_api_id

# AI Features (Optional)
OPENAI_API_KEY=your_openai_api_key
```

### 4. Set Up Supabase

#### Option A: Local Supabase (Recommended for Development)

```bash
# Start Supabase locally
supabase start

# Run migrations
supabase migration up

# Generate TypeScript types
pnpm generate:types:local
```

#### Option B: Remote Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
3. Run migrations:
   ```bash
   supabase db push
   ```
4. Generate types:
   ```bash
   pnpm generate:types
   ```

### 5. Start the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## First Steps

### 1. Create Your First User

1. Navigate to `http://localhost:3000/sign-up`
2. Create an account using email/password or OAuth
3. Complete the email confirmation (if enabled)

### 2. Set Up Admin User

To create an admin user, you need to add a role in the database:

```sql
-- Connect to your Supabase database
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-id', 'admin');
```

You can find your user ID in the Supabase dashboard under Authentication > Users.

### 3. Complete Onboarding

After logging in, you'll be guided through the onboarding flow:
1. Accept terms and conditions
2. Update your profile
3. Create your first workspace
4. Set up your preferences

### 4. Explore the Dashboard

- **Dashboard**: `/dashboard` - Main application dashboard
- **Workspaces**: `/workspace/[slug]` - Workspace management
- **Projects**: `/project/[slug]` - Project management
- **Admin Panel**: `/app_admin` - Administrative features (admin only)

## Project Structure Overview

```
Aiva.io/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── data/            # Data fetching and server actions
│   ├── supabase-clients/ # Supabase client configurations
│   ├── middlewares/     # Next.js middleware
│   ├── utils/           # Utility functions
│   └── types.ts         # TypeScript type definitions
├── supabase/
│   ├── migrations/      # Database migrations
│   └── config.toml      # Supabase configuration
├── public/              # Static assets
└── docs/                # Documentation
```

## Common Commands

### Development

```bash
# Start development server
pnpm dev

# Start with debug mode
pnpm dev:debug

# Build for production
pnpm build

# Start production server
pnpm start
```

### Database

```bash
# Generate TypeScript types from database
pnpm generate:types

# Generate types from local Supabase
pnpm generate:types:local

# Run Supabase migrations
supabase migration up

# Reset local database
supabase db reset
```

### Code Quality

```bash
# Run ESLint
pnpm lint:eslint

# Format with Prettier
pnpm lint:prettier

# Run both
pnpm lint

# Type check
pnpm tsc
```

### Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

## Next Steps

Now that you have Nextbase running:

1. **Read the Architecture Guide**: Understand how the system is structured
2. **Explore Features**: Check out the feature-specific documentation
3. **Customize**: Start customizing for your needs
4. **Deploy**: Follow the deployment guide when ready

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Supabase connection errors**
- Verify your environment variables are correct
- Check that Supabase is running (`supabase status`)
- Ensure migrations are applied

**Type generation errors**
- Make sure Supabase is linked correctly
- Verify database schema matches migrations
- Check that service role key has proper permissions

**Module not found errors**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
```

For more troubleshooting help, see the [Troubleshooting Guide](./troubleshooting.md).

## Additional Resources

- [Architecture Overview](./architecture.md)
- [Development Guide](./development.md)
- [Environment Variables](./environment-variables.md)
- [Deployment Guide](./deployment.md)

## Getting Help

- Check the [FAQ](./faq.md)
- Review [Troubleshooting](./troubleshooting.md)
- Open an issue on GitHub
- Check existing documentation

---

**Ready to build?** Continue to the [Architecture Overview](./architecture.md) to understand how Nextbase is structured.

