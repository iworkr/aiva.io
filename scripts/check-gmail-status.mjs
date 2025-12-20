#!/usr/bin/env node
/**
 * Check Gmail sync status and auto-send status for aivaioapp@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lgyewlqzelxkpawnmiog.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneWV3bHF6ZWx4a3Bhd25taW9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ4MjQ5NSwiZXhwIjoyMDQ4MDU4NDk1fQ.hVFAG4eabPXk8pS9J5JDJvEuDPqbpz8kKIGNLGYNpSM';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGmailStatus() {
  console.log('🔍 Checking Gmail status for aivaioapp@gmail.com...\n');

  // Find the Gmail connection
  const { data: connection, error: connError } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('provider', 'gmail')
    .eq('provider_account_id', 'aivaioapp@gmail.com')
    .eq('status', 'active')
    .single();

  if (connError || !connection) {
    console.error('❌ Connection not found:', connError?.message);
    return;
  }

  console.log('📧 Gmail Connection Found:');
  console.log(`   Account: ${connection.provider_account_name}`);
  console.log(`   Workspace: ${connection.workspace_id}`);
  console.log(`   Status: ${connection.status}`);
  console.log(`   Last Sync: ${connection.last_sync_at || 'NEVER'}`);
  if (connection.last_sync_at) {
    const lastSync = new Date(connection.last_sync_at);
    const hoursAgo = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    console.log(`   Hours Ago: ${hoursAgo.toFixed(1)}`);
  }
  console.log(`   Has sync_cursor: ${!!connection.sync_cursor}`);
  console.log(`   Created: ${connection.created_at}`);
  console.log(`   Updated: ${connection.updated_at}\n`);

  // Check workspace auto-send settings
  const { data: settings } = await supabase
    .from('workspace_settings')
    .select('*')
    .eq('workspace_id', connection.workspace_id)
    .single();

  if (settings) {
    console.log('⚙️  Auto-Send Settings:');
    console.log(`   Enabled: ${settings.auto_send_enabled ?? false}`);
    console.log(`   Paused: ${settings.auto_send_paused ?? false}`);
    console.log(`   Confidence Threshold: ${(settings.auto_send_confidence_threshold ?? 0.7) * 100}%\n`);
  }

  // Check recent messages
  const { data: recentMessages, count: messageCount } = await supabase
    .from('messages')
    .select('id, subject, sender_email, actionability, has_draft_reply, timestamp, created_at', { count: 'exact' })
    .eq('channel_connection_id', connection.id)
    .order('timestamp', { ascending: false })
    .limit(10);

  console.log(`📨 Recent Messages (showing 10 of ${messageCount || 0} total):`);
  if (recentMessages && recentMessages.length > 0) {
    recentMessages.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg.subject || '(No subject)'}`);
      console.log(`      From: ${msg.sender_email}`);
      console.log(`      Actionability: ${msg.actionability || 'none'}`);
      console.log(`      Has Draft: ${msg.has_draft_reply ? '✅' : '❌'}`);
      console.log(`      Time: ${msg.timestamp || msg.created_at}`);
    });
  } else {
    console.log('   No messages found');
  }
  console.log('');

  // Check drafts
  const { data: drafts, count: draftCount } = await supabase
    .from('message_drafts')
    .select('id, message_id, confidence_score, is_auto_sendable, auto_sent, created_at', { count: 'exact' })
    .eq('workspace_id', connection.workspace_id)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`✍️  Recent Drafts (showing 10 of ${draftCount || 0} total):`);
  if (drafts && drafts.length > 0) {
    drafts.forEach((draft, i) => {
      console.log(`   ${i + 1}. Draft ID: ${draft.id.substring(0, 8)}...`);
      console.log(`      Confidence: ${((draft.confidence_score ?? 0) * 100).toFixed(1)}%`);
      console.log(`      Auto-sendable: ${draft.is_auto_sendable ? '✅' : '❌'}`);
      console.log(`      Auto-sent: ${draft.auto_sent ? '✅' : '❌'}`);
      console.log(`      Created: ${draft.created_at}`);
    });
  } else {
    console.log('   No drafts found');
  }
  console.log('');

  // Check auto-send queue
  const { data: queueItems, count: queueCount } = await supabase
    .from('auto_send_queue')
    .select('*', { count: 'exact' })
    .eq('workspace_id', connection.workspace_id)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log(`📤 Auto-Send Queue (showing 20 of ${queueCount || 0} total):`);
  if (queueItems && queueItems.length > 0) {
    const byStatus = queueItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    console.log(`   Status breakdown:`, byStatus);
    
    queueItems.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. Status: ${item.status}`);
      console.log(`      Confidence: ${((item.confidence_score ?? 0) * 100).toFixed(1)}%`);
      console.log(`      Scheduled: ${item.scheduled_send_at}`);
      console.log(`      Created: ${item.created_at}`);
      if (item.error_message) {
        console.log(`      Error: ${item.error_message}`);
      }
    });
  } else {
    console.log('   No items in queue');
  }
  console.log('');

  // Check auto-send log
  const { data: logs, count: logCount } = await supabase
    .from('auto_send_log')
    .select('*', { count: 'exact' })
    .eq('workspace_id', connection.workspace_id)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log(`📋 Auto-Send Log (showing 20 of ${logCount || 0} total):`);
  if (logs && logs.length > 0) {
    const byAction = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});
    console.log(`   Action breakdown:`, byAction);
    
    logs.slice(0, 10).forEach((log, i) => {
      console.log(`   ${i + 1}. ${log.action.toUpperCase()}`);
      if (log.confidence_score) {
        console.log(`      Confidence: ${(log.confidence_score * 100).toFixed(1)}%`);
      }
      if (log.skip_reason) {
        console.log(`      Skip reason: ${log.skip_reason}`);
      }
      if (log.error_message) {
        console.log(`      Error: ${log.error_message}`);
      }
      console.log(`      Time: ${log.created_at}`);
    });
  } else {
    console.log('   No log entries found');
  }
}

checkGmailStatus().catch(console.error);

