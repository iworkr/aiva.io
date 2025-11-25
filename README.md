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
npm install

# Start development server
npm run dev

# Generate TypeScript types from Supabase
npm run generate:types

# Run tests
npm test
```

See [docs/development.md](./docs/development.md) for complete development guide.

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
