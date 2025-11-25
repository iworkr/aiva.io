# Database Schema

Complete documentation of the Nextbase Ultimate database schema, including tables, relationships, and Row Level Security (RLS) policies.

## Schema Overview

The database uses PostgreSQL with Supabase and follows these principles:
- **Row Level Security (RLS)**: All tables have RLS enabled
- **Foreign Keys**: Proper relationships with cascade deletes
- **Indexes**: Strategic indexing for performance
- **Enums**: Type-safe enum types
- **Functions**: Helper functions for common operations

## Core Tables

### User Management

#### `user_profiles`
Public user profile information.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**RLS Policies**:
- All authenticated users can view profiles
- Users can only update their own profile

**Related Tables**:
- `user_settings` (1:1)
- `user_roles` (1:many)
- `workspace_members` (1:many)

#### `user_settings`
Private user settings.

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  default_workspace UUID REFERENCES workspaces(id) ON DELETE SET NULL
);
```

**RLS Policies**:
- Users can only view/update their own settings

#### `user_roles`
Application-level user roles.

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL -- 'admin'
);
```

**RLS Policies**:
- Only `supabase_auth_admin` can view
- Used for application admin checks

#### `user_notifications`
Real-time user notifications.

```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  is_seen BOOLEAN DEFAULT FALSE NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**RLS Policies**:
- Users can only access their own notifications
- Realtime enabled for live updates

#### `user_api_keys`
API keys for users.

```sql
CREATE TABLE user_api_keys (
  key_id TEXT PRIMARY KEY NOT NULL,
  masked_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT FALSE NOT NULL
);
```

**RLS Policies**:
- Users can only manage their own API keys

### Workspaces (Multi-Tenancy)

#### `workspaces`
Main workspace table.

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  name VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**RLS Policies**:
- Workspace members can view/update their workspaces
- All authenticated users can create workspaces

**Related Tables**:
- `workspace_members` (1:many)
- `workspace_settings` (1:1)
- `projects` (1:many)

#### `workspace_members`
Team members with roles.

```sql
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workspace_member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  workspace_member_role workspace_member_role_type NOT NULL, -- 'owner', 'admin', 'member', 'readonly'
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**RLS Policies**:
- Workspace members can view team members
- Workspace admins can manage team members
- Members can delete themselves

**Roles**:
- `owner`: Full control
- `admin`: Administrative access
- `member`: Standard access
- `readonly`: Read-only access

#### `workspace_invitations`
Email-based workspace invitations.

```sql
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  inviter_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status workspace_invitation_link_status DEFAULT 'active' NOT NULL,
  invitee_user_email TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invitee_user_role workspace_member_role_type DEFAULT 'member' NOT NULL,
  invitee_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
);
```

**RLS Policies**:
- Workspace admins can manage invitations
- Invitees can view their invitations

**Status Values**:
- `active`: Pending invitation
- `finished_accepted`: Accepted
- `finished_declined`: Declined
- `inactive`: Cancelled

#### `workspace_settings`
Member-accessible workspace settings.

```sql
CREATE TABLE workspace_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  workspace_settings JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

**RLS Policies**:
- Workspace members can view/update

#### `workspace_admin_settings`
Admin-only workspace settings.

```sql
CREATE TABLE workspace_admin_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  workspace_settings JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

**RLS Policies**:
- Only workspace admins can access

#### `workspace_application_settings`
Application-managed workspace settings.

```sql
CREATE TABLE workspace_application_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  membership_type workspace_membership_type DEFAULT 'solo' NOT NULL -- 'solo' | 'team'
);
```

**RLS Policies**:
- Workspace members can view

#### `workspace_credits`
Workspace credit system.

```sql
CREATE TABLE workspace_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  credits INT NOT NULL DEFAULT 12,
  last_reset_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**RLS Policies**:
- Workspace members can view credits

#### `workspace_credits_logs`
Credit transaction logs.

```sql
CREATE TABLE workspace_credits_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_credits_id UUID NOT NULL REFERENCES workspace_credits(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  old_credits INT,
  new_credits INT
);
```

**RLS Policies**:
- Workspace admins can view logs

### Projects

#### `projects`
Projects within workspaces.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_status project_status DEFAULT 'draft' NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text
);
```

