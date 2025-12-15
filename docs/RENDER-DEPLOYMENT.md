# Render.com Deployment Guide

Complete guide to deploying Aiva.io to Render.com using the Blueprint specification.

## Overview

Aiva.io is configured for one-click deployment to Render.com using Infrastructure as Code (IaC) via the `render.yaml` Blueprint specification.

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Repository**: Code pushed to GitHub
2. **Render Account**: Free account at [render.com](https://render.com)
3. **Supabase Project**: Database already configured
4. **API Keys**: OpenAI, Stripe (optional), and integration keys ready

## Quick Start Deployment

### Step 1: Prepare Your Repository

```bash
# Ensure render.yaml is in the root directory
ls render.yaml

# Commit and push to GitHub
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 2: Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/blueprints)
2. Click **"New Blueprint Instance"**
3. Connect your GitHub repository
4. Select the repository containing `render.yaml`
5. Render will automatically detect the Blueprint

### Step 3: Configure Environment Variables

In the Render Dashboard, set these **required** environment variables:

#### Supabase (Required)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PROJECT_REF=your_project_ref
SUPABASE_JWT_SECRET=your_jwt_secret
```

#### Application (Required)
```
NEXT_PUBLIC_SITE_URL=https://aiva-web.onrender.com
ADMIN_EMAIL=admin@yourdomain.com
```

#### AI Features (Required)
```
OPENAI_API_KEY=sk-proj-your_openai_key
```

#### Optional Services
```
# Stripe (for billing)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# Google Integration
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Microsoft Integration
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=common
```

### Step 4: Deploy

Click **"Create Blueprint Instance"** to start the deployment.

Render will:
1. Clone your repository
2. Install dependencies (`pnpm install`)
3. Build the application (`pnpm build`)
4. Start the server (`pnpm start`)

## Blueprint Configuration

The `render.yaml` file configures:

### Web Service (`aiva-web`)

```yaml
- type: web
  name: aiva-web
  runtime: node
  region: oregon
  plan: starter
  buildCommand: pnpm install --frozen-lockfile && pnpm build
  startCommand: pnpm start
  healthCheckPath: /api/health
```

### Key Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Runtime | Node.js 20 | Required for Next.js 15 |
| Build Command | `pnpm install && pnpm build` | Installs deps and builds |
| Start Command | `pnpm start` | Runs Next.js production server |
| Health Check | `/api/health` | Verifies service health |
| Auto Deploy | Enabled | Deploys on push to main |

## Health Check Endpoint

The `/api/health` endpoint provides:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "3.1.0",
  "environment": "production",
  "uptime": 3600,
  "checks": {
    "application": { "status": "pass" },
    "environment": { "status": "pass" },
    "services": { "status": "info", "message": "Configured: stripe, openai" }
  }
}
```

### Health Check Options

- `GET /api/health` - Basic health check
- `GET /api/health?db=true` - Includes database connectivity check
- `HEAD /api/health` - Simple uptime monitoring

## Post-Deployment Configuration

### 1. Update Supabase Auth Settings

In Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://aiva-web.onrender.com
Redirect URLs:
- https://aiva-web.onrender.com/**
- https://aiva-web.onrender.com/auth/callback
```

### 2. Configure Stripe Webhooks

In Stripe Dashboard → Developers → Webhooks:

```
Endpoint URL: https://aiva-web.onrender.com/api/stripe/webhooks
Events:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed
```

### 3. Configure OAuth Providers

#### Google (Gmail & Calendar)

In Google Cloud Console → APIs & Services → Credentials:

```
Authorized redirect URIs:
- https://aiva-web.onrender.com/api/auth/gmail/callback
- https://your-supabase-project.supabase.co/auth/v1/callback
```

#### Microsoft (Outlook & Calendar)

In Azure Portal → App Registrations:

```
Redirect URIs:
- https://aiva-web.onrender.com/api/auth/outlook/callback
- https://your-supabase-project.supabase.co/auth/v1/callback
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl https://aiva-web.onrender.com/api/health

# Check with database verification
curl https://aiva-web.onrender.com/api/health?db=true
```

