# Projects

Complete guide to the project management system in Nextbase Ultimate.

## Overview

Projects are the core organizational unit within workspaces. Each project belongs to a workspace and can have multiple members, comments, and AI chat conversations.

## Project Structure

### Core Tables

- **`projects`**: Main project table
- **`project_comments`**: Threaded comments on projects
- **`chats`**: AI chat conversations per project

### Project Status

Projects have statuses that track their lifecycle:

- **`draft`**: Initial state, not yet active
- **`pending_approval`**: Awaiting approval
- **`approved`**: Approved and active
- **`completed`**: Finished/completed

## Creating Projects

### Basic Creation

```typescript
import { createProjectAction } from "@/data/user/projects";

const project = await createProjectAction({
  workspaceId: "workspace-id",
  name: "My Project",
  slug: "my-project" // Optional, auto-generated if not provided
});
```

### With Status

```typescript
const project = await createProjectAction({
  workspaceId: "workspace-id",
  name: "My Project",
  slug: "my-project"
});

// Update status separately
await updateProjectStatusAction({
  projectId: project.id,
  status: "approved"
});
```

## Project Access

### Getting Projects

**For Workspace**:
```typescript
import { getProjectsForWorkspace } from "@/data/user/projects";

const projects = await getProjectsForWorkspace(workspaceId);
```

**By Slug**:
```typescript
import { getCachedProjectBySlug } from "@/data/user/projects";

const project = await getCachedProjectBySlug(slug);
```

**Slim Project** (for lists):
```typescript
import { getSlimProjectBySlugForWorkspace } from "@/data/user/projects";

const project = await getSlimProjectBySlugForWorkspace(slug, workspaceId);
```

### Filtering Projects

**By Status**:
```typescript
import { getProjectsClient } from "@/data/user/client/projects";

const projects = await getProjectsClient({
  workspaceId: "workspace-id",
  filters: {
    status: "approved"
  }
});
```

**By Search**:
```typescript
const projects = await getProjectsClient({
  workspaceId: "workspace-id",
  filters: {
    search: "keyword"
  }
});
```

## Updating Projects

### Update Project

```typescript
import { updateProjectAction } from "@/data/user/projects";

await updateProjectAction({
  projectId: "project-id",
  name: "Updated Name",
  slug: "updated-slug"
});
```

### Update Status

```typescript
import { updateProjectStatusAction } from "@/data/user/projects";

await updateProjectStatusAction({
  projectId: "project-id",
  status: "approved"
});
```

## Project Comments

### Creating Comments

**Top-Level Comment**:
```typescript
import { createProjectCommentAction } from "@/data/user/projects";

const comment = await createProjectCommentAction({
  projectId: "project-id",
  text: "This is a comment"
});
```

**Reply to Comment**:
```typescript
const reply = await createProjectCommentAction({
  projectId: "project-id",
  text: "This is a reply",
  inReplyTo: "parent-comment-id"
});
```

### Getting Comments

```typescript
import { getProjectComments } from "@/data/user/projects";

const comments = await getProjectComments(projectId);
// Returns: Array of comments with user profiles
// Includes nested replies via in_reply_to
```

### Updating Comments

```typescript
import { updateProjectCommentAction } from "@/data/user/projects";

await updateProjectCommentAction({
  commentId: "comment-id",
  text: "Updated comment text"
});
```

### Deleting Comments

**Own Comment**:
```typescript
import { deleteProjectCommentAction } from "@/data/user/projects";

await deleteProjectCommentAction({
  commentId: "comment-id"
});
```

**Any Comment** (Admin only):
Workspace admins can delete any comment via the same action.

## Project Permissions

### Workspace Members

All workspace members can:
- View projects in their workspace
- Create projects
- Update projects
- Create comments
- Update/delete their own comments

### Workspace Admins

Admins additionally can:
- Delete projects
- Delete any comment
- Manage project settings

### Checking Permissions

```typescript
import { isWorkspaceMember } from "@/data/user/workspaces";
import { getProjectWorkspaceId } from "@/data/user/projects";

const workspaceId = await getProjectWorkspaceId(projectId);
const canAccess = await isWorkspaceMember(userId, workspaceId);
```

