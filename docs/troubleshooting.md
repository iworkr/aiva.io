# Troubleshooting Guide

Common issues and solutions when working with Nextbase Ultimate.

## General Issues

### Build Failures

**Issue**: Build fails with errors

**Solutions**:
1. **Clear cache**:
   ```bash
   rm -rf .next node_modules
   pnpm install
   pnpm build
   ```

2. **Check Node version**:
   ```bash
   node --version  # Should be >= 20.0.0
   ```

3. **Check dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

4. **Type errors**:
   ```bash
   pnpm tsc
   ```

### Development Server Issues

**Issue**: Dev server won't start

**Solutions**:
1. **Port already in use**:
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Check environment variables**:
   ```bash
   # Verify .env.local exists
   ls -la .env.local
   ```

3. **Restart server**:
   ```bash
   # Stop and restart
   pnpm dev
   ```

## Database Issues

### Connection Errors

**Issue**: Cannot connect to Supabase

**Solutions**:
1. **Verify environment variables**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```

2. **Check Supabase status**:
   ```bash
   supabase status
   ```

3. **Test connection**:
   ```bash
   # In Supabase dashboard
   # Go to SQL Editor and run: SELECT 1;
   ```

### Migration Issues

**Issue**: Migrations fail

**Solutions**:
1. **Check migration syntax**:
   ```bash
   supabase migration list
   ```

2. **Reset local database**:
   ```bash
   supabase db reset
   ```

3. **Check for conflicts**:
   - Review migration files
   - Ensure no duplicate migrations
   - Check migration order

### RLS Policy Issues

**Issue**: Data not accessible despite correct permissions

**Solutions**:
1. **Check RLS enabled**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. **Test policy**:
   ```sql
   SET ROLE authenticated;
   SELECT * FROM table_name;
   ```

3. **Check user context**:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log("User:", user?.id);
   ```

## Authentication Issues

### User Not Authenticated

**Issue**: User appears logged out

**Solutions**:
1. **Check token expiration**:
   - Tokens expire after 1 hour (default)
   - User needs to sign in again

2. **Check middleware**:
   - Verify middleware chain
   - Check auth middleware configuration

3. **Check cookies**:
   - Verify cookies are set
   - Check browser cookie settings
   - Clear cookies and retry

### Email Not Sending

**Issue**: Verification emails not received

**Solutions**:
1. **Check Supabase email config**:
   - Go to Authentication → Email Templates
   - Verify SMTP settings
   - Check email provider

2. **Check spam folder**:
   - Emails may be filtered
   - Add to contacts

3. **Test email locally**:
   ```bash
   # Use Inbucket for local testing
   # Access at http://localhost:54324
   ```

### OAuth Not Working

**Issue**: Social login fails

**Solutions**:
1. **Check OAuth configuration**:
   - Verify client IDs and secrets
   - Check redirect URLs
   - Ensure OAuth app is active

2. **Check redirect URLs**:
   - Must match exactly
   - Include protocol (https)
   - Include port if localhost

3. **Check Supabase settings**:
   - Go to Authentication → Providers
   - Verify provider enabled
   - Check configuration

## Workspace Issues

### Cannot Access Workspace

**Issue**: "Not a workspace member" error

**Solutions**:
1. **Check membership**:
   ```typescript
   const isMember = await isWorkspaceMember(userId, workspaceId);
   ```

2. **Check RLS policies**:
   - Verify workspace RLS policies
   - Check membership table

3. **Verify workspace ID**:
   - Ensure correct workspace ID
   - Check workspace exists

### Invitation Not Received

**Issue**: Workspace invitation email not received

**Solutions**:
1. **Check email address**:
   - Verify correct email
   - Check for typos

2. **Check invitation status**:
   ```typescript
   const invitations = await getWorkspaceInvitations(workspaceId);
   ```

3. **Resend invitation**:
   - Cancel and recreate
   - Or resend via admin panel

## Project Issues

### Projects Not Loading

**Issue**: Projects list is empty

**Solutions**:
1. **Check workspace access**:
   ```typescript
   const isMember = await isWorkspaceMember(userId, workspaceId);
   ```

2. **Check RLS policies**:
   - Verify project RLS policies
   - Check workspace membership

3. **Check query**:
   ```typescript
   const { data, error } = await supabase
     .from("projects")
     .select("*")
     .eq("workspace_id", workspaceId);
   ```

