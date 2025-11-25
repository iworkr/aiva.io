# API Reference

Complete API reference for Nextbase Ultimate.

## Overview

Nextbase uses Next.js Server Actions for mutations and Server Components for queries. API routes are used for webhooks and external integrations.

## Server Actions

Server Actions are type-safe server-side functions that can be called from client components.

### Authentication Actions

**Location**: `src/data/auth/auth.ts`

#### `signUpWithPasswordAction`

Sign up with email and password.

```typescript
await signUpWithPasswordAction({
  email: string;
  password: string;
  next?: string; // Optional redirect URL
});
```

#### `signInWithPasswordAction`

Sign in with email and password.

```typescript
await signInWithPasswordAction({
  email: string;
  password: string;
});
```

#### `signInWithMagicLinkAction`

Sign in with magic link.

```typescript
await signInWithMagicLinkAction({
  email: string;
  shouldCreateUser?: boolean;
  next?: string;
});
```

#### `signInWithProviderAction`

Sign in with OAuth provider.

```typescript
const { url } = await signInWithProviderAction({
  provider: "google" | "github" | "twitter";
  next?: string;
});
```

#### `resetPasswordAction`

Request password reset.

```typescript
await resetPasswordAction({
  email: string;
});
```

### Workspace Actions

**Location**: `src/data/user/workspaces.ts`

#### `createWorkspaceAction`

Create a new workspace.

```typescript
const workspace = await createWorkspaceAction({
  name: string;
  slug?: string;
  workspaceType: "solo" | "team";
  isOnboardingFlow?: boolean;
});
```

#### `updateWorkspaceAction`

Update workspace details.

```typescript
await updateWorkspaceAction({
  workspaceId: string;
  name?: string;
  slug?: string;
});
```

#### `deleteWorkspaceAction`

Delete a workspace (owner only).

```typescript
await deleteWorkspaceAction({
  workspaceId: string;
});
```

#### `inviteUserToWorkspaceAction`

Invite user to workspace.

```typescript
await inviteUserToWorkspaceAction({
  workspaceId: string;
  email: string;
  role: "owner" | "admin" | "member" | "readonly";
});
```

#### `removeWorkspaceMemberAction`

Remove member from workspace (admin/owner only).

```typescript
await removeWorkspaceMemberAction({
  workspaceId: string;
  memberId: string;
});
```

#### `updateWorkspaceMemberRoleAction`

Update member role (admin/owner only).

```typescript
await updateWorkspaceMemberRoleAction({
  workspaceId: string;
  memberId: string;
  role: "owner" | "admin" | "member" | "readonly";
});
```

#### `setDefaultWorkspaceAction`

Set default workspace for user.

```typescript
await setDefaultWorkspaceAction({
  workspaceId: string;
});
```

### Project Actions

**Location**: `src/data/user/projects.tsx`

#### `createProjectAction`

Create a new project.

```typescript
const project = await createProjectAction({
  workspaceId: string;
  name: string;
  slug?: string;
});
```

#### `updateProjectAction`

Update project details.

```typescript
await updateProjectAction({
  projectId: string;
  name?: string;
  slug?: string;
});
```

#### `updateProjectStatusAction`

Update project status.

```typescript
await updateProjectStatusAction({
  projectId: string;
  status: "draft" | "pending_approval" | "approved" | "completed";
});
```

#### `deleteProjectAction`

Delete a project (admin only).

```typescript
await deleteProjectAction({
  projectId: string;
});
```

#### `createProjectCommentAction`

Create a comment on a project.

```typescript
const comment = await createProjectCommentAction({
  projectId: string;
  text: string;
  inReplyTo?: string; // Optional parent comment ID
});
```

#### `updateProjectCommentAction`

Update a comment (owner only).

```typescript
await updateProjectCommentAction({
  commentId: string;
  text: string;
});
```

#### `deleteProjectCommentAction`

Delete a comment (owner or admin).

```typescript
await deleteProjectCommentAction({
  commentId: string;
});
```

### Chat Actions

**Location**: `src/data/user/chats.ts`

#### `insertChatAction`

Create a new chat.

```typescript
const chat = await insertChatAction({
  id: string;
  projectId: string;
  userId: string;
});
```

#### `upsertChatAction`

Save or update chat messages.

```typescript
await upsertChatAction({
  chatId: string;
  projectId: string;
  payload: Message[]; // Array of message objects
});
```

### Billing Actions

**Location**: `src/data/user/billing.tsx`

#### `createCheckoutSessionAction`

Create Stripe checkout session.

```typescript
const { url } = await createCheckoutSessionAction({
  workspaceId: string;
  priceId: string;
  options?: {
    freeTrialDays?: number;
  };
});
```

#### `createCustomerPortalSessionAction`

Create Stripe customer portal session.

