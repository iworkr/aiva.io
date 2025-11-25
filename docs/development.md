# Development Guide

Complete guide to developing with Nextbase Ultimate.

## Development Workflow

### 1. Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Start Supabase locally
supabase start

# Run migrations
supabase migration up

# Generate types
pnpm generate:types:local

# Start development server
pnpm dev
```

### 2. Development Server

```bash
# Standard development
pnpm dev

# Debug mode
pnpm dev:debug
```

The development server runs on `http://localhost:3000`.

## Code Organization

### Adding New Features

#### 1. Database Changes

```bash
# Create migration
supabase migration new feature_name

# Edit migration file
# supabase/migrations/TIMESTAMP_feature_name.sql

# Apply migration
supabase migration up

# Generate types
pnpm generate:types:local
```

#### 2. Data Layer

Create server actions in `src/data/`:

```typescript
// src/data/user/new-feature.ts
import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const createFeatureSchema = z.object({
  name: z.string().min(1),
  workspaceId: z.string().uuid()
});

export const createFeatureAction = authActionClient
  .schema(createFeatureSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const supabase = await createSupabaseUserServerActionClient();
    
    const { data, error } = await supabase
      .from("features")
      .insert({
        name: parsedInput.name,
        workspace_id: parsedInput.workspaceId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return data;
  });
```

#### 3. Components

Create components in `src/components/`:

```typescript
// src/components/NewFeature/NewFeature.tsx
"use client";

import { useAction } from "next-safe-action/hooks";
import { createFeatureAction } from "@/data/user/new-feature";

export function NewFeature({ workspaceId }: { workspaceId: string }) {
  const { execute, status } = useAction(createFeatureAction);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    execute({
      name: formData.get("name") as string,
      workspaceId
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <button type="submit" disabled={status === "executing"}>
        Create
      </button>
    </form>
  );
}
```

#### 4. Pages

Create pages in `src/app/`:

```typescript
// src/app/[locale]/.../new-feature/page.tsx
import { NewFeature } from "@/components/NewFeature";
import { getWorkspaceById } from "@/data/user/workspaces";

export default async function NewFeaturePage({ params }) {
  const { workspaceId } = await params;
  const workspace = await getWorkspaceById(workspaceId);

  return (
    <div>
      <h1>New Feature</h1>
      <NewFeature workspaceId={workspace.id} />
    </div>
  );
}
```

## Type Safety

### Database Types

Types are generated from Supabase schema:

```typescript
import type { DBTable } from "@/types";

type Project = DBTable<"projects">;
type ProjectInsert = DBTableInsertPayload<"projects">;
type ProjectUpdate = DBTableUpdatePayload<"projects">;
```

### Server Actions

Server actions are type-safe:

```typescript
import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  name: z.string()
});

export const action = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    // parsedInput is typed
    // ctx.userId is typed
  });
```

### Form Validation

Use Zod schemas for validation:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export function Form() {
  const form = useForm({
    resolver: zodResolver(schema)
  });

  // Form is type-safe
}
```

## Data Fetching

### Server Components

Fetch data in Server Components:

```typescript
// Server Component
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Server Actions

Use server actions for mutations:

```typescript
"use client";
import { useAction } from "next-safe-action/hooks";

export function Component() {
  const { execute } = useAction(serverAction);
  
  return <button onClick={() => execute({ data })}>Submit</button>;
}
```

### React Query

Use React Query for client-side data:

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";

export function Component() {
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: fetchData
  });
  
  return <div>{data}</div>;
}
```

## Authentication

### Getting Current User

**Server Component**:
```typescript
import { createSupabaseUserServerComponentClient } from "@/supabase-clients/user/createSupabaseUserServerComponentClient";

const supabase = await createSupabaseUserServerComponentClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Server Action**:
```typescript
import { authActionClient } from "@/lib/safe-action";

export const action = authActionClient.action(async ({ ctx }) => {
  const userId = ctx.userId; // Already authenticated
});
```

### Checking Permissions

