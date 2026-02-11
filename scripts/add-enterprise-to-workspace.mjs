#!/usr/bin/env node

/**
 * Add (or fix) an active Enterprise entitlement for a workspace.
 * Use this when a workspace has no entitlement or has a canceled one and you want
 * to allow channel connections (Gmail, etc.) without Stripe.
 *
 * Usage:
 *   node scripts/add-enterprise-to-workspace.mjs <workspace-id>
 *   node scripts/add-enterprise-to-workspace.mjs <email>   # uses that user's default workspace
 *
 * Examples:
 *   node scripts/add-enterprise-to-workspace.mjs e396f6f5-506d-49bc-8cf2-c058c864e96e
 *   node scripts/add-enterprise-to-workspace.mjs aivaioapp@gmail.com
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: join(process.cwd(), '.env.local') });
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/add-enterprise-to-workspace.mjs <workspace-id | email>');
  process.exit(1);
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

async function resolveWorkspaceId() {
  if (isUuid(input)) {
    const { data, error } = await supabase.from('workspaces').select('id').eq('id', input).single();
    if (error || !data) {
      console.error('Workspace not found:', input);
      process.exit(1);
    }
    return data.id;
  }
  const email = input;
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  const { data: settings } = await supabase.from('user_settings').select('default_workspace').eq('id', user.id).single();
  if (settings?.default_workspace) {
    return settings.default_workspace;
  }
  const { data: members } = await supabase.from('workspace_members').select('workspace_id').eq('workspace_member_id', user.id).limit(1);
  if (members?.[0]?.workspace_id) {
    return members[0].workspace_id;
  }
  console.error('No workspace found for user:', email);
  process.exit(1);
}

async function main() {
  const workspaceId = await resolveWorkspaceId();
  console.log('\n🔧 Adding active Enterprise entitlement for workspace:', workspaceId);

  const { data: existing } = await supabase
    .from('entitlements')
    .select('id, plan, status')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('entitlements')
      .update({
        plan: 'enterprise',
        status: 'active',
        provider: 'stripe',
        provider_subscription_id: `manual-enterprise-${workspaceId}`,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) {
      console.error('Failed to update entitlement:', error.message);
      process.exit(1);
    }
    console.log('✅ Updated existing entitlement to Enterprise (active)');
  } else {
    const { error } = await supabase.from('entitlements').insert({
      workspace_id: workspaceId,
      plan: 'enterprise',
      provider: 'stripe',
      status: 'active',
      provider_subscription_id: `manual-enterprise-${workspaceId}`,
    });
    if (error) {
      console.error('Failed to create entitlement:', error.message);
      process.exit(1);
    }
    console.log('✅ Created new Enterprise entitlement');
  }
  console.log('\n🎉 Done. You can connect Gmail/Outlook from this workspace now.\n');
}

main();
