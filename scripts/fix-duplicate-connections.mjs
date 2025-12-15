/**
 * Script to fix duplicate channel connections
 * Run with: node scripts/fix-duplicate-connections.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lgyewlqzelxkpawnmiog.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Run with: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/fix-duplicate-connections.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixDuplicateConnections() {
  console.log('🔍 Finding duplicate channel connections...\n');

  // Get all active connections
  const { data: connections, error: connError } = await supabase
    .from('channel_connections')
    .select('id, workspace_id, provider, provider_account_id, provider_account_name, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (connError) {
    console.error('❌ Failed to fetch connections:', connError);
    process.exit(1);
  }

  console.log(`📊 Found ${connections.length} active connections:\n`);

  // Group by provider + provider_account_id
  const accountGroups = {};
  for (const conn of connections) {
    const key = `${conn.provider}:${conn.provider_account_id}`;
    if (!accountGroups[key]) {
      accountGroups[key] = [];
    }
    accountGroups[key].push(conn);
    console.log(`  ${conn.provider} - ${conn.provider_account_name} (workspace: ${conn.workspace_id.substring(0, 8)}...)`);
  }

  console.log('\n');

  // Find duplicates
  const duplicates = Object.entries(accountGroups).filter(([, conns]) => conns.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate connections found!');
    return;
  }

  console.log(`⚠️ Found ${duplicates.length} accounts with duplicate connections:\n`);

  for (const [accountKey, conns] of duplicates) {
    console.log(`\n📧 ${accountKey}`);
    console.log(`   Connected to ${conns.length} workspaces:`);

    // Get workspace settings
    const workspaceIds = conns.map(c => c.workspace_id);
    const { data: wsSettings } = await supabase
      .from('workspace_settings')
      .select('workspace_id, auto_send_enabled')
      .in('workspace_id', workspaceIds);

    const wsSettingsMap = new Map((wsSettings || []).map(ws => [ws.workspace_id, ws.auto_send_enabled]));

    // Find which connection to keep (prefer auto-send enabled)
    let keepConnection = conns[0];
    for (const conn of conns) {
      const hasAutoSend = wsSettingsMap.get(conn.workspace_id);
      console.log(`   - ${conn.workspace_id.substring(0, 8)}... (auto-send: ${hasAutoSend ? '✅' : '❌'})`);
      if (hasAutoSend) {
        keepConnection = conn;
      }
    }

    console.log(`\n   → Keeping: ${keepConnection.workspace_id}`);

    // Revoke duplicates
    for (const conn of conns) {
      if (conn.id !== keepConnection.id) {
        console.log(`   → Revoking: ${conn.workspace_id}`);

        const { error: revokeError } = await supabase
          .from('channel_connections')
          .update({
            status: 'revoked',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conn.id);

        if (revokeError) {
          console.error(`     ❌ Failed to revoke: ${revokeError.message}`);
        } else {
          console.log(`     ✅ Revoked successfully`);
        }
      }
    }
  }

  console.log('\n✅ Done fixing duplicate connections!');
}

fixDuplicateConnections().catch(console.error);

