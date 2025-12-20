/**
 * Dashboard Stats Server Actions
 * Data queries for the Inbox Zero dashboard
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { isWorkspaceMember } from '@/data/user/workspaces';

export interface DashboardStats {
  messagesReceivedToday: number;
  messagesHandledToday: number;
  autoRepliesSentToday: number;
  reviewQueueCount: number;
  highPriorityUnhandled: number;
  timeSavedMinutes: number;
  inboxReductionPercent: number;
  activeConversations: number;
}

export interface AttentionItem {
  id: string;
  type: 'review' | 'high_priority' | 'scheduling' | 'unhandled';
  messageId: string;
  draftId?: string;
  subject: string;
  senderEmail: string;
  senderName?: string;
  snippet?: string;
  timestamp: string;
  priority?: string;
  category?: string;
  reviewReason?: string;
  provider?: string;
  // Draft information (when draft is held for review)
  draftBody?: string;
  confidenceScore?: number;
  calendarContext?: any;
  aiUncertaintyNotes?: string;
  hasDraft?: boolean;
}

export interface DailyBriefing {
  greeting: string;
  summary: string;
  keyContacts: Array<{
    email: string;
    name?: string;
    messageCount: number;
    latestSubject?: string;
  }>;
  importantTopics: string[];
  actionItems: string[];
  upcomingEvents: Array<{
    title: string;
    startTime: string;
    attendees?: string[];
  }>;
}

/**
 * Get dashboard stats for a workspace
 */
