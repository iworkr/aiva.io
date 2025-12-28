#!/usr/bin/env node
/**
 * Simple script to check Gmail sync status using Supabase directly
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lgyewlqzelxkpawnmiog.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneWV3bHF6ZWx4a3Bhd25taW9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ4MjQ5NSwiZXhwIjoyMDQ4MDU4NDk1fQ.hVFAG4eabPXk8pS9J5JDJvEuDPqbpz8kKIGNLGYNpSM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Checking Gmail status for aivaioapp@gmail.com...\n');

  // Find Gmail connection
  const { data: connections, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('provider', 'gmail')
    .ilike('provider_account_id', '%aivaioapp%');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!connections || connections.length === 0) {
    console.log('❌ No Gmail connection found for aivaioapp@gmail.com');
    return;
  }

  for (const conn of connections) {
    console.log(`\n📧 Connection: ${conn.provider_account_name || conn.provider_account_id}`);
    console.log(`   Workspace: ${conn.workspace_id}`);
    console.log(`   Status: ${conn.status}`);
    console.log(`   Last Sync: ${conn.last_sync_at || 'NEVER'}`);
    
    if (conn.last_sync_at) {
      const lastSync = new Date(conn.last_sync_at);
      const hoursAgo = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      const minutesAgo = (Date.now() - lastSync.getTime()) / (1000 * 60);
      console.log(`   ${hoursAgo < 1 ? `${Math.round(minutesAgo)} minutes ago` : `${hoursAgo.toFixed(1)} hours ago`}`);
    }
    
    console.log(`   Has sync_cursor: ${!!conn.sync_cursor}`);

    // Check workspace settings
    const { data: settings } = await supabase
      .from('workspace_settings')
      .select('auto_send_enabled, auto_send_paused, auto_send_confidence_threshold')
      .eq('workspace_id', conn.workspace_id)
      .single();

    if (settings) {
      console.log(`\n⚙️  Auto-Send Settings:`);
      console.log(`   Enabled: ${settings.auto_send_enabled ?? false}`);
      console.log(`   Paused: ${settings.auto_send_paused ?? false}`);
      console.log(`   Confidence Threshold: ${((settings.auto_send_confidence_threshold ?? 0.7) * 100).toFixed(0)}%`);
    }

    // Check recent messages count
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('channel_connection_id', conn.id);

    console.log(`\n📨 Total Messages: ${msgCount || 0}`);

    // Check drafts count
    const { count: draftCount } = await supabase
      .from('message_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', conn.workspace_id);

    console.log(`✍️  Total Drafts: ${draftCount || 0}`);

    // Check auto-send queue
    const { data: queue, count: queueCount } = await supabase
      .from('auto_send_queue')
      .select('status, confidence_score', { count: 'exact' })
      .eq('workspace_id', conn.workspace_id);

    if (queueCount > 0) {
      const byStatus = queue.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      console.log(`\n📤 Auto-Send Queue: ${queueCount} items`);
      console.log(`   Status breakdown:`, byStatus);
    } else {
      console.log(`\n📤 Auto-Send Queue: EMPTY (no items queued)`);
    }

    // Check auto-send log (last 10)
    const { data: logs } = await supabase
      .from('auto_send_log')
      .select('action, confidence_score, skip_reason, error_message, created_at')
      .eq('workspace_id', conn.workspace_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logs && logs.length > 0) {
      const byAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});
      console.log(`\n📋 Recent Auto-Send Log (last 10):`);
      console.log(`   Action breakdown:`, byAction);
      logs.slice(0, 5).forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.action.toUpperCase()} - ${log.created_at}`);
        if (log.skip_reason) console.log(`      Reason: ${log.skip_reason}`);
        if (log.error_message) console.log(`      Error: ${log.error_message}`);
        if (log.confidence_score) console.log(`      Confidence: ${(log.confidence_score * 100).toFixed(0)}%`);
      });
    } else {
      console.log(`\n📋 Auto-Send Log: EMPTY (no activity)`);
    }
  }
}

main().catch(console.error);



