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

    // 4. Query actionable messages (request, question, scheduling_intent) - matching dashboard query
    const { data: actionableItems, error: actionableError } = await supabase
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
        actionability,
        requires_human_review,
        reviewed_at,
        handled_by_aiva,
        handle_action,
        channel_connection:channel_connections(provider),
        message_drafts(
          id,
          body,
          confidence_score,
          hold_for_review,
          review_reason,
          calendar_context,
          ai_uncertainty_notes,
          auto_sent,
          auto_sent_at
        )
      `)
      .eq('workspace_id', workspaceId)
      .in('actionability', ['request', 'question', 'scheduling_intent'])
      .eq('requires_human_review', false)
      .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
      .order('timestamp', { ascending: false })
      .limit(60);

    if (actionableError) {
      return NextResponse.json({ 
        error: `Actionable items query error: ${actionableError.message}` 
      }, { status: 500 });
    }

    // Get excluded categories
    const { data: workspaceSettings } = await supabase
      .from('workspace_settings')
      .select('auto_send_excluded_categories')
      .eq('workspace_id', workspaceId)
      .single();

    const excludedCategories = (workspaceSettings?.auto_send_excluded_categories as string[]) || [];

    // Check which actionable messages are in auto-send queue
    const actionableMessageIds = (actionableItems || []).map((m: any) => m.id);
    let queuedMessageIds = new Set<string>();
    if (actionableMessageIds.length > 0) {
      const { data: queueItems } = await supabase
        .from('auto_send_queue')
        .select('message_id, status')
        .eq('workspace_id', workspaceId)
        .in('message_id', actionableMessageIds)
        .eq('status', 'pending');
      
      queuedMessageIds = new Set((queueItems || []).map((q: any) => q.message_id));
    }

    // Helper function to check if message should be excluded (matching dashboard logic)
    const shouldExcludeMessage = (msg: any): boolean => {
      // 1. Check excluded categories
      if (msg.category && excludedCategories.length > 0) {
        const categoryLower = msg.category.toLowerCase();
        if (excludedCategories.some(excluded => excluded.toLowerCase() === categoryLower)) {
          return true;
        }
      }
      
      // 2. Exclude promotional categories (unless actionable)
      const promotionalCategories = ['marketing', 'junk_email', 'newsletter'];
      if (msg.category && promotionalCategories.includes(msg.category.toLowerCase())) {
        const isActionable = msg.actionability && ['request', 'question', 'scheduling_intent'].includes(msg.actionability);
        if (!isActionable) return true;
      }
      
      // 3. Exclude noise priority (unless actionable)
      if (msg.priority === 'noise') {
        const isActionable = msg.actionability && ['request', 'question', 'scheduling_intent'].includes(msg.actionability);
        if (!isActionable) return true;
      }
      
      // 4. Exclude reviewed but not handled
      // BUT: Don't exclude if they have scheduling_intent (scheduling items need attention even if reviewed)
      // BUT: Don't exclude if they have a held draft (held drafts need human review regardless of reviewed status)
      // Note: We can't check for held drafts here (draft info not available), so we'll check later in the actionable items loop
      if (msg.reviewed_at && !msg.handled_by_aiva && msg.actionability !== 'scheduling_intent') {
        return true;
      }
      
      // 5. Exclude system magic link messages from auth systems (not security alerts)
      // These are one-time authentication links from our own systems that AI can't handle
      // BUT: Don't exclude security alerts like "Verify phone number" or "Action needed on Facebook"
      // Those are real actionable items that need human attention
      const senderLower = (msg.sender_email || '').toLowerCase();
      const subjectLower = (msg.subject || '').toLowerCase();
      
      // Only exclude magic links from our own auth systems (Supabase Auth, Aiva Auth)
      // These are system-generated auth links, not real security alerts
      const isSystemAuthLink = 
        (subjectLower.includes('magic link') && 
         (senderLower.includes('noreply@mail.app.supabase.io') || 
          senderLower.includes('no-reply@tryaiva.io')));
      
      if (isSystemAuthLink) {
        return true; // System auth magic links - not actionable by AI
      }
      
      // 6. Exclude personal and internal category messages (these are typically test messages or internal notes)
      // BUT: Don't exclude if they have scheduling_intent (scheduling items need attention even if personal)
      // Personal/internal messages are usually not business-critical and if they're actionable,
      // they're likely test messages like "Hi Aiva!" or "Test Auto Send"
      // Exception: Scheduling items (like "Lunch on Thursday") should show even if personal
      if ((msg.category === 'personal' || msg.category === 'internal') && msg.actionability !== 'scheduling_intent') {
        return true; // Personal/internal messages don't need attention in business context (unless scheduling)
      }
      
      // 7. Exclude test messages in client_support category (these are misclassified test messages)
      // Test messages from the user's own email in client_support should be filtered
      // These are typically test messages like "Hi Aiva!", "Test Auto Send", "Does this work?"
      // Note: senderLower and subjectLower are already declared above
      
      // Check if this is a test message in client_support category
      // Test messages often have short subjects, test-related keywords, or are from the user themselves
      const isTestMessageInClientSupport = 
        msg.category === 'client_support' &&
        (
          // Test-related keywords in subject
          subjectLower.includes('test') ||
          subjectLower.includes('hi aiva') ||
          subjectLower.includes('aiva replies') ||
          subjectLower.includes('auto reply') ||
          subjectLower.includes('auto send') ||
          subjectLower.includes('does this work') ||
          subjectLower.includes('please help') ||
          subjectLower.includes('help me aiva') ||
          // Very short subjects (likely test messages)
          (subjectLower.length < 15 && !subjectLower.includes('urgent') && !subjectLower.includes('important'))
        );
      
      if (isTestMessageInClientSupport) {
        return true; // Test messages in client_support don't need attention
      }
      
      // 8. Exclude non-actionable client_support messages (feedback requests, promotional)
      // Some client_support messages are just feedback requests or promotional and don't need urgent attention
      // Note: subjectLower is already declared above
      if (msg.category === 'client_support') {
        // Feedback requests (e.g., "Tell us how we did!")
        if (subjectLower.includes('tell us how we did') || 
            subjectLower.includes('how did we do') ||
            subjectLower.includes('rate us') ||
            subjectLower.includes('feedback')) {
          return true; // Feedback requests don't need urgent attention
        }
        // Promotional support messages (e.g., "Want to test...")
        if (subjectLower.includes('want to test') || 
            subjectLower.includes('try our') ||
            subjectLower.includes('still haven')) {
          return true; // Promotional support messages don't need urgent attention
        }
      }
      
      // 9. Exclude welcome/onboarding messages in other categories
      // Note: subjectLower is already declared above
      if (msg.category === 'other' || msg.category === 'client_support') {
        if (subjectLower.includes('welcome to') || 
            subjectLower.includes('confirm your email and launch')) {
          return true; // Welcome/onboarding messages don't need urgent attention
        }
      }
      
      // 10. Exclude messages from Aiva's own email (aivaioapp@gmail.com) in client_support category
      // These are typically Aiva replying to itself from marketing threads and don't need attention
      if (msg.category === 'client_support' && senderLower.includes('aivaioapp@gmail.com')) {
        return true; // Aiva replying to itself from marketing threads
      }
      
      // 11. Exclude promotional messages misclassified as customer_inquiry
      // Messages from promotional domains like "createanything.com" that are misclassified
      if (msg.category === 'customer_inquiry') {
        // Check for promotional domains or subjects
        if (senderLower.includes('createanything.com') ||
            subjectLower.includes('saw you tried') ||
            subjectLower.includes('try anything')) {
          return true; // Promotional messages misclassified as customer inquiry
        }
      }
      
      // NOTE: Security alerts like "Verify phone number" or "Action needed on Facebook"
      // are in security_alert category and are actionable, so they will show
      
      return false;
    };

    // 5. Process review items (matching dashboard logic)
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

    // 6. Process held drafts (matching dashboard logic)
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

    // 7. Process actionable messages (matching dashboard logic exactly)
    const processedActionableItems = (actionableItems || []).map((msg: any) => {
      const drafts = (msg.message_drafts as any[]) || [];
      const heldDraft = drafts.find((d: any) => d.hold_for_review === true);
      const autoSentDraft = drafts.find((d: any) => d.auto_sent === true);
      const hasAutoSendableDraft = drafts.some((d: any) => 
        !d.hold_for_review && 
        !d.auto_sent && 
        d.body
      );
      
      // If message has a held draft, always show it (needs human review regardless of other filters)
      // This matches the dashboard logic where held drafts are checked BEFORE exclusion rules
      if (heldDraft) {
        const ageDays = msg.timestamp ? Math.round((Date.now() - new Date(msg.timestamp).getTime()) / (24 * 60 * 60 * 1000)) : null;
        return {
          messageId: msg.id,
          subject: msg.subject,
          senderEmail: msg.sender_email,
          senderName: msg.sender_name,
          timestamp: msg.timestamp,
          ageDays,
          actionability: msg.actionability,
          category: msg.category,
          priority: msg.priority,
          handled_by_aiva: msg.handled_by_aiva,
          reviewed_at: msg.reviewed_at,
          hasDraft: drafts.length > 0,
          hasHeldDraft: true,
          hasAutoSendableDraft,
          isExcluded: false, // Held drafts bypass exclusion
          isQueued: queuedMessageIds.has(msg.id),
          exclusionReason: null,
          wouldAppear: !queuedMessageIds.has(msg.id), // Show unless queued
          showReason: 'has_held_draft',
        };
      }
      
      const isQueued = queuedMessageIds.has(msg.id);
      const isExcluded = shouldExcludeMessage(msg);
      
      // Match dashboard logic exactly:
      // Show if: (!hasAutoSendableDraft) AND not excluded AND not queued
      // CRITICAL: If hasAutoSendableDraft is true and there's no heldDraft, DON'T show
      // CRITICAL: If autoSentDraft, DON'T show (already handled, regardless of age)
      const shouldShow = !isExcluded && !isQueued && !hasAutoSendableDraft;
      
      // Calculate age for exclusion reason
      let ageDays = null;
      if (msg.timestamp) {
        ageDays = Math.round((Date.now() - new Date(msg.timestamp).getTime()) / (24 * 60 * 60 * 1000));
      }
      
      return {
        messageId: msg.id,
        subject: msg.subject,
        senderEmail: msg.sender_email,
        senderName: msg.sender_name,
        timestamp: msg.timestamp,
        ageDays,
        actionability: msg.actionability,
        category: msg.category,
        priority: msg.priority,
        handled_by_aiva: msg.handled_by_aiva,
        reviewed_at: msg.reviewed_at,
        hasDraft: drafts.length > 0,
        hasHeldDraft: !!heldDraft,
        hasAutoSendableDraft,
        isExcluded,
        isQueued,
        exclusionReason: isExcluded ? (
          excludedCategories.some(c => c.toLowerCase() === msg.category?.toLowerCase()) ? 'excluded_category' :
          ['marketing', 'junk_email', 'newsletter'].includes(msg.category?.toLowerCase() || '') ? 'promotional_category' :
          msg.priority === 'noise' ? 'noise_priority' :
          msg.reviewed_at && !msg.handled_by_aiva ? 'reviewed_not_handled' :
          ageDays && ageDays > 30 && msg.priority !== 'urgent' && msg.priority !== 'high' ? `age_filter_${ageDays}_days` :
          'unknown'
        ) : null,
        wouldAppear: shouldShow,
        showReason: shouldShow ? (
          heldDraft ? 'has_held_draft' :
          !hasAutoSendableDraft ? 'no_auto_sendable_draft' :
          'unknown'
        ) : (
          isExcluded ? 'excluded' :
          isQueued ? 'queued_for_auto_send' :
          hasAutoSendableDraft ? 'has_auto_sendable_draft' :
          autoSentDraft ? 'was_auto_replied_already_handled' :
          'unknown'
        ),
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
      actionableItemsQuery: {
        total: actionableItems?.length || 0,
        items: processedActionableItems,
        wouldAppearCount: processedActionableItems.filter(i => i.wouldAppear).length,
        excludedCount: processedActionableItems.filter(i => i.isExcluded).length,
        queuedCount: processedActionableItems.filter(i => i.isQueued).length,
      },
      excludedCategories,
      summary: {
        messagesWithRequiresReview: processedReviewItems.length,
        heldDraftsCount: processedHeldDrafts.length,
        actionableMessagesCount: processedActionableItems.length,
        wouldAppearCount: processedReviewItems.filter(i => i.wouldAppear).length + 
                         processedHeldDrafts.filter(i => i.wouldAppear).length +
                         processedActionableItems.filter(i => i.wouldAppear).length,
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

