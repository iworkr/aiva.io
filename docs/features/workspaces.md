# Workspaces & Multi-Tenancy

Complete guide to the multi-tenant workspace system in Nextbase Ultimate.

## Overview

Nextbase implements a robust multi-tenant architecture using workspace-based isolation. Each workspace is completely isolated with its own members, projects, and settings.

## Workspace Types

### Solo Workspaces

Individual workspaces for single users:
- Created during onboarding
- Single member (owner)
- Can be upgraded to team workspace

### Team Workspaces

Collaborative workspaces with multiple members:
- Multiple members with different roles
- Shared resources
- Team collaboration features

## Workspace Structure

### Core Tables

- **`workspaces`**: Main workspace table
- **`workspace_members`**: Team members and roles
- **`workspace_invitations`**: Email invitations
- **`workspace_settings`**: Member-accessible settings
- **`workspace_admin_settings`**: Admin-only settings
- **`workspace_application_settings`**: App-managed settings

### Workspace Members

Each workspace has members with roles:

**Roles**:
- **Owner**: Full control, cannot be removed
- **Admin**: Administrative access, can manage members
- **Member**: Standard access, can create/edit content
- **Readonly**: Read-only access

## Creating Workspaces

### During Onboarding

Workspaces are created during the onboarding flow:

```typescript
import { createWorkspaceAction } from "@/data/user/workspaces";

const workspace = await createWorkspaceAction({
  name: "My Workspace",
  slug: "my-workspace", // Optional, auto-generated if not provided
  workspaceType: "solo", // or "team"
  isOnboardingFlow: true
});
```

### Programmatically

```typescript
import { createWorkspaceAction } from "@/data/user/workspaces";

const workspace = await createWorkspaceAction({
  name: "New Workspace",
  workspaceType: "team"
});
```

**What Happens**:
1. Workspace created
2. Creator added as owner
3. Membership type set
4. Default workspace set (if first workspace)

## Workspace Membership

### Adding Members

**Via Invitation**:
```typescript
import { inviteUserToWorkspaceAction } from "@/data/user/workspaces";

await inviteUserToWorkspaceAction({
  workspaceId: "workspace-id",
  email: "user@example.com",
  role: "member" // 'owner' | 'admin' | 'member' | 'readonly'
});
```

**Invitation Flow**:
1. Admin sends invitation
2. Email sent to invitee
3. Invitee accepts invitation
4. Member added to workspace

### Removing Members

**Remove Other Members** (Admin/Owner only):
```typescript
import { removeWorkspaceMemberAction } from "@/data/user/workspaces";

await removeWorkspaceMemberAction({
  workspaceId: "workspace-id",
  memberId: "user-id"
});
```

**Leave Workspace** (Self):
```typescript
import { leaveWorkspaceAction } from "@/data/user/workspaces";

await leaveWorkspaceAction({
  workspaceId: "workspace-id"
});
```

### Updating Member Role

```typescript
import { updateWorkspaceMemberRoleAction } from "@/data/user/workspaces";

await updateWorkspaceMemberRoleAction({
  workspaceId: "workspace-id",
  memberId: "user-id",
  role: "admin"
});
```

## Workspace Access

### Getting User's Workspaces

**Slim Workspaces** (for switching):
```typescript
import { getCachedSlimWorkspaces } from "@/data/user/workspaces";

const workspaces = await getCachedSlimWorkspaces();
// Returns: [{ id, name, slug, membershipType }]
```

**Full Workspace**:
```typescript
import { getWorkspaceById } from "@/data/user/workspaces";

const workspace = await getWorkspaceById(workspaceId);
```

### Checking Membership

**Is Member**:
```typescript
import { isWorkspaceMember } from "@/data/user/workspaces";

const isMember = await isWorkspaceMember(userId, workspaceId);
```

**Is Admin/Owner**:
```typescript
import { isWorkspaceAdmin } from "@/data/user/workspaces";

const isAdmin = await isWorkspaceAdmin(userId, workspaceId);
```

**Get Role**:
```typescript
import { getLoggedInUserWorkspaceRole } from "@/data/user/workspaces";

const role = await getLoggedInUserWorkspaceRole(workspaceId);
// Returns: 'owner' | 'admin' | 'member' | 'readonly'
```

### Getting Workspace Members

```typescript
import { getWorkspaceMembers } from "@/data/user/workspaces";

const members = await getWorkspaceMembers(workspaceId);
// Returns: Array of members with user profiles
```

## Workspace Settings

### Member Settings

Settings accessible to all members:

```typescript
import { getWorkspaceSettings } from "@/data/user/workspaces";
import { updateWorkspaceSettingsAction } from "@/data/user/workspaces";

// Get settings
const settings = await getWorkspaceSettings(workspaceId);

// Update settings
await updateWorkspaceSettingsAction({
  workspaceId: "workspace-id",
  settings: {
    theme: "dark",
    notifications: true
  }
});
```

### Admin Settings

Settings only accessible to admins/owners:

```typescript
import { getWorkspaceAdminSettings } from "@/data/user/workspaces";
import { updateWorkspaceAdminSettingsAction } from "@/data/user/workspaces";

// Get admin settings
const adminSettings = await getWorkspaceAdminSettings(workspaceId);

// Update admin settings
await updateWorkspaceAdminSettingsAction({
  workspaceId: "workspace-id",
  settings: {
    billingEmail: "billing@example.com",
    customDomain: "workspace.example.com"
  }
});
```