**RLS Policies**:
- Workspace members can create/view/update projects
- Workspace admins can delete projects

**Status Values**:
- `draft`: Initial state
- `pending_approval`: Awaiting approval
- `approved`: Approved and active
- `completed`: Finished

#### `project_comments`
Threaded comments on projects.

```sql
CREATE TABLE project_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  text TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  in_reply_to UUID REFERENCES project_comments(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);
```

**RLS Policies**:
- Workspace members can create/view comments
- Comment owners can update/delete
- Workspace admins can delete any comment

#### `chats`
AI chat conversations per project.

```sql
CREATE TABLE chats (
  id TEXT PRIMARY KEY NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', NOW()) NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);
```

**RLS Policies**:
- Users can perform all operations on their own chats

### Billing

#### `billing_products`
Product catalog.

```sql
CREATE TABLE billing_products (
  gateway_product_id TEXT PRIMARY KEY,
  gateway_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  features JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_in_ui BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(gateway_name, gateway_product_id)
);
```

**RLS Policies**:
- Everyone can view products

#### `billing_prices`
Pricing tiers.

```sql
CREATE TABLE billing_prices (
  gateway_price_id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_product_id TEXT NOT NULL REFERENCES billing_products(gateway_product_id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  recurring_interval TEXT NOT NULL,
  recurring_interval_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  tier TEXT,
  free_trial_days INT,
  gateway_name TEXT NOT NULL,
  UNIQUE(gateway_name, gateway_price_id)
);
```

**RLS Policies**:
- Everyone can view prices

#### `billing_customers`
Workspace-customer mapping.

```sql
CREATE TABLE billing_customers (
  gateway_customer_id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  gateway_name TEXT NOT NULL,
  default_currency TEXT,
  billing_email TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE (gateway_name, gateway_customer_id)
);
```

**RLS Policies**:
- Workspace members can view their customer record

#### `billing_subscriptions`
Active subscriptions.

```sql
CREATE TABLE billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_customer_id TEXT NOT NULL REFERENCES billing_customers(gateway_customer_id) ON DELETE CASCADE,
  gateway_name TEXT NOT NULL,
  gateway_subscription_id TEXT NOT NULL,
  gateway_product_id TEXT NOT NULL REFERENCES billing_products(gateway_product_id) ON DELETE CASCADE,
  gateway_price_id TEXT NOT NULL REFERENCES billing_prices(gateway_price_id) ON DELETE CASCADE,
  status subscription_status NOT NULL,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  currency TEXT NOT NULL,
  is_trial BOOLEAN NOT NULL,
  trial_ends_at DATE,
  cancel_at_period_end BOOLEAN NOT NULL,
  quantity INT,
  UNIQUE(gateway_name, gateway_subscription_id)
);
```

**RLS Policies**:
- Workspace members can view their subscriptions

**Status Values**:
- `trialing`: In trial period
- `active`: Active subscription
- `canceled`: Cancelled
- `incomplete`: Payment incomplete
- `past_due`: Payment overdue
- `unpaid`: Unpaid
- `paused`: Paused

#### `billing_invoices`
Invoice history.

```sql
CREATE TABLE billing_invoices (
  gateway_invoice_id TEXT PRIMARY KEY,
  gateway_customer_id TEXT NOT NULL REFERENCES billing_customers(gateway_customer_id) ON DELETE CASCADE,
  gateway_product_id UUID REFERENCES billing_products(gateway_product_id) ON DELETE CASCADE,
  gateway_price_id TEXT REFERENCES billing_prices(gateway_price_id) ON DELETE CASCADE,
  gateway_name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  due_date DATE,
  paid_date DATE,
  hosted_invoice_url TEXT,
  UNIQUE(gateway_name, gateway_invoice_id)
);
```

**RLS Policies**:
- Workspace members can view their invoices

### Marketing Features

#### `marketing_blog_posts`
Blog posts.

```sql
CREATE TABLE marketing_blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  status marketing_blog_post_status DEFAULT 'draft' NOT NULL,
  cover_image VARCHAR(255),
  seo_data JSONB,
  json_content JSONB DEFAULT '{}'::jsonb NOT NULL
);
```