```typescript
import { isWorkspaceMember } from "@/data/user/workspaces";

const canAccess = await isWorkspaceMember(userId, workspaceId);
if (!canAccess) {
  throw new Error("Unauthorized");
}
```

## Error Handling

### Server Actions

Errors are automatically handled:

```typescript
export const action = authActionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    try {
      // Operation
    } catch (error) {
      throw new Error("Operation failed");
    }
  });
```

### Client-Side

```typescript
const { execute, result } = useAction(action);

useEffect(() => {
  if (result?.serverError) {
    toast.error(result.serverError);
  }
}, [result]);
```

## Testing

### Unit Tests

```typescript
// src/utils/helpers.test.ts
import { describe, it, expect } from "vitest";
import { helperFunction } from "./helpers";

describe("helperFunction", () => {
  it("should work correctly", () => {
    expect(helperFunction()).toBe(expected);
  });
});
```

### E2E Tests

```typescript
// e2e/user/feature.spec.ts
import { test, expect } from "@playwright/test";

test("feature works", async ({ page }) => {
  await page.goto("/feature");
  await expect(page.locator("h1")).toBeVisible();
});
```

## Code Quality

### Linting

```bash
# Run ESLint
pnpm lint:eslint

# Fix issues
pnpm lint:eslint --fix
```

### Formatting

```bash
# Format with Prettier
pnpm lint:prettier

# Format and fix
pnpm lint
```

### Type Checking

```bash
# Check types
pnpm tsc
```

## Best Practices

### 1. Use Server Components

Prefer Server Components when possible:
- Better performance
- Smaller bundle size
- SEO friendly

### 2. Validate on Server

Always validate server-side:
```typescript
export const action = authActionClient
  .schema(z.object({ email: z.string().email() }))
  .action(async ({ parsedInput }) => {
    // Input is validated
  });
```

### 3. Use RLS

Always use RLS policies:
- Database-level security
- Automatic filtering
- Workspace isolation

### 4. Type Everything

Use TypeScript types:
- Generated database types
- Zod schemas
- Type inference

### 5. Handle Errors

Proper error handling:
- Server-side validation
- Client-side feedback
- User-friendly messages

### 6. Test Thoroughly

Write tests for:
- Critical paths
- Edge cases
- User flows

## Debugging

### Server-Side

```typescript
// Add logging
console.log("Debug:", data);

// Use debugger
debugger;
```

### Client-Side

```typescript
// Browser DevTools
console.log("Debug:", data);

// React DevTools
// Inspect component state
```

### Database

```sql
-- Query directly
SELECT * FROM projects WHERE workspace_id = 'xxx';

-- Check RLS
SET ROLE authenticated;
SELECT * FROM projects;
```

## Performance

### Optimization Tips

1. **Use Caching**: React Query, Next.js cache
2. **Code Splitting**: Dynamic imports
3. **Image Optimization**: Next.js Image component
4. **Database Indexes**: Strategic indexing
5. **Lazy Loading**: Load components on demand

### Monitoring

- **Vercel Analytics**: Web vitals
- **PostHog**: User analytics
- **Sentry**: Error tracking

## Common Patterns

### Form Handling

```typescript
"use client";
import { useForm } from "react-hook-form";
import { useAction } from "next-safe-action/hooks";

export function Form() {
  const form = useForm();
  const { execute } = useAction(action);

  const onSubmit = form.handleSubmit((data) => {
    execute(data);
  });

  return <form onSubmit={onSubmit}>...</form>;
}
```

### Loading States

```typescript
const { execute, status } = useAction(action);

<button disabled={status === "executing"}>
  {status === "executing" ? "Loading..." : "Submit"}
</button>
```

### Error Display

```typescript
const { execute, result } = useAction(action);

{result?.serverError && (
  <div className="error">{result.serverError}</div>
)}
```

## Further Reading

- [Architecture Overview](./architecture.md) - System design
- [Project Structure](./project-structure.md) - Code organization
- [Feature Documentation](./features/) - Feature guides

---

**Next Steps**:
- [Environment Variables](./environment-variables.md) - Configuration
- [Deployment Guide](./deployment.md) - Production deployment