## Workspace Invitations

### Managing Invitations

**Get Pending Invitations**:
```typescript
import { getWorkspaceInvitations } from "@/data/user/workspaces";

const invitations = await getWorkspaceInvitations(workspaceId);
```

**Cancel Invitation**:
```typescript
import { cancelWorkspaceInvitationAction } from "@/data/user/workspaces";

await cancelWorkspaceInvitationAction({
  invitationId: "invitation-id"
});
```

**Accept Invitation**:
```typescript
import { acceptWorkspaceInvitationAction } from "@/data/user/invitation";

await acceptWorkspaceInvitationAction({
  invitationId: "invitation-id"
});
```

**Decline Invitation**:
```typescript
import { declineWorkspaceInvitationAction } from "@/data/user/invitation";

await declineWorkspaceInvitationAction({
  invitationId: "invitation-id"
});
```

## Default Workspace

Users can set a default workspace:

```typescript
import { setDefaultWorkspaceAction } from "@/data/user/workspaces";

await setDefaultWorkspaceAction({
  workspaceId: "workspace-id"
});
```

**Getting Default Workspace**:
```typescript
import { getMaybeDefaultWorkspace } from "@/data/user/workspaces";

const defaultWorkspace = await getMaybeDefaultWorkspace();
```

## Workspace Switching

### UI Component

The workspace switcher component handles switching:

```tsx
import { WorkspaceSwitcher } from "@/components/sidebar-components/workspace-switcher";

<WorkspaceSwitcher 
  workspaces={workspaces}
  currentWorkspaceId={workspaceId}
/>
```

### Programmatic Switching

```typescript
import { setDefaultWorkspaceAction } from "@/data/user/workspaces";
import { redirect } from "next/navigation";

await setDefaultWorkspaceAction({ workspaceId });
redirect(`/workspace/${workspace.slug}`);
```

## Data Isolation

### Row Level Security (RLS)

All workspace-related data is isolated via RLS policies:

```sql
-- Example: Projects table
CREATE POLICY "Workspace members can view projects" 
ON projects FOR SELECT 
TO authenticated 
USING (
  is_workspace_member(auth.uid(), workspace_id)
);
```

### Query Filtering

Always filter by workspace:

```typescript
const { data: projects } = await supabase
  .from("projects")
  .select("*")
  .eq("workspace_id", workspaceId);
```

## Workspace Credits

Workspaces have a credit system for usage tracking:

```typescript
import { getWorkspaceCredits } from "@/data/user/workspaces";

const credits = await getWorkspaceCredits(workspaceId);
// Returns: { credits: number, last_reset_date: Date }
```

**Credit Logs** (Admin only):
```typescript
import { getWorkspaceCreditLogs } from "@/data/user/workspaces";

const logs = await getWorkspaceCreditLogs(workspaceId);
```

## Workspace Deletion

**Delete Workspace** (Owner only):
```typescript
import { deleteWorkspaceAction } from "@/data/user/workspaces";

await deleteWorkspaceAction({
  workspaceId: "workspace-id"
});
```

**What Happens**:
- All workspace data cascades (projects, members, etc.)
- Members removed
- Invitations cancelled
- Billing cancelled (if applicable)

## Best Practices

### 1. Always Check Membership

Before accessing workspace data:
```typescript
const isMember = await isWorkspaceMember(userId, workspaceId);
if (!isMember) {
  throw new Error("Not a workspace member");
}
```

### 2. Use RLS Policies

RLS provides database-level security:
- Automatic filtering
- Prevents data leaks
- Workspace isolation

### 3. Filter by Workspace

Always include workspace filter:
```typescript
.eq("workspace_id", workspaceId)
```

### 4. Check Permissions

Verify role before actions:
```typescript
const role = await getLoggedInUserWorkspaceRole(workspaceId);
if (role !== "admin" && role !== "owner") {
  throw new Error("Insufficient permissions");
}
```

## UI Components

### Workspace Switcher

```tsx
import { WorkspaceSwitcher } from "@/components/sidebar-components/workspace-switcher";
```

### Create Workspace Dialog

```tsx
import { CreateWorkspaceDialog } from "@/components/CreateWorkspaceDialog";
```

### Workspace Settings

```tsx
import { WorkspaceSettingsForm } from "@/components/workspaces/WorkspaceSettingsForm";
```

## API Reference

### Server Actions

- `createWorkspaceAction`
- `updateWorkspaceAction`
- `deleteWorkspaceAction`
- `inviteUserToWorkspaceAction`
- `removeWorkspaceMemberAction`
- `updateWorkspaceMemberRoleAction`
- `leaveWorkspaceAction`
- `setDefaultWorkspaceAction`

### Queries

- `getWorkspaceById`
- `getCachedSlimWorkspaces`
- `getWorkspaceMembers`
- `getWorkspaceSettings`
- `getWorkspaceAdminSettings`
- `isWorkspaceMember`
- `isWorkspaceAdmin`
- `getLoggedInUserWorkspaceRole`

## Further Reading

- [Authentication & Authorization](./authentication.md) - User authentication
- [Projects](./projects.md) - Workspace projects
- [Billing & Subscriptions](./billing.md) - Workspace billing

---

**Next Steps**:
- [Projects](./projects.md) - Create projects in workspaces
- [Billing & Subscriptions](./billing.md) - Set up workspace billing

