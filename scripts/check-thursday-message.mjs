/**
 * Script to check the status of the "Thursday" message in the database
 * This helps debug why it's not appearing in the dashboard
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use values from repo rules or environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lgyewlqzelxkpawnmiog.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('Please set it in your .env file or pass it as an environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const workspaceId = 'e396f6f5-506d-49bc-8cf2-c058c864e96e';
const messageId = '367735ec-3639-4d13-b867-48e701d7da58';

async function checkMessage() {
  console.log('🔍 Checking message status...\n');

  // 1. Check the message itself
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      sender_email,
      sender_name,
      requires_human_review,
      reviewed_at,
      handled_by_aiva,
      review_reason,
      review_context,
      timestamp,
      workspace_id
    `)
    .eq('id', messageId)
    .single();

  if (msgError) {
    console.error('❌ Error fetching message:', msgError);
    return;
  }

  console.log('📧 Message Details:');
  console.log(JSON.stringify(message, null, 2));
  console.log('\n');

  // 2. Check drafts for this message
  const { data: drafts, error: draftsError } = await supabase
    .from('message_drafts')
    .select(`
      id,
      message_id,
      hold_for_review,
      review_reason,
      calendar_context,
      ai_uncertainty_notes,
      confidence_score,
      created_at
    `)
    .eq('message_id', messageId)
    .order('created_at', { ascending: false });

  if (draftsError) {
    console.error('❌ Error fetching drafts:', draftsError);
    return;
  }

  console.log('📝 Drafts:');
  console.log(JSON.stringify(drafts, null, 2));
  console.log('\n');

  // 3. Check if message would appear in dashboard query
  const { data: dashboardQuery, error: dashboardError } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      requires_human_review,
      reviewed_at,
      handled_by_aiva,
      message_drafts(
        id,
        hold_for_review
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('requires_human_review', true)
    .is('reviewed_at', null)
    .eq('handled_by_aiva', false)
    .eq('id', messageId);

  if (dashboardError) {
    console.error('❌ Error in dashboard query:', dashboardError);
    return;
  }

  console.log('🎯 Dashboard Query Result:');
  console.log(JSON.stringify(dashboardQuery, null, 2));
  console.log('\n');

  // 4. Analysis
  console.log('📊 Analysis:');
  console.log(`- requires_human_review: ${message.requires_human_review}`);
  console.log(`- reviewed_at: ${message.reviewed_at || 'null'}`);
  console.log(`- handled_by_aiva: ${message.handled_by_aiva}`);
  console.log(`- Has drafts: ${(drafts || []).length > 0}`);
  console.log(`- Has held draft: ${(drafts || []).some(d => d.hold_for_review === true)}`);
  console.log(`- Would appear in dashboard query: ${(dashboardQuery || []).length > 0}`);
  
  const heldDraft = (drafts || []).find(d => d.hold_for_review === true);
  if (heldDraft) {
    console.log(`- Held draft reason: ${heldDraft.review_reason}`);
  }

  // 5. Check all messages that SHOULD appear
  const { data: allAttentionItems, error: allError } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      sender_email,
      requires_human_review,
      reviewed_at,
      handled_by_aiva,
      message_drafts(
        id,
        hold_for_review
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('requires_human_review', true)
    .is('reviewed_at', null)
    .eq('handled_by_aiva', false)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (allError) {
    console.error('❌ Error fetching all attention items:', allError);
    return;
  }

  console.log('\n📋 All Messages That Should Appear:');
  for (const item of allAttentionItems || []) {
    const itemDrafts = (item.message_drafts || []);
    const hasHeldDraft = itemDrafts.some((d) => d.hold_for_review === true);
    console.log(`  - ${item.subject || '(no subject)'} (${item.sender_email})`);
    console.log(`    requires_human_review: ${item.requires_human_review}`);
    console.log(`    reviewed_at: ${item.reviewed_at || 'null'}`);
    console.log(`    handled_by_aiva: ${item.handled_by_aiva}`);
    console.log(`    has held draft: ${hasHeldDraft}`);
    console.log(`    draft count: ${itemDrafts.length}`);
  }
}

checkMessage().catch(console.error);

