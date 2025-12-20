/**
 * Debug endpoint to fix messages that have held drafts but requires_human_review is false
 * This backfills the requires_human_review flag for messages that should be flagged
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const supabase = supabaseAdminClient;

    // Find all messages that have held drafts but requires_human_review is false
    const { data: messagesWithHeldDrafts, error: queryError } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        sender_email,
        requires_human_review,
        reviewed_at,
        handled_by_aiva,
        message_drafts!inner(
          id,
          hold_for_review,
          review_reason,
          calendar_context,
          ai_uncertainty_notes,
          confidence_score
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('message_drafts.hold_for_review', true)
      .eq('requires_human_review', false)
      .is('reviewed_at', null)
      .eq('handled_by_aiva', false);

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    const fixed: any[] = [];
    const errors: any[] = [];

    // Update each message to set requires_human_review = true
    for (const msg of messagesWithHeldDrafts || []) {
      const heldDraft = (msg.message_drafts as any[])?.[0];
      if (!heldDraft) continue;

      const { error: updateError } = await supabase
        .from('messages')
        .update({
          requires_human_review: true,
          review_reason: heldDraft.review_reason || 'draft_held_for_review',
          review_context: {
            draftId: heldDraft.id,
            confidenceScore: heldDraft.confidence_score,
            calendarContext: heldDraft.calendar_context,
            aiUncertaintyNotes: heldDraft.ai_uncertainty_notes,
            fixedAt: new Date().toISOString(),
            fixedBy: 'backfill_script',
          },
        })
        .eq('id', msg.id);

      if (updateError) {
        errors.push({
          messageId: msg.id,
          subject: msg.subject,
          error: updateError.message,
        });
      } else {
        fixed.push({
          messageId: msg.id,
          subject: msg.subject,
          sender: msg.sender_email,
          reviewReason: heldDraft.review_reason,
        });
      }
    }

    return NextResponse.json({
      workspaceId,
      totalFound: messagesWithHeldDrafts?.length || 0,
      fixed: fixed.length,
      fixedMessages: fixed,
      errorCount: errors.length,
      errors: errors,
    });
  } catch (error) {
    console.error('Fix held drafts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

