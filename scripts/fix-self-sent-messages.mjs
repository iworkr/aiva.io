/**
 * Fix Self-Sent Messages Script
 * 
 * This script marks all messages where the sender is our own account
 * as has_draft_reply: true to prevent the auto-reply system from
 * processing them.
 * 
 * Run with: node scripts/fix-self-sent-messages.mjs
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixSelfSentMessages() {
  console.log('🔧 Fixing self-sent messages...\n');

  // Step 1: Get all active channel connections with their emails
  const { data: connections, error: connError } = await supabase
    .from('channel_connections')
    .select('id, workspace_id, provider_account_id, provider_account_name')
    .eq('status', 'active');

  if (connError) {
    console.error('Error fetching connections:', connError);
    return;
  }

  console.log(`📧 Found ${connections.length} active connections:\n`);

  let totalFixed = 0;
  let totalSentLabelFixed = 0;

  for (const conn of connections) {
    const connectionEmail = conn.provider_account_id?.toLowerCase();
    if (!connectionEmail) continue;

    console.log(`\n📬 Processing: ${conn.provider_account_name || connectionEmail}`);
    console.log(`   Workspace: ${conn.workspace_id}`);

    // Fix 1: Mark messages where sender_email matches our connection email
    const { data: selfMessages, error: selfError } = await supabase
      .from('messages')
      .select('id, subject, sender_email, has_draft_reply')
      .eq('workspace_id', conn.workspace_id)
      .ilike('sender_email', connectionEmail)
      .eq('has_draft_reply', false);

    if (selfError) {
      console.error(`   Error finding self-sent messages:`, selfError);
    } else if (selfMessages && selfMessages.length > 0) {
      console.log(`   Found ${selfMessages.length} self-sent messages to fix`);
      
      for (const msg of selfMessages) {
        console.log(`      - ${msg.subject?.substring(0, 50) || 'No subject'}`);
      }

      const { error: updateError } = await supabase
        .from('messages')
        .update({ has_draft_reply: true })
        .eq('workspace_id', conn.workspace_id)
        .ilike('sender_email', connectionEmail)
        .eq('has_draft_reply', false);

      if (updateError) {
        console.error(`   Error updating self-sent messages:`, updateError);
      } else {
        totalFixed += selfMessages.length;
        console.log(`   ✅ Fixed ${selfMessages.length} self-sent messages`);
      }
    } else {
      console.log(`   ✓ No self-sent messages found`);
    }

    // Fix 2: Mark messages with SENT label
    const { data: sentLabelMessages, error: sentError } = await supabase
      .from('messages')
      .select('id, subject, labels, has_draft_reply')
      .eq('workspace_id', conn.workspace_id)
      .eq('has_draft_reply', false)
      .contains('labels', ['SENT']);

    if (sentError) {
      console.error(`   Error finding SENT label messages:`, sentError);
    } else if (sentLabelMessages && sentLabelMessages.length > 0) {
      console.log(`   Found ${sentLabelMessages.length} messages with SENT label to fix`);

      const messageIds = sentLabelMessages.map(m => m.id);
      const { error: updateError } = await supabase
        .from('messages')
        .update({ has_draft_reply: true })
        .in('id', messageIds);

      if (updateError) {
        console.error(`   Error updating SENT label messages:`, updateError);
      } else {
        totalSentLabelFixed += sentLabelMessages.length;
        console.log(`   ✅ Fixed ${sentLabelMessages.length} SENT label messages`);
      }
    }
  }

  // Fix 3: Cancel any pending auto-send items for self-sent messages
  console.log('\n🚫 Cancelling pending auto-sends for self-sent messages...');
  
  const { data: pendingItems, error: pendingError } = await supabase
    .from('auto_send_queue')
    .select(`
      id,
      workspace_id,
      message:messages(sender_email)
    `)
    .eq('status', 'pending');

  if (pendingError) {
    console.error('Error fetching pending items:', pendingError);
  } else if (pendingItems) {
    let cancelledCount = 0;
    
    for (const item of pendingItems) {
      // Get connection email for this workspace
      const { data: wsConn } = await supabase
        .from('channel_connections')
        .select('provider_account_id')
        .eq('workspace_id', item.workspace_id)
        .eq('status', 'active')
        .single();

      if (wsConn) {
        const connEmail = wsConn.provider_account_id?.toLowerCase();
        const senderEmail = item.message?.sender_email?.toLowerCase();

        if (connEmail && senderEmail && connEmail === senderEmail) {
          await supabase
            .from('auto_send_queue')
            .update({ status: 'cancelled' })
            .eq('id', item.id);
          cancelledCount++;
        }
      }
    }

    if (cancelledCount > 0) {
      console.log(`   ✅ Cancelled ${cancelledCount} pending auto-sends`);
    } else {
      console.log(`   ✓ No pending auto-sends to cancel`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Self-sent messages fixed: ${totalFixed}`);
  console.log(`   SENT label messages fixed: ${totalSentLabelFixed}`);
  console.log('='.repeat(50));
  console.log('\n✅ Done! The auto-reply loop should now be stopped.\n');
}

fixSelfSentMessages().catch(console.error);

