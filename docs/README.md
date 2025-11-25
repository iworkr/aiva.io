# Aiva.io / Nextbase Ultimate Documentation

Welcome to the comprehensive documentation for Aiva.io, built on Nextbase Ultimate - a production-ready SaaS template with Next.js, React, and Supabase.

## 📚 Documentation Index

### 🎯 Start Here (New Developers)
- [**Development Session History**](./DEVELOPMENT-SESSIONS.md) - **READ THIS FIRST** - Index of all major development sessions and architectural decisions
- [**Latest Session Briefing**](./development-briefings/2025-11-25-session-completion.md) - **November 25, 2025** - Most recent changes, features, and next steps
- [**Plan Gating System**](./plan-gating.md) - Complete guide to subscription-based feature access
- [**Post-Development Briefing**](./POST-DEVELOPMENT-BRIEFING.md) - Original handoff document with project status
- [**Getting Started Guide**](./getting-started.md) - Setup, installation, and first steps
- [**Project Overview**](./project-overview.md) - What is Nextbase and what it provides

### Architecture & Structure
- [**Architecture Overview**](./architecture.md) - System architecture and design patterns
- [**Project Structure**](./project-structure.md) - Codebase organization and file structure
- [**Database Schema**](./database-schema.md) - Complete database schema documentation

### Aiva.io Specific Features
- [**Plan-Based Feature Gating**](./plan-gating.md) - Subscription tiers and feature access control
- **Unified Inbox** - Multi-channel message management (see [latest briefing](./development-briefings/2025-11-25-session-completion.md))
- **Calendar System** - Event management with Aiva Calendar (see [latest briefing](./development-briefings/2025-11-25-session-completion.md))
- **Integration Management** - 14+ communication channels (see [src/lib/integrations/config.ts](../src/lib/integrations/config.ts))
- **AI Features** - Reply drafts, message classification, event extraction (Pro+ plans)

### Core Nextbase Features
- [**Authentication & Authorization**](./features/authentication.md) - User authentication and role management
- [**Workspaces & Multi-Tenancy**](./features/workspaces.md) - Multi-tenant workspace system
- [**Projects**](./features/projects.md) - Project management system
- [**AI Chat**](./features/ai-chat.md) - AI-powered chat functionality
- [**Billing & Subscriptions**](./features/billing.md) - Payment processing with Stripe
- [**Notifications**](./features/notifications.md) - Real-time notification system
- [**Activity Logs**](./features/activity-logs.md) - User activity tracking

### Marketing Features
- [**Blog System**](./features/blog.md) - Content management for blog posts
- [**Changelog**](./features/changelog.md) - Product changelog management
- [**Feedback System**](./features/feedback.md) - User feedback collection and management
- [**Roadmap**](./features/roadmap.md) - Product roadmap visualization

### Admin Features
- [**Admin Dashboard**](./features/admin.md) - Administrative features and controls
- [**User Management**](./features/user-management.md) - Managing users and permissions
- [**Workspace Management**](./features/workspace-management.md) - Overseeing workspaces

### Development
- [**Development Guide**](./development.md) - Development workflow and best practices
- [**API Reference**](./api.md) - API endpoints and server actions
- [**Testing Guide**](./testing.md) - Testing strategies and examples
- [**Environment Variables**](./environment-variables.md) - Configuration and environment setup

### Deployment
- [**Deployment Guide**](./deployment.md) - Production deployment instructions
- [**Troubleshooting**](./troubleshooting.md) - Common issues and solutions

### Additional Resources
- [**Contributing Guide**](./contributing.md) - How to contribute to Nextbase
- [**Migration Guide**](./migration-guide.md) - Upgrading between versions
- [**FAQ**](./faq.md) - Frequently asked questions

## 🚀 Quick Start

1. **New developer joining?** Start with [Development Session History](./DEVELOPMENT-SESSIONS.md)
2. **Working on subscriptions?** Read [Plan Gating Guide](./plan-gating.md)
3. **Calendar development?** See [Latest Session Briefing](./development-briefings/2025-11-25-session-completion.md#5-calendar-system-improvements-)
4. **Adding integrations?** Check [Integration Config](../src/lib/integrations/config.ts)
5. **New to Nextbase?** Start with the [Getting Started Guide](./getting-started.md)
6. **Understanding the architecture?** Read the [Architecture Overview](./architecture.md)

## 📖 Documentation Philosophy

This documentation is designed to be:
- **Comprehensive**: Covering all aspects of the platform
- **Practical**: Real-world examples and use cases
- **Up-to-date**: Reflecting the current codebase
- **Accessible**: Clear explanations for all skill levels

## 🔄 Documentation Updates

Documentation is maintained alongside the codebase. If you find any issues or have suggestions, please:
1. Check existing documentation first
2. Open an issue or pull request
3. Follow the [Contributing Guide](./contributing.md)

## 📝 Version Information

- **Aiva.io Version**: 1.0.0 (Production Ready)
- **Nextbase Ultimate Base**: 3.1.0
- **Last Major Update**: November 25, 2025
- **Documentation Last Updated**: November 25, 2025
- **Next.js Version**: 15.3.5
- **React Version**: 19.1.0

## 🎉 Latest Changes (November 25, 2025)

**Major Session Completed** - See [full briefing](./development-briefings/2025-11-25-session-completion.md)

**Highlights**:
- ✅ Plan-based feature gating system (Free/Basic/Pro/Enterprise)
- ✅ Tasks module removed and integrated into Calendar/Events
- ✅ 14 integrations configured with centralized management
- ✅ Green theme (#5CE65C) implemented throughout
- ✅ Calendar multi-day event rendering fixed
- ✅ Default Aiva Calendar for users without external connections
- ✅ Security: Server-side feature gating, admin key protection
- ✅ 40+ files modified, 9 created, 5 deleted
- ✅ Production-ready with comprehensive documentation

**Next Steps**: See [recommended next steps](./development-briefings/2025-11-25-session-completion.md#-recommended-next-steps) in the briefing.

---

**Note**: Aiva.io is built on Nextbase Ultimate and customized for unified AI communication management. This documentation covers both the Nextbase foundation and Aiva-specific features.

