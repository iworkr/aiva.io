# Authentication & Authorization

Complete guide to authentication and authorization in Nextbase Ultimate.

## Overview

Nextbase uses Supabase Auth for authentication, providing multiple authentication methods and a robust authorization system with both application-level and workspace-level roles.

## Authentication Methods

### 1. Email/Password Authentication

Traditional email and password authentication.

**Sign Up**:
```typescript
import { signUpWithPasswordAction } from "@/data/auth/auth";

const result = await signUpWithPasswordAction({
  email: "user@example.com",
  password: "securepassword123",
  next: "/dashboard" // Optional redirect
});
```

**Sign In**:
```typescript
import { signInWithPasswordAction } from "@/data/auth/auth";

const result = await signInWithPasswordAction({
  email: "user@example.com",
  password: "securepassword123"
});
```

### 2. Magic Link (Passwordless)

Passwordless authentication via email magic links.

**Sign In**:
```typescript
import { signInWithMagicLinkAction } from "@/data/auth/auth";

await signInWithMagicLinkAction({
  email: "user@example.com",
  shouldCreateUser: true, // Create user if doesn't exist
  next: "/dashboard"
});
```

**Flow**:
1. User enters email
2. Magic link sent to email
3. User clicks link
4. Redirected to `/auth/callback`
5. Session created

### 3. OAuth Providers

Social authentication with multiple providers.

**Supported Providers**:
- Google
- GitHub
- Twitter

**Sign In**:
```typescript
import { signInWithProviderAction } from "@/data/auth/auth";

const { url } = await signInWithProviderAction({
  provider: "google",
  next: "/dashboard"
});

// Redirect user to url
window.location.href = url;
```

**Configuration**:
Set up OAuth apps and add credentials to Supabase:
- Google: Google Cloud Console
- GitHub: GitHub Developer Settings
- Twitter: Twitter Developer Portal

## Authentication Flow

### Sign Up Flow

```
User submits signup form
    ↓
Server Action validates input
    ↓
Supabase Auth creates user
    ↓
Email confirmation sent (if enabled)
    ↓
User redirected to callback
    ↓
Session established
    ↓
Onboarding flow (if new user)
```

### Sign In Flow

```
User submits login form
    ↓
Server Action validates credentials
    ↓
Supabase Auth authenticates
    ↓
JWT token generated
    ↓
Token stored in HttpOnly cookie
    ↓
User redirected to dashboard
```

### Magic Link Flow

```
User requests magic link
    ↓
Email sent with secure link
    ↓
User clicks link
    ↓
Link validated
    ↓
Session created
    ↓
User redirected
```

## Session Management

### Getting Current User

**Server Component**:
```typescript
import { createSupabaseUserServerComponentClient } from "@/supabase-clients/user/createSupabaseUserServerComponentClient";

const supabase = await createSupabaseUserServerComponentClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Server Action**:
```typescript
import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";

const supabase = await createSupabaseUserServerActionClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Client Component**:
```typescript
"use client";
import { createSupabaseUserClientComponent } from "@/supabase-clients/user/supabaseUserClientComponent";

const supabase = createSupabaseUserClientComponent();
const { data: { user } } = await supabase.auth.getUser();
```

### Sign Out

```typescript
import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";

const supabase = await createSupabaseUserServerActionClient();
await supabase.auth.signOut();
```

## Authorization

### Application-Level Roles

Application admins have elevated permissions across the entire application.

**Checking Admin Status**:
```typescript
import { serverGetUserType } from "@/utils/server/serverGetUserType";
import { userRoles } from "@/utils/userTypes";

const userType = await serverGetUserType();
const isAdmin = userType === userRoles.ADMIN;
```

**Admin Action Client**:
```typescript
import { adminActionClient } from "@/lib/safe-action";

export const adminOnlyAction = adminActionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    // Only admins can execute this
  });
```

**Making a User Admin**:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('user-uuid', 'admin');
```

### Workspace-Level Roles

Workspace members have roles within specific workspaces.

**Roles**:
- **Owner**: Full control, cannot be removed
- **Admin**: Administrative access, can manage members
- **Member**: Standard access, can create/edit content
- **Readonly**: Read-only access

**Checking Workspace Role**:
```typescript
import { getLoggedInUserWorkspaceRole } from "@/data/user/workspaces";

const role = await getLoggedInUserWorkspaceRole(workspaceId);
// Returns: 'owner' | 'admin' | 'member' | 'readonly'
```

**Checking Workspace Membership**:
```typescript
import { isWorkspaceMember } from "@/data/user/workspaces";

const isMember = await isWorkspaceMember(userId, workspaceId);
```

**Checking Admin/Owner Status**:
```typescript
import { isWorkspaceAdmin } from "@/data/user/workspaces";

