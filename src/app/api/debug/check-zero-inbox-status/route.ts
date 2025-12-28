/**
 * Debug endpoint to check Zero Inbox message status
 * Helps diagnose why messages are still showing when Zero Inbox is enabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getNeedsAttentionItems } from '@/data/user/dashboard-stats';

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

    // Get workspace settings
    const { data: workspaceSettings } = await supabase
      .from('workspace_settings')
      .select('inbox_zero_enabled, auto_archive_handled, apply_aiva_label')
      .eq('workspace_id', workspaceId)
      .single();

    const isZeroInboxEnabled = workspaceSettings?.inbox_zero_enabled ?? true;

    // Count all messages
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    // Count handled messages
    const { count: handledCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('handled_by_aiva', true);

    // Count unhandled messages
    const { count: unhandledCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('handled_by_aiva', false);

    // Count unread messages (all)
    const { count: unreadAllCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_read', false);

    // Count unread AND unhandled (what should show in MorningBrief when Zero Inbox enabled)
    // Include NULL as unhandled (matches MorningBrief query logic)
    const { count: unreadUnhandledCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_read', false)
      .or('handled_by_aiva.is.null,handled_by_aiva.eq.false');

    // Count messages requiring human review
    const { count: requiresReviewCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('requires_human_review', true);

    // Count messages requiring human review AND unhandled
    const { count: requiresReviewUnhandledCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('requires_human_review', true)
      .eq('handled_by_aiva', false);

    // Get sample of unread unhandled messages
    // Include NULL as unhandled (matches MorningBrief query logic)
    const { data: sampleUnreadUnhandled } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        sender_email,
        timestamp,
        is_read,
        handled_by_aiva,
        handled_at,
        handle_action,
        requires_human_review,
        reviewed_at,
        actionability,
        category,
        priority
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_read', false)
      .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
      .order('timestamp', { ascending: false })
      .limit(20);

    // Get breakdown by handle_action
    const { data: handleActionBreakdown } = await supabase
      .from('messages')
      .select('handle_action')
      .eq('workspace_id', workspaceId)
      .eq('handled_by_aiva', true);

    const actionCounts = (handleActionBreakdown || []).reduce((acc, msg) => {
      const action = msg.handle_action || 'unknown';
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count active conversations (unique threads with unhandled messages)
    const { data: activeThreadsData } = await supabase
      .from('messages')
      .select('provider_thread_id')
      .eq('workspace_id', workspaceId)
      .eq('handled_by_aiva', false)
      .not('provider_thread_id', 'is', null);

    const uniqueThreads = new Set(
      (activeThreadsData || [])
        .map((msg) => msg.provider_thread_id)
        .filter(Boolean)
    );

    // Get actionable items count (what actually shows in dashboard with Zero Inbox)
    // This uses the same filtering logic as getNeedsAttentionItems
    let actionableItemsCount = 0;
    let actionableConversationsCount = 0;
    if (isZeroInboxEnabled && user) {
      try {
        const attentionItems = await getNeedsAttentionItems(workspaceId, user.id, 100);
        actionableItemsCount = attentionItems.length;
        
        // Count unique threads from actionable items
        if (attentionItems.length > 0) {
          const messageIds = attentionItems.map(item => item.messageId);
          const { data: actionableThreads } = await supabase
            .from('messages')
            .select('provider_thread_id')
            .eq('workspace_id', workspaceId)
            .in('id', messageIds)
            .not('provider_thread_id', 'is', null);
          
          const uniqueActionableThreads = new Set(
            (actionableThreads || [])
              .map((msg: any) => msg.provider_thread_id)
              .filter(Boolean)
          );
          actionableConversationsCount = uniqueActionableThreads.size;
        }
      } catch (error) {
        console.error('Error getting actionable items:', error);
      }
    }

    return NextResponse.json({
      workspaceId,
      zeroInboxSettings: {
        enabled: isZeroInboxEnabled,
        autoArchive: workspaceSettings?.auto_archive_handled ?? true,
        applyLabel: workspaceSettings?.apply_aiva_label ?? true,
      },
      messageCounts: {
        total: totalMessages || 0,
        handled: handledCount || 0,
        unhandled: unhandledCount || 0,
        unreadAll: unreadAllCount || 0,
        unreadUnhandled: unreadUnhandledCount || 0, // Raw count of unread unhandled
        requiresReview: requiresReviewCount || 0,
        requiresReviewUnhandled: requiresReviewUnhandledCount || 0,
        actionableItems: actionableItemsCount, // What actually shows in dashboard (with filtering)
      },
      activeConversations: {
        uniqueThreadsWithUnhandled: uniqueThreads.size, // Raw count
        actionableConversations: actionableConversationsCount, // What actually shows (with filtering)
      },
      handleActionBreakdown: actionCounts,
      sampleUnreadUnhandled: sampleUnreadUnhandled || [],
      analysis: {
        expectedMorningBriefCount: isZeroInboxEnabled
          ? actionableItemsCount // Use actionable items count, not raw unread unhandled
          : unreadAllCount || 0,
        rawUnreadUnhandledCount: unreadUnhandledCount || 0, // Raw count for reference
        messagesThatShouldBeHandled: unreadUnhandledCount || 0,
        messagesRequiringReview: requiresReviewUnhandledCount || 0,
      },
    });
  } catch (error) {
    console.error('Debug Zero Inbox status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

