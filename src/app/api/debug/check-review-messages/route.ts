/**
 * Debug endpoint to check why messages requiring human review aren't showing
 * Helps diagnose filtering issues in getNeedsAttentionItems
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    // Get excluded categories from workspace settings
    const { data: workspaceSettings } = await supabase
      .from('workspace_settings')
      .select('auto_send_excluded_categories')
      .eq('workspace_id', workspaceId)
      .single();

    const excludedCategories = (workspaceSettings?.auto_send_excluded_categories as string[]) || [];

    // Get ALL messages requiring human review (no filters)
    const { data: allReviewMessages, error: allError } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        sender_email,
        timestamp,
        category,
        requires_human_review,
        reviewed_at,
        handled_by_aiva,
        handle_action,
        review_reason
      `)
      .eq('workspace_id', workspaceId)
      .eq('requires_human_review', true)
      .order('timestamp', { ascending: false });

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Get messages that would pass the getNeedsAttentionItems query
    // (requires_human_review = true AND reviewed_at IS NULL)
    const { data: unreviewedMessages, error: unreviewedError } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        sender_email,
        timestamp,
        category,
        requires_human_review,
        reviewed_at,
        handled_by_aiva,
        handle_action,
        review_reason
      `)
      .eq('workspace_id', workspaceId)
      .eq('requires_human_review', true)
      .is('reviewed_at', null)
      .order('timestamp', { ascending: false });

    if (unreviewedError) {
      return NextResponse.json({ error: unreviewedError.message }, { status: 500 });
    }

    // Analyze why messages are filtered out
    const analysis = {
      totalRequiringReview: allReviewMessages?.length || 0,
      unreviewedCount: unreviewedMessages?.length || 0,
      reviewedCount: (allReviewMessages || []).filter(m => m.reviewed_at).length,
      filteredByCategory: [] as any[],
      handledButNotAutoReplied: [] as any[],
      wouldAppearInMorningBrief: [] as any[],
    };

    // Check each unreviewed message
    for (const msg of unreviewedMessages || []) {
      const isExcludedCategory = msg.category && excludedCategories.some(
        excluded => excluded.toLowerCase() === msg.category?.toLowerCase()
      );
      
      const isHandledButNotAutoReplied = msg.handled_by_aiva && msg.handle_action !== 'auto_replied';
      
      if (isExcludedCategory) {
        analysis.filteredByCategory.push({
          id: msg.id,
          subject: msg.subject,
          category: msg.category,
          excludedCategory: excludedCategories.find(
            excluded => excluded.toLowerCase() === msg.category?.toLowerCase()
          ),
        });
      }
      
      if (isHandledButNotAutoReplied) {
        analysis.handledButNotAutoReplied.push({
          id: msg.id,
          subject: msg.subject,
          handled_by_aiva: msg.handled_by_aiva,
          handle_action: msg.handle_action,
        });
      }
      
      // Messages that would appear (not excluded category, not handled, or auto-replied)
      if (!isExcludedCategory && (!msg.handled_by_aiva || msg.handle_action === 'auto_replied')) {
        analysis.wouldAppearInMorningBrief.push({
          id: msg.id,
          subject: msg.subject,
          category: msg.category,
          handled_by_aiva: msg.handled_by_aiva,
          handle_action: msg.handle_action,
        });
      }
    }

    return NextResponse.json({
      workspaceId,
      excludedCategories,
      analysis: {
        ...analysis,
        summary: {
          totalRequiringReview: analysis.totalRequiringReview,
          alreadyReviewed: analysis.reviewedCount,
          unreviewed: analysis.unreviewedCount,
          filteredByCategory: analysis.filteredByCategory.length,
          handledButNotAutoReplied: analysis.handledButNotAutoReplied.length,
          wouldAppearInMorningBrief: analysis.wouldAppearInMorningBrief.length,
        },
      },
      allReviewMessages: allReviewMessages?.map(m => ({
        id: m.id,
        subject: m.subject,
        reviewed_at: m.reviewed_at,
        handled_by_aiva: m.handled_by_aiva,
        handle_action: m.handle_action,
        category: m.category,
      })),
      unreviewedMessages: unreviewedMessages?.map(m => ({
        id: m.id,
        subject: m.subject,
        category: m.category,
        handled_by_aiva: m.handled_by_aiva,
        handle_action: m.handle_action,
        review_reason: m.review_reason,
      })),
      filteredByCategory: analysis.filteredByCategory,
      handledButNotAutoReplied: analysis.handledButNotAutoReplied,
      wouldAppearInMorningBrief: analysis.wouldAppearInMorningBrief,
    });
  } catch (error) {
    console.error('Debug review messages error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