```typescript
const { url } = await createCustomerPortalSessionAction({
  workspaceId: string;
});
```

#### `cancelSubscriptionAction`

Cancel a subscription.

```typescript
await cancelSubscriptionAction({
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
});
```

## Server Queries

Server queries are functions used in Server Components to fetch data.

### Workspace Queries

**Location**: `src/data/user/workspaces.ts`

#### `getWorkspaceById`

Get workspace by ID.

```typescript
const workspace = await getWorkspaceById(workspaceId: string);
```

#### `getCachedSlimWorkspaces`

Get user's workspaces (cached).

```typescript
const workspaces = await getCachedSlimWorkspaces();
// Returns: SlimWorkspace[]
```

#### `getWorkspaceMembers`

Get workspace members.

```typescript
const members = await getWorkspaceMembers(workspaceId: string);
```

#### `isWorkspaceMember`

Check if user is workspace member.

```typescript
const isMember = await isWorkspaceMember(
  userId: string,
  workspaceId: string
);
```

#### `isWorkspaceAdmin`

Check if user is workspace admin/owner.

```typescript
const isAdmin = await isWorkspaceAdmin(
  userId: string,
  workspaceId: string
);
```

#### `getLoggedInUserWorkspaceRole`

Get user's role in workspace.

```typescript
const role = await getLoggedInUserWorkspaceRole(workspaceId: string);
// Returns: "owner" | "admin" | "member" | "readonly"
```

### Project Queries

**Location**: `src/data/user/projects.tsx`

#### `getProjectsForWorkspace`

Get all projects for workspace.

```typescript
const projects = await getProjectsForWorkspace(workspaceId: string);
```

#### `getCachedProjectBySlug`

Get project by slug (cached).

```typescript
const project = await getCachedProjectBySlug(slug: string);
```

#### `getProjectComments`

Get comments for project.

```typescript
const comments = await getProjectComments(projectId: string);
```

### Chat Queries

**Location**: `src/data/user/chats.ts`

#### `getChatById`

Get chat by ID.

```typescript
const chat = await getChatById(chatId: string);
```

#### `getChatsForProject`

Get all chats for project.

```typescript
const chats = await getChatsForProject(projectId: string);
```

## API Routes

API routes are Next.js API endpoints for webhooks and external integrations.

### Stripe Webhooks

**Route**: `/api/stripe/webhooks`

**Method**: `POST`

**Purpose**: Handle Stripe webhook events

**Headers**:
- `stripe-signature`: Webhook signature

**Body**: Raw webhook event

### User API

**Route**: `/api/v1/me`

**Method**: `GET`

**Purpose**: Get current user (API key auth)

**Headers**:
- `Authorization`: Bearer token (Unkey API key)

**Response**:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  ...
}
```

## Using Server Actions

### From Client Components

```typescript
"use client";
import { useAction } from "next-safe-action/hooks";
import { createProjectAction } from "@/data/user/projects";

export function CreateProjectForm() {
  const { execute, status, result } = useAction(createProjectAction);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    execute({
      workspaceId: formData.get("workspaceId") as string,
      name: formData.get("name") as string
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={status === "executing"}>
        Create
      </button>
      {result?.serverError && (
        <div className="error">{result.serverError}</div>
      )}
    </form>
  );
}
```

### From Server Components

```typescript
import { createProjectAction } from "@/data/user/projects";

export default async function Page() {
  async function handleCreate(formData: FormData) {
    "use server";
    await createProjectAction({
      workspaceId: formData.get("workspaceId") as string,
      name: formData.get("name") as string
    });
  }

  return (
    <form action={handleCreate}>
      {/* Form fields */}
    </form>
  );
}
```

## Error Handling

### Server Action Errors

Server actions automatically handle errors:

```typescript
const { execute, result } = useAction(action);

// Check for errors
if (result?.serverError) {
  console.error(result.serverError);
}

// Check for validation errors
if (result?.validationErrors) {
  console.error(result.validationErrors);
}
```

### Custom Error Handling

```typescript
export const action = authActionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    try {
      // Operation
    } catch (error) {
      throw new Error("Custom error message");
    }
  });
```

## Type Safety

All server actions are fully typed:

```typescript
// Input is typed
const { execute } = useAction(createProjectAction);

execute({
  workspaceId: "workspace-id", // TypeScript checks this
  name: "Project Name" // TypeScript checks this
});

// Result is typed
const { result } = useAction(action);
// result.data is typed based on action return type
```

## Further Reading

- [Development Guide](./development.md) - Development workflow
- [Feature Documentation](./features/) - Feature-specific APIs
- [next-safe-action Documentation](https://next-safe-action.dev)

---

**Next Steps**:
- [Development Guide](./development.md) - Learn to use APIs
- [Feature Documentation](./features/) - Feature-specific guides

