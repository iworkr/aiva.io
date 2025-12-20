/**
 * Debug endpoint to check why messages aren't appearing in "What needs your attention"
 * This helps diagnose issues with the dashboard query
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const messageId = searchParams.get('messageId'); // Optional: check specific message

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const supabase = supabaseAdminClient;

    // 1. Check the specific message if provided
    let specificMessage = null;
    if (messageId) {
      const { data: msg, error: msgError } = await supabase
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
          created_at,
          message_drafts(
            id,
            hold_for_review,
            review_reason,
            calendar_context,
            ai_uncertainty_notes,
            confidence_score,
            created_at
          )
        `)
        .eq('id', messageId)
        .eq('workspace_id', workspaceId)
        .single();

      if (msgError) {
        return NextResponse.json({ 
          error: `Message query error: ${msgError.message}` 
        }, { status: 500 });
      }

      specificMessage = msg;
    }

    // 2. Query messages that SHOULD appear (matching dashboard query exactly)
    const { data: reviewItems, error: reviewError } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        sender_email,
        sender_name,
        snippet,
        timestamp,
        priority,
        category,
        review_reason,
        review_context,
        has_draft_reply,
        requires_human_review,
        reviewed_at,
        handled_by_aiva,
        channel_connection:channel_connections(provider),
        message_drafts(
          id,
          body,
          confidence_score,
          hold_for_review,
          review_reason,
          calendar_context,
          ai_uncertainty_notes
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('requires_human_review', true)
      .is('reviewed_at', null)
      .eq('handled_by_aiva', false)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (reviewError) {
      return NextResponse.json({ 
        error: `Review items query error: ${reviewError.message}` 
      }, { status: 500 });
    }

    // 3. Also check held drafts (backup query)
    const { data: heldDrafts, error: heldDraftsError } = await supabase
      .from('message_drafts')
      .select(`
        id,
        message_id,
        body,
        confidence_score,
        review_reason,
        calendar_context,
        ai_uncertainty_notes,
        hold_for_review,
        message:messages!inner(
          id,
          subject,
          sender_email,
          sender_name,
          snippet,
          timestamp,
          priority,
          category,
          requires_human_review,
          reviewed_at,
          handled_by_aiva,
          workspace_id,
          channel_connection:channel_connections(provider)
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('hold_for_review', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (heldDraftsError) {
      return NextResponse.json({ 
        error: `Held drafts query error: ${heldDraftsError.message}` 
      }, { status: 500 });
    }

    // 4. Process review items (matching dashboard logic)
    const processedReviewItems = (reviewItems || []).map(msg => {
      const drafts = (msg.message_drafts as any[]) || [];
      const heldDraft = drafts.find((d: any) => d.hold_for_review === true);
      const draft = heldDraft || drafts[0];

      return {
        messageId: msg.id,
        subject: msg.subject,
        senderEmail: msg.sender_email,
        senderName: msg.sender_name,
        timestamp: msg.timestamp,
        requires_human_review: msg.requires_human_review,
        reviewed_at: msg.reviewed_at,
        handled_by_aiva: msg.handled_by_aiva,
        hasDraft: !!draft,
        hasHeldDraft: !!heldDraft,
        draftCount: drafts.length,
        wouldAppear: !!(heldDraft || drafts.length > 0),
      };
    });

    // 5. Process held drafts (matching dashboard logic)
    const processedHeldDrafts = (heldDrafts || []).map(draft => {
      const msg = (draft.message as any);
      return {
        draftId: draft.id,
        messageId: msg?.id,
        subject: msg?.subject,
        senderEmail: msg?.sender_email,
        requires_human_review: msg?.requires_human_review,
        reviewed_at: msg?.reviewed_at,
        handled_by_aiva: msg?.handled_by_aiva,
        workspace_id: msg?.workspace_id,
        hold_for_review: draft.hold_for_review,
        wouldAppear: !msg?.reviewed_at && !msg?.handled_by_aiva && msg?.workspace_id === workspaceId,
      };
    });

    return NextResponse.json({
      workspaceId,
      specificMessage: specificMessage ? {
        id: specificMessage.id,
        subject: specificMessage.subject,
        sender_email: specificMessage.sender_email,
        requires_human_review: specificMessage.requires_human_review,
        reviewed_at: specificMessage.reviewed_at,
        handled_by_aiva: specificMessage.handled_by_aiva,
        review_reason: specificMessage.review_reason,
        hasDrafts: (specificMessage.message_drafts as any[])?.length || 0,
        hasHeldDraft: (specificMessage.message_drafts as any[])?.some((d: any) => d.hold_for_review === true),
        wouldAppearInDashboard: 
          specificMessage.requires_human_review === true &&
          !specificMessage.reviewed_at &&
          !specificMessage.handled_by_aiva &&
          ((specificMessage.message_drafts as any[])?.some((d: any) => d.hold_for_review === true) || 
           (specificMessage.message_drafts as any[])?.length > 0),
      } : null,
      reviewItemsQuery: {
        total: reviewItems?.length || 0,
        items: processedReviewItems,
      },
      heldDraftsQuery: {
        total: heldDrafts?.length || 0,
        items: processedHeldDrafts,
      },
      summary: {
        messagesWithRequiresReview: processedReviewItems.length,
        heldDraftsCount: processedHeldDrafts.length,
        wouldAppearCount: processedReviewItems.filter(i => i.wouldAppear).length + 
                         processedHeldDrafts.filter(i => i.wouldAppear).length,
      },
    });
  } catch (error) {
    console.error('Check attention items error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