### Comments Not Saving

**Issue**: Comments fail to save

**Solutions**:
1. **Check permissions**:
   - Verify workspace membership
   - Check comment RLS policies

2. **Check project access**:
   ```typescript
   const workspaceId = await getProjectWorkspaceId(projectId);
   const isMember = await isWorkspaceMember(userId, workspaceId);
   ```

3. **Check validation**:
   - Verify comment text not empty
   - Check text length limits

## Billing Issues

### Stripe Webhook Not Working

**Issue**: Webhook events not processed

**Solutions**:
1. **Check webhook secret**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Verify endpoint**:
   - Check endpoint URL
   - Verify signature verification

3. **Test webhook**:
   ```bash
   # Use Stripe CLI
   stripe listen --forward-to localhost:3000/api/stripe/webhooks
   ```

### Subscription Not Updating

**Issue**: Subscription status not syncing

**Solutions**:
1. **Check webhook events**:
   - Verify events received
   - Check event processing

2. **Manual sync**:
   ```typescript
   // Sync subscription manually
   await syncSubscriptionFromStripe(subscriptionId);
   ```

3. **Check database**:
   ```sql
   SELECT * FROM billing_subscriptions 
   WHERE gateway_subscription_id = 'sub_xxx';
   ```

## Performance Issues

### Slow Queries

**Issue**: Database queries are slow

**Solutions**:
1. **Add indexes**:
   ```sql
   CREATE INDEX idx_table_column ON table_name(column_name);
   ```

2. **Optimize queries**:
   - Use select specific columns
   - Add proper filters
   - Use pagination

3. **Check query plans**:
   ```sql
   EXPLAIN ANALYZE SELECT ...;
   ```

### Large Bundle Size

**Issue**: Application bundle is too large

**Solutions**:
1. **Analyze bundle**:
   ```bash
   ANALYZE=true pnpm build
   ```

2. **Use dynamic imports**:
   ```typescript
   const Component = dynamic(() => import("./Component"));
   ```

3. **Remove unused dependencies**:
   ```bash
   pnpm why package-name
   ```

## Type Issues

### Type Errors

**Issue**: TypeScript errors

**Solutions**:
1. **Regenerate types**:
   ```bash
   pnpm generate:types
   ```

2. **Check type definitions**:
   ```bash
   pnpm tsc --noEmit
   ```

3. **Update types**:
   - After database changes
   - After adding new tables

### Missing Types

**Issue**: Types not found

**Solutions**:
1. **Check type generation**:
   ```bash
   pnpm generate:types
   ```

2. **Check import paths**:
   ```typescript
   import type { DBTable } from "@/types";
   ```

3. **Verify database connection**:
   - Ensure Supabase linked
   - Check migrations applied

## Testing Issues

### Tests Failing

**Issue**: Tests fail locally

**Solutions**:
1. **Check test environment**:
   ```bash
   NODE_ENV=test pnpm test
   ```

2. **Check test data**:
   - Verify test database
   - Check test fixtures

3. **Run specific test**:
   ```bash
   pnpm test path/to/test.spec.ts
   ```

### E2E Tests Failing

**Issue**: Playwright tests fail

**Solutions**:
1. **Check browser installation**:
   ```bash
   pnpm exec playwright install
   ```

2. **Check test setup**:
   - Verify test users created
   - Check authentication state

3. **Run with UI**:
   ```bash
   pnpm test:e2e:ui
   ```

## Getting Help

### Debugging Steps

1. **Check logs**:
   - Application logs
   - Browser console
   - Server logs

2. **Reproduce issue**:
   - Steps to reproduce
   - Expected vs actual behavior

3. **Check documentation**:
   - Feature documentation
   - API reference
   - Examples

### Resources

- **Documentation**: `/docs` directory
- **GitHub Issues**: Report bugs
- **Community**: Discussions
- **Supabase Docs**: Database help
- **Next.js Docs**: Framework help

## Common Error Messages

### "User not logged in"

**Solution**: Check authentication middleware and session

### "Not a workspace member"

**Solution**: Verify workspace membership and RLS policies

### "Unauthorized"

**Solution**: Check permissions and role assignments

### "Database error"

**Solution**: Check database connection and query syntax

### "Type error"

**Solution**: Regenerate types and check TypeScript configuration

---

**Still stuck?** Check the [Development Guide](./development.md) or open an issue.

