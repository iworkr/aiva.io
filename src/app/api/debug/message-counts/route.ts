/**
 * Debug endpoint to check message counts and identify discrepancies
 * Shows why "new messages" count doesn't match "What needs your attention" items
 */

import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getSoloWorkspace } from '@/data/user/workspaces';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const userSupabase = await createSupabaseUserRouteHandlerClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-detect workspace
    let workspaceId: string;
    try {
      const soloWorkspace = await getSoloWorkspace();
      workspaceId = soloWorkspace.id;
    } catch (error) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    const supabase = await createSupabaseUserRouteHandlerClient();

    // Get workspace settings
    const { data: workspaceSettings } = await supabase
      .from('workspace_settings')
      .select('inbox_zero_enabled, auto_send_excluded_categories')
      .eq('workspace_id', workspaceId)
      .single();

    const isZeroInboxEnabled = workspaceSettings?.inbox_zero_enabled ?? true;
    const excludedCategories = (workspaceSettings?.auto_send_excluded_categories as string[]) || [];

    // 1. Total messages today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: totalMessagesToday } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('timestamp', today.toISOString());

    // 2. Unread messages
    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_read', false);

    // 3. Messages requiring human review
    const { count: requiresReview } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('requires_human_review', true)
      .is('reviewed_at', null);

    // 4. Handled messages
    const { count: handledMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('handled_by_aiva', true);

    // 5. Test messages (from test endpoints)
    const { data: testMessages } = await supabase
      .from('messages')
      .select('id, subject, sender_email, timestamp, requires_human_review, handled_by_aiva, category, priority')
      .eq('workspace_id', workspaceId)
      .or('subject.ilike.%test%,raw_data->test.eq.true')
      .order('timestamp', { ascending: false })
      .limit(50);

    // 6. Messages by category
    const { data: messagesByCategory } = await supabase
      .from('messages')
      .select('category, id')
      .eq('workspace_id', workspaceId)
      .gte('timestamp', today.toISOString());

    const categoryCounts: Record<string, number> = {};
    messagesByCategory?.forEach(msg => {
      const cat = msg.category || 'uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // 7. Active conversations (unique threads)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentThreads } = await supabase
      .from('messages')
      .select('provider_thread_id')
      .eq('workspace_id', workspaceId)
      .gte('timestamp', sevenDaysAgo.toISOString())
      .not('provider_thread_id', 'is', null);

    const uniqueThreads = new Set(recentThreads?.map(t => t.provider_thread_id) || []);

    // 8. Messages from russel.winfield@example.com specifically
    const { data: russelMessages } = await supabase
      .from('messages')
      .select('id, subject, timestamp, requires_human_review, handled_by_aiva, category, priority, reviewed_at')
      .eq('workspace_id', workspaceId)
      .ilike('sender_email', '%russel.winfield@example.com%')
      .order('timestamp', { ascending: false })
      .limit(20);

    // 9. What would appear in "What needs your attention" (simulate the filter)
    const { data: allReviewItems } = await supabase
      .from('messages')
      .select('id, subject, category, priority, actionability, reviewed_at, handled_by_aiva, sender_email')
      .eq('workspace_id', workspaceId)
      .eq('requires_human_review', true)
      .is('reviewed_at', null)
      .order('timestamp', { ascending: false })
      .limit(100);

    // Apply the same filters as getNeedsAttentionItems
    const filteredAttentionItems = (allReviewItems || []).filter((msg: any) => {
      // Exclude by category
      if (msg.category && excludedCategories.length > 0) {
        const categoryLower = msg.category.toLowerCase();
        if (excludedCategories.some(excluded => excluded.toLowerCase() === categoryLower)) {
          return false;
        }
      }

      // Exclude promotional (unless actionable)
      const promotionalCategories = ['marketing', 'junk_email', 'newsletter'];
      if (msg.category && promotionalCategories.includes(msg.category.toLowerCase())) {
        const isActionable = msg.actionability && ['request', 'question', 'scheduling_intent'].includes(msg.actionability);
        if (!isActionable) return false;
      }

      // Exclude noise priority (unless actionable)
      if (msg.priority === 'noise') {
        const isActionable = msg.actionability && ['request', 'question', 'scheduling_intent'].includes(msg.actionability);
        if (!isActionable) return false;
      }

      // Exclude reviewed but not handled (unless scheduling)
      if (msg.reviewed_at && !msg.handled_by_aiva && msg.actionability !== 'scheduling_intent') {
        return false;
      }

      return true;
    });

    // 10. Duplicate messages check (same subject + sender + timestamp within 1 minute)
    const { data: allMessages } = await supabase
      .from('messages')
      .select('id, subject, sender_email, timestamp')
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(1000);

    const duplicates: any[] = [];
    const seen = new Map<string, string[]>();
    allMessages?.forEach(msg => {
      const key = `${msg.subject || ''}|${msg.sender_email || ''}|${new Date(msg.timestamp).getTime()}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(msg.id);
    });

    seen.forEach((ids, key) => {
      if (ids.length > 1) {
        duplicates.push({ key, count: ids.length, messageIds: ids });
      }
    });

    return NextResponse.json({
      workspaceId,
      isZeroInboxEnabled,
      excludedCategories,
      counts: {
        totalMessagesToday: totalMessagesToday || 0,
        unreadMessages: unreadMessages || 0,
        requiresReview: requiresReview || 0,
        handledMessages: handledMessages || 0,
        activeConversations: uniqueThreads.size,
        attentionItemsFiltered: filteredAttentionItems.length,
        attentionItemsRaw: allReviewItems?.length || 0,
      },
      breakdown: {
        byCategory: categoryCounts,
        testMessages: {
          total: testMessages?.length || 0,
          messages: testMessages || [],
        },
        russelMessages: {
          total: russelMessages?.length || 0,
          messages: russelMessages || [],
        },
        duplicates: {
          total: duplicates.length,
          groups: duplicates.slice(0, 10), // Show first 10 duplicate groups
        },
      },
      explanation: {
        newMessagesCount: isZeroInboxEnabled 
          ? `With Zero Inbox enabled, "new messages" should equal attention items: ${filteredAttentionItems.length}`
          : `With Zero Inbox disabled, "new messages" = unread messages: ${unreadMessages || 0}`,
        attentionItemsCount: filteredAttentionItems.length,
        discrepancy: isZeroInboxEnabled
          ? (totalMessagesToday || 0) - filteredAttentionItems.length
          : (unreadMessages || 0) - filteredAttentionItems.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Message Counts Debug] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

