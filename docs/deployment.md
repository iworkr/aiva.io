# Deployment Guide

Complete guide to deploying Nextbase Ultimate to production.

## Overview

Nextbase is designed to deploy to modern hosting platforms. This guide covers deployment to Vercel, Netlify, and Render.

## Prerequisites

Before deploying:

1. **Database Setup**: Supabase project configured
2. **Environment Variables**: All required variables ready
3. **Domain**: Domain name (optional)
4. **Stripe Account**: For billing features (optional)

## Deployment Platforms

### Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

#### Setup

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Vercel auto-detects Next.js

2. **Configure Build**:
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

3. **Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables
   - Set for Production, Preview, and Development

4. **Deploy**:
   - Push to main branch (auto-deploys)
   - Or deploy manually from dashboard

#### Vercel-Specific Configuration

**`vercel.json`** (optional):
```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

### Netlify

#### Setup

1. **Connect Repository**:
   - Go to [netlify.com](https://netlify.com)
   - Add new site from Git
   - Connect repository

2. **Build Settings**:
   - **Build command**: `pnpm build`
   - **Publish directory**: `.next`
   - **Package manager**: `pnpm`

3. **Environment Variables**:
   - Go to Site Settings → Environment Variables
   - Add all required variables
   - Set scope (Production, Deploy previews, Branch deploys)

4. **Deploy**:
   - Push to main branch (auto-deploys)
   - Or trigger deploy manually

#### Netlify Configuration

**`netlify.toml`**:
```toml
[build]
  command = "pnpm build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Render (Blueprint Deployment)

Aiva.io includes a `render.yaml` Blueprint specification for one-click deployment.

#### Quick Deploy

