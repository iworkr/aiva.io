#!/usr/bin/env node

/**
 * One-time script: Make a user an Enterprise user (same setup as junsnow.2024@gmail.com).
 * - Finds user by email in auth
 * - Creates a solo workspace and adds them as owner
 * - Sets their default workspace
 * - Creates a permanent Enterprise entitlement for that workspace
 * - Optionally sets password (so they can log in with email + password)
 *
 * Usage:
 *   node scripts/setup-enterprise-user.mjs <email> [password]
 *
 * Examples:
 *   node scripts/setup-enterprise-user.mjs aivaioapp@gmail.com
 *   node scripts/setup-enterprise-user.mjs aivaioapp@gmail.com 12345678
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

const email = process.argv[2];
const password = process.argv[3]; // optional; if provided, set so they can log in with email + password

if (!email) {
  console.error('Usage: node scripts/setup-enterprise-user.mjs <email> [password]');
  console.error('Example: node scripts/setup-enterprise-user.mjs aivaioapp@gmail.com 12345678');
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

function slugFromEmail(e) {
  return e.replace(/@.*/, '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24) || 'workspace';
}

async function main() {
  console.log(`\n🔧 Setting up Enterprise user for: ${email}\n`);

  // 1. Find user in auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }
  const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`User not found: ${email}`);
    console.error('They must sign up first (e.g. Sign in with Google or email) so they exist in auth.users.');
    process.exit(1);
  }
  console.log(`✅ Found user: ${user.id}`);

  // 2. Ensure user_profiles row exists (trigger usually creates it)
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) {
    const { error: insertError } = await supabase.from('user_profiles').insert({ id: user.id });
    if (insertError) {
      console.error('Failed to ensure user_profiles row:', insertError.message);
      process.exit(1);
    }
    console.log('✅ Created user_profiles row');
  } else {
    console.log('✅ user_profiles exists');
  }

  // 3. Create workspace
  const baseSlug = slugFromEmail(email);
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-6)}`;
  const workspaceName = `${baseSlug}'s Workspace`;
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name: workspaceName, slug })
    .select('id, slug')
    .single();
  if (wsError) {
    console.error('Failed to create workspace:', wsError.message);
    process.exit(1);
  }
  console.log(`✅ Created workspace: ${workspace.slug} (${workspace.id})`);
  // (workspace_application_settings is created by DB trigger with membership_type default 'solo')

  // 4. Add user as owner
  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    workspace_member_id: user.id,
    workspace_member_role: 'owner',
  });
  if (memberError) {
    console.error('Failed to add workspace member:', memberError.message);
    process.exit(1);
  }
  console.log('✅ Added user as workspace owner');

  // 5. Set default workspace (upsert user_settings)
  const { error: settingsError } = await supabase.from('user_settings').upsert(
    { id: user.id, default_workspace: workspace.id },
    { onConflict: 'id' }
  );
  if (settingsError) {
    console.error('Failed to set default workspace:', settingsError.message);
    process.exit(1);
  }
  console.log('✅ Set default workspace');

  // 6. Create Enterprise entitlement
  const { data: entitlement, error: entError } = await supabase
    .from('entitlements')
    .insert({
      workspace_id: workspace.id,
      plan: 'enterprise',
      provider: 'stripe',
      status: 'active',
      provider_subscription_id: `manual-enterprise-${workspace.id}`,
    })
    .select('id, plan, status')
    .single();
  if (entError) {
    console.error('Failed to create entitlement:', entError.message);
    process.exit(1);
  }
  console.log(`✅ Created Enterprise entitlement (${entitlement.id})`);

  // 7. Optional: set password
  if (password) {
    const { error: pwdError } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (pwdError) {
      console.error('Failed to set password:', pwdError.message);
    } else {
      console.log(`✅ Password set; they can log in with email + password "${password}"`);
    }
  } else {
    console.log('ℹ️  No password provided; they can use Sign in with Google (or run again with a password).');
  }

  console.log('\n🎉 Done. User has Enterprise access in workspace:', workspace.slug);
  console.log('   App URL: https://www.tryaiva.io (or your production URL)\n');
}

main();
