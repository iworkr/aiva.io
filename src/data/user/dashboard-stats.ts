/**
 * Dashboard Stats Server Actions
 * Data queries for the Inbox Zero dashboard
 */

'use server';

import { isWorkspaceMember } from '@/data/user/workspaces';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';

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

  // Check if Zero Inbox is enabled
  const { data: workspaceSettings } = await supabase
    .from('workspace_settings')
    .select('inbox_zero_enabled')
    .eq('workspace_id', workspaceId)
    .single();
  
  const isZeroInboxEnabled = workspaceSettings?.inbox_zero_enabled ?? true;

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

  // Review queue count (always includes messages requiring review, regardless of Zero Inbox)
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
  // When Zero Inbox is enabled, only count threads with unhandled messages
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  let threadsQuery = supabase
    .from('messages')
    .select('provider_thread_id')
    .eq('workspace_id', workspaceId)
    .gte('timestamp', sevenDaysAgo.toISOString())
    .not('provider_thread_id', 'is', null);
  
  // If Zero Inbox is enabled, only count threads with unhandled messages
  if (isZeroInboxEnabled) {
    threadsQuery = threadsQuery.eq('handled_by_aiva', false);
  }
  
  const { data: threads } = await threadsQuery;
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

  // Get excluded categories from workspace settings
  // Messages in excluded categories should NOT appear in "What needs your attention"
  const { data: workspaceSettings } = await supabase
    .from('workspace_settings')
    .select('auto_send_excluded_categories')
    .eq('workspace_id', workspaceId)
    .single();

  const excludedCategories = (workspaceSettings?.auto_send_excluded_categories as string[]) || [];
  console.log(`[Dashboard] Excluded categories from settings:`, excludedCategories);

  // Get messages that require human review
  // These are messages where AI is uncertain or needs human verification
  // IMPORTANT: Include ALL messages requiring human review, regardless of handled status
  // The only filter is that they haven't been reviewed yet (reviewed_at IS NULL)
  // This ensures users see all messages that need their attention, even if they were auto-handled
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
    .eq('requires_human_review', true)
    .is('reviewed_at', null)
    // REMOVED: .or('handled_by_aiva.eq.false,handle_action.eq.auto_replied')
    // All messages requiring human review should appear, regardless of handled status
    // The only requirement is that they haven't been reviewed yet (reviewed_at IS NULL)
    .order('timestamp', { ascending: false })
    .limit(limit * 2); // Get more to filter after

  if (reviewItemsError) {
    console.error('[Dashboard] Error fetching review items:', reviewItemsError);
  } else {
    console.log(`[Dashboard] Found ${reviewItems?.length || 0} messages requiring review`);
  }

  // Also get actionable messages (request, question, scheduling_intent) that are unhandled
  // These should appear in "What needs your attention" if:
  // 1. They're not in excluded categories
  // 2. They're unhandled
  // 3. They don't have an auto-sendable draft (or the draft is held for review)
  // The idea is: if the AI can respond automatically, it will (via auto-send), so we only show
  // messages that need human intervention/attention
  const { data: actionableItems, error: actionableItemsError } = await supabase
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
      has_draft_reply,
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
    .eq('requires_human_review', false) // Only include if they don't require review (review items are handled above)
    .or('handled_by_aiva.is.null,handled_by_aiva.eq.false') // Only unhandled messages
    .order('timestamp', { ascending: false })
    .limit(limit * 3); // Get more to filter after (we'll filter out those with auto-sendable drafts)

  if (actionableItemsError) {
    console.error('[Dashboard] Error fetching actionable items:', actionableItemsError);
  } else {
    console.log(`[Dashboard] Found ${actionableItems?.length || 0} actionable messages`);
  }

  // Helper function to check if a message should be excluded
  const shouldExcludeMessage = (msg: { 
    category?: string | null; 
    priority?: string | null;
    timestamp?: string;
    reviewed_at?: string | null;
    handled_by_aiva?: boolean | null;
    actionability?: string | null;
    subject?: string | null;
    sender_email?: string | null;
  }): boolean => {
    // 1. Check excluded categories (user-configured)
    // If user explicitly excluded a category, respect that
    if (msg.category && excludedCategories.length > 0) {
      const categoryLower = msg.category.toLowerCase();
      if (excludedCategories.some(excluded => excluded.toLowerCase() === categoryLower)) {
        return true;
      }
    }
    
    // 2. Exclude truly non-actionable categories (promotional/junk)
    // BUT: If a message is actionable (request/question/scheduling_intent), it might need attention
    // even if in these categories (e.g., "Action needed on your Facebook account" in notification category)
    const promotionalCategories = ['marketing', 'junk_email', 'newsletter'];
    if (msg.category && promotionalCategories.includes(msg.category.toLowerCase())) {
      // Only exclude if it's NOT actionable - if it's actionable, it might need human attention
      const isActionable = msg.actionability && ['request', 'question', 'scheduling_intent'].includes(msg.actionability);
      if (!isActionable) {
        return true;
      }
    }
    
    // 3. Exclude messages with 'noise' priority (these are typically marketing/junk)
    // BUT: If actionable, still show it (might be misclassified)
    if (msg.priority === 'noise') {
      const isActionable = msg.actionability && ['request', 'question', 'scheduling_intent'].includes(msg.actionability);
      if (!isActionable) {
        return true;
      }
    }
    
    // 4. Exclude messages that have been reviewed but not handled
    // BUT: Don't exclude if they have scheduling_intent (scheduling items need attention even if reviewed)
    // BUT: Don't exclude if they have a held draft (held drafts need human review regardless of reviewed status)
    // These are likely stale or already processed, unless they're scheduling-related or have held drafts
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
    
    // NOTE: Security alerts like "Verify phone number" or "Action needed on Facebook"
    // are in security_alert category and are actionable, so they will show
    
    // NOTE: We DON'T exclude 'notification' or 'social' categories by default
    // because they might contain actionable items (e.g., "Action needed on your Facebook account")
    // The user's excluded categories list will handle filtering these if desired
    
    return false;
  };

  // Helper function to add a message to items
  const addMessageToItems = (msg: any, type: 'review' | 'unhandled' = 'review') => {
    // Skip messages in excluded categories - they should be auto-handled and not shown
    if (shouldExcludeMessage(msg)) {
      console.log(`[Dashboard] Skipping message ${msg.id} - category "${msg.category}" is in excluded categories (should be auto-handled)`);
      return;
    }
    
    // Draft information will be enriched by the held drafts query below
    // This ensures messages appear even if RLS blocks the joined drafts
    const drafts = (msg.message_drafts as any[]) || [];
    const heldDraft = drafts.find((d: any) => d.hold_for_review === true);
    const draft = heldDraft || drafts[0];
    const reviewContext = msg.review_context as any;
    
    // Check if this message was auto-replied (so we can show it differently)
    const wasAutoReplied = msg.handled_by_aiva && msg.handle_action === 'auto_replied';
    const autoSentDraft = wasAutoReplied ? drafts.find((d: any) => d.auto_sent === true) : null;
    
    items.push({
      id: msg.id,
      type: type === 'review' ? 'review' : 'unhandled',
      messageId: msg.id,
      draftId: draft?.id || autoSentDraft?.id,
      subject: msg.subject || '(no subject)',
      senderEmail: msg.sender_email,
      senderName: msg.sender_name || undefined,
      snippet: msg.snippet || undefined,
      timestamp: msg.timestamp,
      priority: msg.priority || undefined,
      category: msg.category || undefined,
      reviewReason: wasAutoReplied 
        ? (msg.review_reason?.startsWith('auto_replied_acknowledgement') 
           ? msg.review_reason 
           : 'auto_replied_needs_review')
        : (draft?.review_reason || msg.review_reason || (type === 'unhandled' ? 'actionable' : 'needs_review')),
      provider: (msg.channel_connection as any)?.provider,
      // Draft information (may be empty if RLS blocks drafts, will be enriched below)
      // For auto-replied messages, show the auto-sent draft
      draftBody: wasAutoReplied ? (autoSentDraft?.body || draft?.body) : draft?.body,
      confidenceScore: draft?.confidence_score || reviewContext?.confidenceScore,
      calendarContext: draft?.calendar_context || reviewContext?.calendarContext,
      aiUncertaintyNotes: draft?.ai_uncertainty_notes || reviewContext?.aiUncertaintyNotes,
      hasDraft: !!draft || !!msg.has_draft_reply,
    });
  };

  // Process messages that require human review
  for (const msg of reviewItems || []) {
    addMessageToItems(msg, 'review');
  }

  // Check which actionable messages are already in the auto-send queue
  // If they're queued for auto-send, we don't need to show them (they'll be handled automatically)
  const actionableMessageIds = (actionableItems || []).map((m: any) => m.id);
  let queuedMessageIds = new Set<string>();
  if (actionableMessageIds.length > 0) {
    const { data: queueItems } = await supabase
      .from('auto_send_queue')
      .select('message_id, status')
      .eq('workspace_id', workspaceId)
      .in('message_id', actionableMessageIds)
      .eq('status', 'pending'); // Only check pending items (processing/sent/failed are handled)
    
    queuedMessageIds = new Set((queueItems || []).map((q: any) => q.message_id));
    console.log(`[Dashboard] Found ${queuedMessageIds.size} actionable messages already in auto-send queue`);
  }

  // Process actionable messages (request, question, scheduling_intent)
  // These should appear in "What needs your attention" if:
  // 1. They're not in excluded categories or non-actionable categories
  // 2. They don't have an auto-sendable draft (or the draft is held for review)
  // 3. They're not already queued for auto-send
  // 4. They're not stale (>7 days old unless high priority)
  // If a message has a draft that can be auto-sent, it will be handled by auto-send cron,
  // so we don't need to show it here unless the draft is held for review
  for (const msg of actionableItems || []) {
    // Get draft information first - held drafts should always show regardless of exclusion rules
    const drafts = (msg.message_drafts as any[]) || [];
    const heldDraft = drafts.find((d: any) => d.hold_for_review === true);
    const autoSentDraft = drafts.find((d: any) => d.auto_sent === true);
    const hasAutoSendableDraft = drafts.some((d: any) => 
      !d.hold_for_review && 
      !d.auto_sent && 
      d.body // Has a draft body
    );
    
    // If message has a held draft, always show it (needs human review regardless of other filters)
    if (heldDraft) {
      addMessageToItems(msg, 'unhandled');
      continue;
    }
    
    // Skip if already queued for auto-send
    if (queuedMessageIds.has(msg.id)) {
      console.log(`[Dashboard] Skipping actionable message ${msg.id} - already in auto-send queue`);
      continue;
    }
    
    // Now check if message should be excluded (categories, priority, age, etc.)
    // But only if it doesn't have a held draft (which we already handled above)
    if (shouldExcludeMessage(msg)) {
      console.log(`[Dashboard] Skipping actionable message ${msg.id} - excluded by filter (category: ${msg.category}, priority: ${msg.priority}, age: ${msg.timestamp ? Math.round((Date.now() - new Date(msg.timestamp).getTime()) / (24 * 60 * 60 * 1000)) + ' days' : 'unknown'})`);
      continue;
    }
    
    // Show the message if:
    // - It has no draft at all (AI hasn't generated a response yet - needs human attention) - always show
    // Don't show if it has an auto-sendable draft (will be handled by auto-send cron)
    // Don't show if it was already auto-replied (already handled, no need for review)
    if (!hasAutoSendableDraft) {
      // No auto-sendable draft - needs human attention
      addMessageToItems(msg, 'unhandled');
    } else if (autoSentDraft) {
      // Was already auto-replied - don't show (already handled, regardless of age)
      console.log(`[Dashboard] Skipping actionable message ${msg.id} - was already auto-replied (handled)`);
    } else {
      // Has auto-sendable draft - will be handled by auto-send cron
      console.log(`[Dashboard] Skipping actionable message ${msg.id} - has auto-sendable draft (will be handled by auto-send cron)`);
    }
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
    
    // Skip messages in excluded categories - they shouldn't appear in "What needs your attention"
    if (msg.category && excludedCategories.length > 0) {
      const categoryLower = msg.category.toLowerCase();
      if (excludedCategories.some(excluded => excluded.toLowerCase() === categoryLower)) {
        console.log(`[Dashboard] Skipping held draft message ${msg.id} - category "${msg.category}" is in excluded categories`);
        continue;
      }
    }
    
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

  // Sort by priority: review reason > priority > timestamp
  // Review reasons that need urgent attention: calendar_mismatch, sensitive_topic
  // Then by message priority: urgent > high > medium > low
  // Finally by timestamp: most recent first
  items.sort((a, b) => {
    // 1. Prioritize urgent review reasons
    const urgentReasons = ['calendar_mismatch', 'sensitive_topic'];
    const aIsUrgent = a.reviewReason && urgentReasons.includes(a.reviewReason);
    const bIsUrgent = b.reviewReason && urgentReasons.includes(b.reviewReason);
    if (aIsUrgent && !bIsUrgent) return -1;
    if (!aIsUrgent && bIsUrgent) return 1;
    
    // 2. Then by message priority
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority || 'low'] ?? 3;
    const bPriority = priorityOrder[b.priority || 'low'] ?? 3;
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // 3. Finally by timestamp (most recent first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const finalItems = items.slice(0, limit);
  
  // Extensive logging for debugging
  console.log(`[Dashboard] getNeedsAttentionItems result:`, {
    workspaceId,
    userId,
    excludedCategories,
    totalItemsBeforeLimit: items.length,
    limit,
    finalItemsCount: finalItems.length,
    finalItems: finalItems.map(i => ({
      messageId: i.messageId,
      subject: i.subject,
      category: i.category,
      priority: i.priority,
      reviewReason: i.reviewReason,
      hasDraft: i.hasDraft,
      draftId: i.draftId,
      timestamp: i.timestamp,
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