const isAdmin = await isWorkspaceAdmin(userId, workspaceId);
```

## Middleware Protection

Routes are protected via middleware chain.

**Protected Routes**:
- `/dashboard/*`
- `/workspace/*`
- `/project/*`
- `/app_admin/*`
- `/user/*`

**Middleware Flow**:
1. Locale detection
2. Authentication check
3. Onboarding check
4. Admin check (for admin routes)

**Custom Protection**:
```typescript
// src/middlewares/custom-middleware.ts
export const customMiddleware: MiddlewareConfig = {
  matcher: ["/custom-route"],
  middleware: async (request, maybeUser) => {
    if (!maybeUser) {
      return [NextResponse.redirect("/login"), null];
    }
    return [NextResponse.next(), maybeUser];
  },
};
```

## Password Management

### Reset Password

**Request Reset**:
```typescript
import { resetPasswordAction } from "@/data/auth/auth";

await resetPasswordAction({
  email: "user@example.com"
});
```

**Update Password**:
After clicking reset link, user is redirected to `/update-password` where they can set a new password.

### Update Password (Authenticated)

```typescript
import { updatePasswordAction } from "@/data/user/security";

await updatePasswordAction({
  currentPassword: "oldpassword",
  newPassword: "newpassword"
});
```

## Email Verification

### Configuration

Email verification is configured in Supabase:
- **Enable confirmations**: Requires email verification before sign in
- **Double confirm changes**: Requires confirmation on both old and new email

### Verification Flow

1. User signs up
2. Verification email sent
3. User clicks verification link
4. Email verified
5. User can sign in

### Resend Verification

```typescript
import { resendVerificationEmailAction } from "@/data/auth/auth";

await resendVerificationEmailAction({
  email: "user@example.com"
});
```

## Account Management

### Delete Account

**Request Deletion**:
```typescript
import { requestAccountDeletionAction } from "@/data/user/user";

await requestAccountDeletionAction();
```

**Confirm Deletion**:
User receives email with deletion link. Clicking link confirms deletion.

**Implementation**:
- Token stored in `account_delete_tokens` table
- Token expires after use
- All user data cascades (via foreign keys)

## Security Best Practices

### 1. Server-Side Validation

Always validate on the server:
```typescript
export const secureAction = authActionClient
  .schema(z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }))
  .action(async ({ parsedInput }) => {
    // Input is validated and type-safe
  });
```

### 2. RLS Policies

Database-level security via RLS:
- All tables have RLS enabled
- Policies check authentication
- Policies check workspace membership

### 3. HttpOnly Cookies

JWT tokens stored in HttpOnly cookies:
- Not accessible via JavaScript
- Protected from XSS attacks
- Automatically sent with requests

### 4. CSRF Protection

Next.js provides built-in CSRF protection for:
- Server Actions
- API Routes
- Form submissions

### 5. Rate Limiting

Consider implementing rate limiting for:
- Login attempts
- Password reset requests
- Magic link requests

## Customization

### Custom Auth Pages

Modify pages in:
```
src/app/[locale]/(dynamic-pages)/(login-pages)/
├── login/
├── sign-up/
└── forgot-password/
```

### Custom Auth Actions

Add custom actions in:
```
src/data/auth/auth.ts
```

### Custom Middleware

Add to middleware chain:
```
src/middlewares/middlewareList.ts
```

## Troubleshooting

### User Not Authenticated

**Check**:
1. Token expiration
2. Cookie settings
3. Middleware configuration
4. Supabase connection

### Email Not Sending

**Check**:
1. Supabase email configuration
2. SMTP settings
3. Email templates
4. Spam folder

### OAuth Not Working

**Check**:
1. OAuth app configuration
2. Redirect URLs
3. Client IDs and secrets
4. Supabase OAuth settings

## API Reference

### Server Actions

- `signUpWithPasswordAction`
- `signInWithPasswordAction`
- `signInWithMagicLinkAction`
- `signInWithProviderAction`
- `resetPasswordAction`

### Utilities

- `serverGetLoggedInUser()` - Get current user (server)
- `serverGetUserType()` - Get user type/role
- `isWorkspaceMember()` - Check workspace membership
- `isWorkspaceAdmin()` - Check admin/owner status

## Further Reading

- [Workspaces & Multi-Tenancy](./workspaces.md) - Workspace authorization
- [Development Guide](../development.md) - Development workflow
- [Security Best Practices](../security.md) - Security guidelines

---

**Next Steps**:
- [Workspaces & Multi-Tenancy](./workspaces.md) - Learn workspace roles
- [Development Guide](../development.md) - Build authentication features