export async function getDashboardStats(
  workspaceId: string,
  userId: string
): Promise<DashboardStats> {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Messages received today
  const { count: messagesReceivedToday } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('timestamp', todayISO);

  // Messages handled today
  const { count: messagesHandledToday } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('handled_by_aiva', true)
    .gte('handled_at', todayISO);

  // Auto-replies sent today
  const { count: autoRepliesSentToday } = await supabase
    .from('auto_send_log')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('action', 'sent')
    .gte('created_at', todayISO);

  // Review queue count
  const { count: reviewQueueCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('requires_human_review', true)
    .is('reviewed_at', null);

  // High priority unhandled
  const { count: highPriorityUnhandled } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('handled_by_aiva', false)
    .in('priority', ['urgent', 'high'])
    .gte('timestamp', todayISO);

  // Active conversations (unique threads in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: threads } = await supabase
    .from('messages')
    .select('provider_thread_id')
    .eq('workspace_id', workspaceId)
    .gte('timestamp', sevenDaysAgo.toISOString())
    .not('provider_thread_id', 'is', null);

  const uniqueThreads = new Set(threads?.map(t => t.provider_thread_id) || []);

  // Calculate time saved (estimate: 2 min per handled message)
  const timeSavedMinutes = (messagesHandledToday || 0) * 2;

  // Calculate inbox reduction percent
  const total = messagesReceivedToday || 0;
  const handled = messagesHandledToday || 0;
  const inboxReductionPercent = total > 0 ? Math.round((handled / total) * 100) : 0;

  return {
    messagesReceivedToday: messagesReceivedToday || 0,
    messagesHandledToday: messagesHandledToday || 0,
    autoRepliesSentToday: autoRepliesSentToday || 0,
    reviewQueueCount: reviewQueueCount || 0,
    highPriorityUnhandled: highPriorityUnhandled || 0,
    timeSavedMinutes,
    inboxReductionPercent,
    activeConversations: uniqueThreads.size,
  };
}

/**
 * Get items that need user attention
 */
export async function getNeedsAttentionItems(
  workspaceId: string,
  userId: string,
  limit: number = 10
): Promise<AttentionItem[]> {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();
  const items: AttentionItem[] = [];

  // Get messages that require human review
  // These are messages where AI is uncertain or needs human verification
  const { data: reviewItems, error: reviewItemsError } = await supabase
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
    .eq('handled_by_aiva', false) // Only show unhandled items
    .order('timestamp', { ascending: false })
    .limit(limit * 2); // Get more to filter after

  if (reviewItemsError) {
    console.error('[Dashboard] Error fetching review items:', reviewItemsError);
  } else {
    console.log(`[Dashboard] Found ${reviewItems?.length || 0} messages requiring review`);
  }

  for (const msg of reviewItems || []) {
    // Include all messages that require human review
    // Draft information will be enriched by the held drafts query below
    // This ensures messages appear even if RLS blocks the joined drafts
    const drafts = (msg.message_drafts as any[]) || [];
    const heldDraft = drafts.find((d: any) => d.hold_for_review === true);
    const draft = heldDraft || drafts[0];
    const reviewContext = msg.review_context as any;
    
    items.push({
      id: msg.id,
      type: 'review',
      messageId: msg.id,
      draftId: draft?.id,
      subject: msg.subject || '(no subject)',
      senderEmail: msg.sender_email,
      senderName: msg.sender_name || undefined,
      snippet: msg.snippet || undefined,
      timestamp: msg.timestamp,
      priority: msg.priority || undefined,
      category: msg.category || undefined,
      reviewReason: draft?.review_reason || msg.review_reason || 'needs_review',
      provider: (msg.channel_connection as any)?.provider,
      // Draft information (may be empty if RLS blocks drafts, will be enriched below)
      draftBody: draft?.body,
      confidenceScore: draft?.confidence_score || reviewContext?.confidenceScore,
      calendarContext: draft?.calendar_context || reviewContext?.calendarContext,
      aiUncertaintyNotes: draft?.ai_uncertainty_notes || reviewContext?.aiUncertaintyNotes,
      hasDraft: !!draft || !!msg.has_draft_reply,
    });
  }

  // Also get messages with held drafts that might not have requires_human_review set yet
  // (for backward compatibility with older drafts or if message update failed)
  // Query drafts first, then get their messages - more reliable than filtering on joined columns
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
    .limit(limit * 2);

  if (heldDraftsError) {
    console.error('[Dashboard] Error fetching held drafts:', heldDraftsError);
  }

  const addedMessageIds = new Set(items.map(i => i.messageId));
  for (const draft of heldDrafts || []) {
    const msg = (draft.message as any);
    if (!msg) continue;
    
    // Skip if message is reviewed/handled
    if (msg.reviewed_at) continue;
    if (msg.handled_by_aiva) continue;
    if (msg.workspace_id !== workspaceId) continue; // Safety check
    
    // If message was already added from first query, enrich it with draft info
    if (addedMessageIds.has(msg.id)) {
      const existingItem = items.find(i => i.messageId === msg.id);
      if (existingItem && !existingItem.draftBody) {
        // Enrich with draft information if not already present
        existingItem.draftId = draft.id;
        existingItem.draftBody = draft.body;
        existingItem.confidenceScore = draft.confidence_score ?? existingItem.confidenceScore;
        existingItem.calendarContext = draft.calendar_context ?? existingItem.calendarContext;
        existingItem.aiUncertaintyNotes = draft.ai_uncertainty_notes ?? existingItem.aiUncertaintyNotes;
        existingItem.reviewReason = draft.review_reason || existingItem.reviewReason;
        existingItem.hasDraft = true;
      }
      continue;
    }
    
    // Otherwise, add as new item
    items.push({
      id: draft.id,
      type: 'review',
      messageId: msg.id,
      draftId: draft.id,
      subject: msg.subject || '(no subject)',
      senderEmail: msg.sender_email,
      senderName: msg.sender_name || undefined,
      snippet: msg.snippet || undefined,
      timestamp: msg.timestamp,
      priority: msg.priority || undefined,
      category: msg.category || undefined,
      reviewReason: draft.review_reason || 'draft_held_for_review',
      provider: (msg.channel_connection as any)?.provider,
      // Draft information
      draftBody: draft.body,
      confidenceScore: draft.confidence_score ?? undefined,
      calendarContext: draft.calendar_context ?? undefined,
      aiUncertaintyNotes: draft.ai_uncertainty_notes ?? undefined,
      hasDraft: true,
    });
  }

  // Sort by timestamp descending
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const finalItems = items.slice(0, limit);
  
  // Extensive logging for debugging
  console.log(`[Dashboard] getNeedsAttentionItems result:`, {
    workspaceId,
    userId,
    totalItemsBeforeLimit: items.length,
    limit,
    finalItemsCount: finalItems.length,
    finalItems: finalItems.map(i => ({
      messageId: i.messageId,
      subject: i.subject,
      hasDraft: i.hasDraft,
      draftId: i.draftId,
      timestamp: i.timestamp,
      reviewReason: i.reviewReason,
    })),
  });
  
  // Check specifically for the Thursday email
  const thursdayEmail = finalItems.find(i => 
    i.messageId === '367735ec-3639-4d13-b867-48e701d7da58' ||
    i.subject?.includes('Thursday')
  );
  if (thursdayEmail) {
    console.log(`[Dashboard] ✅ Thursday email found in final items:`, {
      messageId: thursdayEmail.messageId,
      subject: thursdayEmail.subject,
      hasDraft: thursdayEmail.hasDraft,
      draftId: thursdayEmail.draftId,
    });
  } else {
    console.log(`[Dashboard] ❌ Thursday email NOT in final items`);
    const allMessageIds = finalItems.map(i => i.messageId);
    console.log(`[Dashboard] Final message IDs:`, allMessageIds);
    
    // Check if it was in items before limit
    const thursdayInAll = items.find(i => 
      i.messageId === '367735ec-3639-4d13-b867-48e701d7da58' ||
      i.subject?.includes('Thursday')
    );
    if (thursdayInAll) {
      console.log(`[Dashboard] ⚠️ Thursday email was in items but got filtered out by limit`);
      console.log(`[Dashboard] Thursday email index:`, items.findIndex(i => i.messageId === '367735ec-3639-4d13-b867-48e701d7da58'));
    }
  }

  return finalItems;
}

/**
 * Get daily briefing content
 */
export async function getDailyBriefing(
  workspaceId: string,
  userId: string
): Promise<DailyBriefing> {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();
  
  // Get user profile for greeting
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  
  // Determine greeting based on time
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17) timeGreeting = 'Good evening';

  const greeting = `${timeGreeting}, ${firstName}!`;

  // Get stats for summary
  const stats = await getDashboardStats(workspaceId, userId);

  let summary = '';
  if (stats.messagesHandledToday > 0) {
    summary = `Aiva handled ${stats.messagesHandledToday} messages today`;
    if (stats.autoRepliesSentToday > 0) {
      summary += `, including ${stats.autoRepliesSentToday} auto-replies`;
    }
    summary += '.';
  } else if (stats.messagesReceivedToday > 0) {
    summary = `${stats.messagesReceivedToday} new messages today.`;
  } else {
    summary = 'No new messages today.';
  }

  if (stats.reviewQueueCount > 0) {
    summary += ` ${stats.reviewQueueCount} item${stats.reviewQueueCount > 1 ? 's' : ''} need${stats.reviewQueueCount === 1 ? 's' : ''} your attention.`;
  }

  // Get key contacts (most active senders in last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('sender_email, sender_name, subject')
    .eq('workspace_id', workspaceId)
    .gte('timestamp', yesterday.toISOString())
    .order('timestamp', { ascending: false });

  const contactMap = new Map<string, { name?: string; count: number; latestSubject?: string }>();
  for (const msg of recentMessages || []) {
    const existing = contactMap.get(msg.sender_email);
    if (existing) {
      existing.count++;
    } else {
      contactMap.set(msg.sender_email, {
        name: msg.sender_name || undefined,
        count: 1,
        latestSubject: msg.subject || undefined,
      });
    }
  }

  const keyContacts = Array.from(contactMap.entries())
    .map(([email, data]) => ({
      email,
      name: data.name,
      messageCount: data.count,
      latestSubject: data.latestSubject,
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);

  // Get important topics from categories
  const { data: categorizedMessages } = await supabase
    .from('messages')
    .select('category')
    .eq('workspace_id', workspaceId)
    .gte('timestamp', yesterday.toISOString())
    .in('priority', ['urgent', 'high']);

  const categorySet = new Set<string>();
  for (const msg of categorizedMessages || []) {
    if (msg.category) categorySet.add(msg.category);
  }
  const importantTopics = Array.from(categorySet).slice(0, 5);

  // Get upcoming events (if calendar is connected)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data: events } = await supabase
    .from('events')
    .select('title, start_time, attendees')
    .eq('workspace_id', workspaceId)
    .gte('start_time', new Date().toISOString())
    .lte('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: true })
    .limit(5);

  const upcomingEvents = (events || []).map(e => ({
    title: e.title,
    startTime: e.start_time,
    attendees: (e.attendees as any[])?.map(a => a.email || a.name),
  }));

  return {
    greeting,
    summary,
    keyContacts,
    importantTopics,
    actionItems: [], // Could be enhanced with task extraction
    upcomingEvents,
  };
}

/**
 * Get all-time stats for a workspace
 */
export async function getAllTimeStats(
  workspaceId: string,
  userId: string
): Promise<{
  totalMessagesHandled: number;
  totalAutoReplies: number;
  totalTimeSavedHours: number;
}> {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { count: totalMessagesHandled } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('handled_by_aiva', true);

  const { count: totalAutoReplies } = await supabase
    .from('auto_send_log')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('action', 'sent');

  // Estimate 2 minutes saved per handled message
  const totalTimeSavedHours = Math.round(((totalMessagesHandled || 0) * 2) / 60);

  return {
    totalMessagesHandled: totalMessagesHandled || 0,
    totalAutoReplies: totalAutoReplies || 0,
    totalTimeSavedHours,
  };
}