**RLS Policies**:
- Published posts visible to everyone
- Admins can manage all posts

**Status Values**:
- `draft`: Not published
- `published`: Published and visible

#### `marketing_feedback_threads`
User feedback threads.

```sql
CREATE TABLE marketing_feedback_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status marketing_feedback_thread_status DEFAULT 'open' NOT NULL,
  priority marketing_feedback_thread_priority DEFAULT 'medium' NOT NULL,
  type marketing_feedback_thread_type NOT NULL,
  board_id UUID REFERENCES marketing_feedback_boards(id) ON DELETE CASCADE,
  -- ... other fields
);
```

**RLS Policies**:
- Public threads visible to everyone
- Authenticated users can create threads
- Thread owners can update

**Status Values**:
- `open`: New feedback
- `under_review`: Being reviewed
- `planned`: Planned for implementation
- `in_progress`: Currently being worked on
- `completed`: Implemented
- `closed`: Closed
- `moderator_hold`: On hold by moderator

## Database Functions

### Workspace Functions

#### `is_workspace_member(user_id, workspace_id)`
Checks if a user is a member of a workspace.

```sql
CREATE FUNCTION is_workspace_member(user_id UUID, workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER;
```

#### `is_workspace_admin(user_id, workspace_id)`
Checks if a user is an admin/owner of a workspace.

```sql
CREATE FUNCTION is_workspace_admin(user_id UUID, workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER;
```

#### `get_workspace_team_member_ids(workspace_id)`
Returns all member IDs for a workspace.

```sql
CREATE FUNCTION get_workspace_team_member_ids(workspace_id UUID)
RETURNS TABLE(member_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER;
```

### Project Functions

#### `get_project_workspace_uuid(project_id)`
Returns the workspace ID for a project.

```sql
CREATE FUNCTION get_project_workspace_uuid(project_id UUID)
RETURNS UUID
LANGUAGE plpgsql;
```

### Billing Functions

#### `get_customer_workspace_id(customer_id)`
Returns the workspace ID for a customer.

```sql
CREATE FUNCTION get_customer_workspace_id(customer_id TEXT)
RETURNS UUID
LANGUAGE plpgsql;
```

## Enums

### `app_role`
Application-level roles:
- `admin`

### `workspace_member_role_type`
Workspace member roles:
- `owner`
- `admin`
- `member`
- `readonly`

### `workspace_membership_type`
Workspace types:
- `solo`
- `team`

### `project_status`
Project statuses:
- `draft`
- `pending_approval`
- `approved`
- `completed`

### `subscription_status`
Subscription statuses:
- `trialing`
- `active`
- `canceled`
- `incomplete`
- `incomplete_expired`
- `past_due`
- `unpaid`
- `paused`

## Indexes

Strategic indexes for performance:

- Foreign key indexes on all foreign keys
- Unique indexes on slugs and unique fields
- Composite indexes for common query patterns
- Full-text search indexes where needed

## Row Level Security (RLS)

All tables have RLS enabled with policies that:
1. Check authentication status
2. Verify workspace membership
3. Enforce role-based permissions
4. Protect user data

**RLS Pattern**:
```sql
CREATE POLICY "policy_name" ON table_name
FOR operation
TO role
USING (condition)
WITH CHECK (condition);
```

## Migration Strategy

Migrations are:
1. **Timestamped**: `YYYYMMDDHHMMSS_description.sql`
2. **Sequential**: Applied in order
3. **Reversible**: Can be rolled back
4. **Tested**: Tested before production

## Best Practices

1. **Always Use RLS**: Enable RLS on all tables
2. **Foreign Keys**: Use proper foreign key constraints
3. **Indexes**: Add indexes for performance
4. **Enums**: Use enums for constrained values
5. **Functions**: Use functions for reusable logic
6. **Cascade Deletes**: Set appropriate cascade rules

## Further Reading

- [Architecture Overview](./architecture.md) - System architecture
- [Development Guide](./development.md) - Database development
- [Feature Documentation](./features/) - Feature-specific schemas

---

**Next Steps**:
- [Development Guide](./development.md) - Learn to work with the database
- [Feature Documentation](./features/) - Feature-specific database usage