## Project Routing

### URL Structure

Projects are accessed via:
```
/project/[projectSlug]
```

### Page Components

**Project Page**:
```tsx
// src/app/[locale]/.../project/[projectSlug]/page.tsx
export default async function ProjectPage({ params }) {
  const { projectSlug } = await params;
  const project = await getCachedProjectBySlug(projectSlug);
  
  return <ProjectView project={project} />;
}
```

**Project Sidebar**:
```tsx
// src/app/[locale]/.../project/[projectSlug]/@sidebar/ProjectSidebar.tsx
export async function ProjectSidebar({ params }) {
  const { projectSlug } = await params;
  const project = await getCachedProjectBySlug(projectSlug);
  
  return <Sidebar project={project} />;
}
```

## Project Components

### Project List

```tsx
import { ProjectsCardList } from "@/components/Projects/ProjectsCardList";

<ProjectsCardList 
  projects={projects}
  workspaceId={workspaceId}
/>
```

### Project Card

```tsx
import { ProjectCard } from "@/components/Projects/ProjectCard";

<ProjectCard 
  project={project}
  workspace={workspace}
/>
```

### Comments List

```tsx
import { CommentList } from "@/components/Projects/CommentList";

<CommentList 
  comments={comments}
  projectId={projectId}
/>
```

## Project Deletion

**Delete Project** (Admin only):
```typescript
import { deleteProjectAction } from "@/data/user/projects";

await deleteProjectAction({
  projectId: "project-id"
});
```

**What Happens**:
- Project deleted
- All comments cascade deleted
- All chats cascade deleted
- Workspace remains intact

## Best Practices

### 1. Always Check Workspace Access

Before accessing project data:
```typescript
const workspaceId = await getProjectWorkspaceId(projectId);
const isMember = await isWorkspaceMember(userId, workspaceId);
if (!isMember) {
  throw new Error("Not a workspace member");
}
```

### 2. Use RLS Policies

RLS provides automatic filtering:
- Projects filtered by workspace
- Comments filtered by project workspace
- Automatic permission checks

### 3. Validate Project Slug

Ensure slug uniqueness:
```typescript
import { RESTRICTED_SLUG_NAMES } from "@/constants";
import { SLUG_PATTERN } from "@/constants";

if (RESTRICTED_SLUG_NAMES.includes(slug)) {
  throw new Error("Slug is restricted");
}

if (!SLUG_PATTERN.test(slug)) {
  throw new Error("Invalid slug format");
}
```

### 4. Handle Comment Threading

Comments support threading via `in_reply_to`:
```typescript
// Build comment tree
function buildCommentTree(comments) {
  const map = new Map();
  const roots = [];
  
  comments.forEach(comment => {
    map.set(comment.id, { ...comment, replies: [] });
  });
  
  comments.forEach(comment => {
    if (comment.in_reply_to) {
      const parent = map.get(comment.in_reply_to);
      if (parent) {
        parent.replies.push(map.get(comment.id));
      }
    } else {
      roots.push(map.get(comment.id));
    }
  });
  
  return roots;
}
```

## Integration with AI Chat

Projects have AI chat functionality. See [AI Chat](./ai-chat.md) for details.

## API Reference

### Server Actions

- `createProjectAction`
- `updateProjectAction`
- `updateProjectStatusAction`
- `deleteProjectAction`
- `createProjectCommentAction`
- `updateProjectCommentAction`
- `deleteProjectCommentAction`

### Queries

- `getProjectsForWorkspace`
- `getCachedProjectBySlug`
- `getSlimProjectBySlugForWorkspace`
- `getProjectComments`
- `getProjectWorkspaceId`

## Further Reading

- [Workspaces & Multi-Tenancy](./workspaces.md) - Workspace context
- [AI Chat](./ai-chat.md) - Project AI chat
- [Development Guide](../development.md) - Development workflow

---

**Next Steps**:
- [AI Chat](./ai-chat.md) - Add AI chat to projects
- [Workspaces & Multi-Tenancy](./workspaces.md) - Understand workspace context

