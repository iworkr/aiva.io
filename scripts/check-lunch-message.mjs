import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lgyewlqzelxkpawnmiog.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneWV3bHF6ZWx4a3Bhd25taW9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ4MjQ5NSwiZXhwIjoyMDQ4MDU4NDk1fQ.hVFAG4eabPXk8pS9J5JDJvEuDPqbpz8kKIGNLGYNpSM';

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Workspace ID from previous logs
const workspaceId = 'e396f6f5-506d-49bc-8cf2-c058c864e96e';

async function checkMessage() {
  console.log('🔍 Checking for "lunch" message from Joseph...\n');

  // Find the message
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      sender_email,
      sender_name,
      snippet,
      timestamp,
      actionability,
      category,
      priority,
      confidence_score,
      has_draft_reply,
      requires_human_review,
      handled_by_aiva,
      labels,
      created_at,
      channel_connection:channel_connections(provider, provider_account_name)
    `)
    .eq('workspace_id', workspaceId)
    .ilike('subject', '%lunch%')
    .ilike('sender_email', '%joseph%')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (msgError) {
    console.error('❌ Error fetching messages:', msgError);
    return;
  }

  if (!messages || messages.length === 0) {
    console.log('❌ No messages found matching "lunch" from Joseph');
    return;
  }

  console.log(`✅ Found ${messages.length} message(s):\n`);

  for (const msg of messages) {
    console.log('📧 Message Details:');
    console.log(`   Subject: ${msg.subject}`);
    console.log(`   From: ${msg.sender_name} <${msg.sender_email}>`);
    console.log(`   Provider: ${msg.channel_connection?.provider} (${msg.channel_connection?.provider_account_name})`);
    console.log(`   Timestamp: ${msg.timestamp}`);
    console.log(`   Category: ${msg.category || 'null'} (Confidence: ${msg.confidence_score || 'null'})`);
    console.log(`   Priority: ${msg.priority || 'null'}`);
    console.log(`   Actionability: ${msg.actionability || 'null'}`);
    console.log(`   Has Draft: ${msg.has_draft_reply}`);
    console.log(`   Requires Human Review: ${msg.requires_human_review}`);
    console.log(`   Handled by Aiva: ${msg.handled_by_aiva}`);
    console.log('');

    // Check for drafts
    const { data: drafts } = await supabase
      .from('message_drafts')
      .select('*')
      .eq('message_id', msg.id)
      .order('created_at', { ascending: false });

    if (drafts && drafts.length > 0) {
      console.log(`   📝 Drafts (${drafts.length}):`);
      for (const draft of drafts) {
        console.log(`      - ID: ${draft.id}`);
        console.log(`        Confidence: ${draft.confidence_score || 'null'}`);
        console.log(`        Status: ${draft.status}`);
        console.log(`        Created: ${draft.created_at}`);
      }
    } else {
      console.log('   📝 No drafts found');
    }

    // Check auto-send queue
    const { data: queueItems } = await supabase
      .from('auto_send_queue')
      .select('*')
      .eq('message_id', msg.id);

    if (queueItems && queueItems.length > 0) {
      console.log(`   📤 Auto-send Queue (${queueItems.length}):`);
      for (const item of queueItems) {
        console.log(`      - ID: ${item.id}`);
        console.log(`        Status: ${item.status}`);
        console.log(`        Created: ${item.created_at}`);
        console.log(`        Scheduled: ${item.scheduled_at}`);
      }
    } else {
      console.log('   📤 Not in auto-send queue');
    }

    // Get workspace settings
    const { data: settings } = await supabase
      .from('workspace_settings')
      .select('auto_send_enabled, auto_send_confidence_threshold, auto_send_paused')
      .eq('workspace_id', workspaceId)
      .single();

    console.log('\n   ⚙️  Workspace Settings:');
    console.log(`      Auto-send Enabled: ${settings?.auto_send_enabled || false}`);
    console.log(`      Auto-send Paused: ${settings?.auto_send_paused || false}`);
    console.log(`      Unified Confidence Threshold: ${settings?.auto_send_confidence_threshold || 0.85} (controls both auto-send and review)`);

    // Analyze why it might not have gotten a reply
    console.log('\n   🔍 Analysis:');
    const reasons = [];

    if (!msg.actionability || msg.actionability === 'none') {
      reasons.push(`❌ Actionability is '${msg.actionability || 'null'}' (needs: question, request, fyi, scheduling_intent, or task)`);
    } else {
      console.log(`   ✅ Actionability: ${msg.actionability}`);
    }

    if (!settings?.auto_send_enabled) {
      reasons.push('❌ Auto-send is disabled');
    } else {
      console.log('   ✅ Auto-send is enabled');
    }

    if (settings?.auto_send_paused) {
      reasons.push('❌ Auto-send is paused');
    }

    if (msg.requires_human_review) {
      reasons.push('⚠️  Flagged for human review');
    }

    if (drafts && drafts.length > 0) {
      const latestDraft = drafts[0];
      const unifiedThreshold = settings?.auto_send_confidence_threshold || 0.85;
      if ((latestDraft.confidence_score || 0) < unifiedThreshold) {
        reasons.push(`❌ Draft confidence (${latestDraft.confidence_score}) below unified threshold (${unifiedThreshold})`);
      } else {
        console.log(`   ✅ Draft confidence (${latestDraft.confidence_score}) meets unified threshold (${unifiedThreshold})`);
      }

      if (!queueItems || queueItems.length === 0) {
        reasons.push('❌ Draft exists but not queued for auto-send');
      } else {
        console.log('   ✅ Draft is in auto-send queue');
      }
    } else {
      reasons.push('❌ No draft generated yet');
    }

    if (reasons.length > 0) {
      console.log('\n   ⚠️  Reasons why it might not have gotten a reply:');
      reasons.forEach(r => console.log(`      ${r}`));
    } else {
      console.log('\n   ✅ All checks passed - should have gotten a reply!');
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

checkMessage().catch(console.error);

