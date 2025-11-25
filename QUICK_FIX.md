# Quick Fix: Database Setup

## Option 1: Use Full Path to pnpm

```bash
cd /Users/tlenterprises/Desktop/Aiva.io

# Login to Supabase
/Users/tlenterprises/Library/Application\ Support/Herd/config/nvm/versions/node/v22.16.0/bin/pnpm exec supabase login

# Link project
/Users/tlenterprises/Library/Application\ Support/Herd/config/nvm/versions/node/v22.16.0/bin/pnpm exec supabase link --project-ref lgyewlqzelxkpawnmiog

# Push migrations
/Users/tlenterprises/Library/Application\ Support/Herd/config/nvm/versions/node/v22.16.0/bin/pnpm exec supabase db push

# Generate types
/Users/tlenterprises/Library/Application\ Support/Herd/config/nvm/versions/node/v22.16.0/bin/pnpm generate:types
```

## Option 2: Add pnpm to PATH (Recommended)

Add this to your `~/.zshrc` file:

```bash
export PATH="/Users/tlenterprises/Library/Application Support/Herd/config/nvm/versions/node/v22.16.0/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Option 3: Use npm instead

Since npm is available, you can use it:

```bash
cd /Users/tlenterprises/Desktop/Aiva.io

# Login to Supabase
npm exec supabase login

# Link project
npm exec supabase link --project-ref lgyewlqzelxkpawnmiog

# Push migrations
npm exec supabase db push

# Generate types
npm run generate:types
```

## Option 4: Install pnpm globally

```bash
npm install -g pnpm
```

Then you can use `pnpm` directly.

---

**Recommended**: Use Option 3 (npm) for now since it's already working, or Option 4 to install pnpm globally.