1. **Deploy with Blueprint**:
   - Go to [render.com/blueprints](https://dashboard.render.com/blueprints)
   - Click "New Blueprint Instance"
   - Connect your GitHub repository
   - Render auto-detects `render.yaml`

2. **Configure Environment Variables**:
   - Set required variables in Render Dashboard
   - See `.env.example` for complete list

3. **Verify Deployment**:
   - Check health endpoint: `https://your-app.onrender.com/api/health`

#### Manual Setup (Alternative)

1. **Create Web Service**:
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect repository

2. **Configure Service**:
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
   - **Start Command**: `pnpm start`
   - **Environment**: Node 20
   - **Health Check Path**: `/api/health`

3. **Environment Variables**:
   - Go to Environment → Environment Variables
   - Add all required variables (see [RENDER-DEPLOYMENT.md](./RENDER-DEPLOYMENT.md))

4. **Deploy**:
   - Auto-deploys on push to main
   - Manual deploy available

**For detailed Render deployment instructions, see [RENDER-DEPLOYMENT.md](./RENDER-DEPLOYMENT.md)**

## Pre-Deployment Checklist

### Database

- [ ] Supabase project created
- [ ] All migrations applied
- [ ] RLS policies tested
- [ ] Database types generated
- [ ] Seed data (if needed)

### Environment Variables

- [ ] All required variables set
- [ ] Production keys (not test keys)
- [ ] URLs point to production
- [ ] Secrets are secure

### Application

- [ ] Build succeeds locally
- [ ] Tests pass
- [ ] No console errors
- [ ] Type checking passes
- [ ] Linting passes

### Features

- [ ] Authentication works
- [ ] Workspaces work
- [ ] Projects work
- [ ] Billing (if enabled)
- [ ] Email sending
- [ ] File uploads

## Build Process

### Local Build Test

```bash
# Test build locally
pnpm build

# Test production server
pnpm start
```

### Build Optimization

1. **Bundle Analysis**:
   ```bash
   ANALYZE=true pnpm build
   ```

2. **Check Bundle Size**:
   - Review bundle analyzer output
   - Optimize large dependencies
   - Use dynamic imports

3. **Image Optimization**:
   - Use Next.js Image component
   - Optimize image sizes
   - Use appropriate formats

## Database Migrations

### Production Migrations

**Via Supabase Dashboard**:
1. Go to SQL Editor
2. Run migration SQL
3. Verify changes

**Via CLI**:
```bash
# Link to production
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

**Important**: Test migrations in staging first!

## Environment Configuration

### Production Variables

Set these for production:

```env
# Supabase (production)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_key
SUPABASE_SERVICE_ROLE_KEY=prod_key
SUPABASE_PROJECT_REF=xxx
SUPABASE_JWT_SECRET=prod_secret

# Site URL (production)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Stripe (production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Other services (production keys)
NEXT_PUBLIC_POSTHOG_API_KEY=prod_key
NEXT_PUBLIC_SENTRY_DSN=prod_dsn
```

### Webhook Configuration

**Stripe Webhooks**:
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhooks`
3. Select events to listen to
4. Copy webhook secret to environment variables

## Domain Configuration

### Custom Domain

1. **Add Domain**:
   - Vercel: Project Settings → Domains
   - Netlify: Site Settings → Domain Management
   - Render: Settings → Custom Domains

2. **DNS Configuration**:
   - Add CNAME or A record
   - Point to hosting platform
   - Wait for propagation

3. **SSL Certificate**:
   - Automatically provisioned
   - Usually takes a few minutes

### Subdomain Setup

For API or admin subdomains:
- Create subdomain DNS record
- Configure in hosting platform
- Update environment variables

## Monitoring & Analytics

### Error Tracking

**Sentry Setup**:
1. Create Sentry project
2. Add DSN to environment variables
3. Configure in `sentry.*.config.ts`

### Analytics

**PostHog Setup**:
1. Create PostHog project
2. Add API key to environment variables
3. Configure in application

**Google Analytics**:
1. Create GA4 property
2. Add Measurement ID to environment variables
3. Configure in application

## Performance Optimization

### Caching

- **Next.js Cache**: Automatic
- **CDN**: Automatic (Vercel/Netlify)
- **Database**: Connection pooling (Supabase)

### Database Optimization

- **Indexes**: Ensure proper indexes
- **Queries**: Optimize slow queries
- **Connection Pooling**: Use Supabase pooling

### Image Optimization

- Use Next.js Image component
- Optimize image sizes
- Use WebP format
- Lazy load images

## Security Checklist

- [ ] Environment variables secure
- [ ] RLS policies enabled
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting (if needed)
- [ ] Secrets rotated regularly

## Post-Deployment

### Verification

1. **Test Authentication**:
   - Sign up
   - Sign in
   - Password reset

2. **Test Features**:
   - Workspaces
   - Projects
   - Billing (if enabled)

3. **Check Logs**:
   - Application logs
   - Error tracking
   - Analytics

### Monitoring

- **Uptime**: Monitor site availability
- **Errors**: Check error tracking
- **Performance**: Monitor web vitals
- **Usage**: Track user activity

## Troubleshooting

### Build Failures

**Check**:
1. Build logs
2. Environment variables
3. Dependencies
4. Type errors

### Runtime Errors

**Check**:
1. Application logs
2. Error tracking (Sentry)
3. Database connection
4. Environment variables

### Database Issues

**Check**:
1. Connection string
2. RLS policies
3. Migrations applied
4. Database status

## Rollback Strategy

### Quick Rollback

**Vercel**:
- Go to Deployments
- Click "..." on previous deployment
- Select "Promote to Production"

**Netlify**:
- Go to Deploys
- Click "..." on previous deploy
- Select "Publish deploy"

**Render**:
- Go to Deploys
- Click "Rollback" on previous deploy

### Database Rollback

If migration causes issues:
1. Create reverse migration
2. Apply reverse migration
3. Verify data integrity

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
```

## Scaling

### Horizontal Scaling

- **Vercel**: Automatic
- **Netlify**: Automatic
- **Render**: Configure in settings

### Database Scaling

- **Supabase**: Automatic scaling
- **Connection Pooling**: Enabled
- **Read Replicas**: Available

## Further Reading

- [Environment Variables](./environment-variables.md) - Configuration
- [Development Guide](./development.md) - Development workflow
- [Troubleshooting](./troubleshooting.md) - Common issues

---

**Next Steps**:
- [Environment Variables](./environment-variables.md) - Configure production
- [Troubleshooting](./troubleshooting.md) - Resolve issues

