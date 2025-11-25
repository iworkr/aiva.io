# Aiva.io Setup Instructions

## ✅ Completed Steps

1. ✅ Created `.env.local` with Supabase credentials
2. ✅ Installed all project dependencies (`pnpm install`)
3. ✅ Installed Supabase CLI

## ⚠️ Manual Steps Required

### 1. Link Supabase Project

The Supabase project needs to be linked. Run this command in your terminal:

```bash
pnpm exec supabase link --project-ref lgyewlqzelxkpawnmiog
```

When prompted for the database password, use: `8XC7lkl75hKzCOzY`

**Note**: You may need to authenticate with Supabase first:
```bash
pnpm exec supabase login
```

### 2. Push Migrations (if needed)

After linking, verify all migrations are applied:

```bash
pnpm exec supabase db push
```

### 3. Generate TypeScript Types

After linking, generate types from the database:

```bash
pnpm generate:types
```

## 🚀 Starting Development

Once Supabase is linked, you can start the development server:

```bash
pnpm dev
```

The app will be available at: http://localhost:3000

## 📝 Environment Variables

All required environment variables are set in `.env.local`:
- ✅ Supabase URL and keys
- ✅ Project reference
- ✅ JWT secret
- ⚠️ Stripe keys (add when implementing billing)
- ⚠️ OpenAI key (add when implementing AI features)
- ⚠️ Other optional services (PostHog, Sentry, etc.)

## 🔍 Troubleshooting

### Supabase Link Issues

If linking fails:
1. Make sure you're authenticated: `pnpm exec supabase login`
2. Verify project reference is correct: `lgyewlqzelxkpawnmiog`
3. Check database password: `8XC7lkl75hKzCOzY`

### Type Generation Issues

If type generation fails:
1. Ensure Supabase is linked: `pnpm exec supabase link --project-ref lgyewlqzelxkpawnmiog`
2. Verify connection: Check Supabase dashboard
3. Try regenerating: `pnpm generate:types`

### Development Server Issues

If the dev server fails:
1. Check `.env.local` exists and has correct values
2. Verify all dependencies are installed: `pnpm install`
3. Check for TypeScript errors: `pnpm tsc`
4. Ensure Supabase is linked and types are generated

## 📚 Next Steps

1. Complete Supabase linking (see above)
2. Generate types
3. Start development server
4. Begin building Aiva.io features!