## Custom Domain

### Adding a Custom Domain

1. Go to Render Dashboard → Your Service → Settings → Custom Domains
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `app.aiva.io`)
4. Configure DNS as instructed:

```
# For apex domain (aiva.io)
A Record: 216.24.57.1

# For subdomain (app.aiva.io)
CNAME: aiva-web.onrender.com
```

5. Wait for SSL certificate provisioning (automatic)
6. Update `NEXT_PUBLIC_SITE_URL` environment variable

## Scaling

### Horizontal Scaling

In `render.yaml`:

```yaml
scaling:
  minInstances: 1
  maxInstances: 3
  targetMemoryPercent: 80
  targetCPUPercent: 80
```

### Upgrade Plan

For higher traffic, upgrade from `starter` to `standard` or `pro`:

```yaml
plan: standard  # $25/month, more resources
# or
plan: pro       # $85/month, dedicated CPU
```

## Monitoring

### Render Dashboard

- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Events**: Deploy events and rollbacks

### Application Monitoring

Recommended integrations:
- **Sentry**: Error tracking (add `SENTRY_DSN`)
- **PostHog**: Analytics (add `NEXT_PUBLIC_POSTHOG_API_KEY`)

## Troubleshooting

### Build Failures

```bash
# Check build logs in Render Dashboard
# Common issues:
# - Missing environment variables
# - pnpm lockfile mismatch
# - Node version incompatibility
```

**Fix**: Ensure `NODE_VERSION=20` is set and lockfile is committed.

### Health Check Failures

If health check fails:

1. Check logs for errors
2. Verify environment variables
3. Test endpoint manually:
   ```bash
   curl https://your-app.onrender.com/api/health
   ```

### Database Connection Issues

```bash
# Verify Supabase connection
curl "https://your-app.onrender.com/api/health?db=true"
```

Check:
- `NEXT_PUBLIC_SUPABASE_URL` is correct
- `SUPABASE_SERVICE_ROLE_KEY` has proper permissions
- Supabase project is not paused

### Memory Issues

If you see out-of-memory errors:
- Upgrade to a higher plan
- Optimize bundle size: `ANALYZE=true pnpm build`
- Check for memory leaks

## Rollback

To rollback to a previous deployment:

1. Go to Render Dashboard → Your Service → Deploys
2. Find the previous successful deploy
3. Click "..." → "Rollback"

## Cost Estimation

| Plan | Cost | Resources | Best For |
|------|------|-----------|----------|
| Free | $0 | 512MB, spin down after inactivity | Testing |
| Starter | $7/mo | 512MB, always on | Development |
| Standard | $25/mo | 2GB RAM, 0.5 CPU | Production |
| Pro | $85/mo | 4GB RAM, 1 CPU | High traffic |

## CI/CD Pipeline

Render automatically deploys on push to `main`. For advanced CI/CD:

```yaml
# .github/workflows/render-deploy.yml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      # Run tests before deploy
      - run: pnpm install
      - run: pnpm lint:ci
      - run: pnpm build
      
      # Render auto-deploys on push, but you can trigger manually:
      - name: Trigger Render Deploy
        run: |
          curl -X POST "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}"
```

## Security Checklist

Before going live:

- [ ] All secrets stored in Render environment variables (not in code)
- [ ] `NEXT_PUBLIC_SITE_URL` points to production domain
- [ ] OAuth redirect URLs updated for production
- [ ] Stripe webhooks configured for production
- [ ] RLS policies tested
- [ ] Error tracking enabled (Sentry)
- [ ] SSL certificate verified (automatic on Render)

## Support

- **Render Documentation**: https://render.com/docs
- **Render Status**: https://status.render.com
- **Community**: https://community.render.com

---

**Next Steps**:
- [Architecture Overview](./ARCHITECTURE-OVERVIEW.md) - Understand the system
- [Environment Variables](./environment-variables.md) - Complete variable reference
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

