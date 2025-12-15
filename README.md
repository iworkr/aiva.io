# Aiva.io

**A unified AI communication assistant** that integrates with multiple communication channels (Gmail, Outlook, Slack, etc.) to provide intelligent message management, automated scheduling, task extraction, and AI-powered responses.

Built on **Nextbase Ultimate v3.1.0** - a production-ready SaaS foundation.

## 🚀 Quick Start for Developers

**New to the project?** Start here:

1. **[DEVELOPER-HANDOFF.md](./DEVELOPER-HANDOFF.md)** - Quick reference guide
2. **[docs/POST-DEVELOPMENT-BRIEFING.md](./docs/POST-DEVELOPMENT-BRIEFING.md)** - Complete handoff document with current status, architecture, and next steps

## 📚 Documentation

- **[Complete Documentation](./docs/README.md)** - Full documentation index
- **[Getting Started](./docs/getting-started.md)** - Setup and installation
- **[Architecture](./docs/architecture.md)** - System design and patterns
- **[Product Vision](./docs/idea/complete/)** - Aiva.io concept and requirements

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Payments**: Stripe (ready, not configured)
- **AI**: OpenAI (ready, needs API key)
- **Testing**: Playwright, Vitest

## ✅ Current Status

**Foundation Complete** - Ready for feature development

- ✅ Authentication & authorization
- ✅ Multi-tenant workspace system
- ✅ Database configured with RLS policies
- ✅ Landing page (conversion-focused)
- ✅ Development environment set up
- ✅ Comprehensive documentation

**Next Phase**: Implement core Aiva.io features (Gmail/Outlook integration, unified inbox, AI assistant)

## 📖 Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Generate TypeScript types from Supabase
pnpm generate:types

# Run tests
pnpm test
```

See [docs/development.md](./docs/development.md) for complete development guide.

## 🚀 Deployment

### Deploy to Render (Recommended)

One-click deployment using Blueprint:

1. Push code to GitHub
2. Go to [Render Blueprints](https://dashboard.render.com/blueprints)
3. Click "New Blueprint Instance"
4. Connect your repository (Render auto-detects `render.yaml`)
5. Configure environment variables
6. Deploy!

```bash
# Verify deployment
curl https://your-app.onrender.com/api/health
```

### Other Platforms

- **Vercel**: `vercel deploy`
- **Netlify**: Auto-deploys with `netlify.toml`

See [docs/RENDER-DEPLOYMENT.md](./docs/RENDER-DEPLOYMENT.md) for detailed deployment guide.

## 🔑 Important Notes

- **Supabase Project**: `lgyewlqzelxkpawnmiog` (already configured)
- **Environment Variables**: See `.env.local` template
- **Database Migrations**: Always push immediately after creation
- **Architecture**: Server Components first, workspace-scoped features

## 📝 Project Foundation

This project is built on **Nextbase Ultimate v3.1.0**, which provides:
- Multi-tenant workspace system
- Authentication & authorization
- Project management with AI chat
- Billing & subscriptions (Stripe)
- Marketing features (blog, changelog, feedback)
- Admin dashboard
- Real-time notifications

**Aiva.io-specific features** are being built on top of this foundation.

---

**For detailed information, see [docs/POST-DEVELOPMENT-BRIEFING.md](./docs/POST-DEVELOPMENT-BRIEFING.md)**
