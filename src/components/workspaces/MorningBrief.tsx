/**
 * Morning Brief Component
 * Displays a personalized morning briefing with crucial messages and action items
 * Similar to Kinso.AI's morning brief feature
 */

import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { BriefingSection } from './BriefingSection';
import { AivaChatInput } from './AivaChatInput';
import { TodaysBriefingButton } from './TodaysBriefingButton';
import { BriefingStats } from './BriefingStats';
import { getNeedsAttentionItems, type AttentionItem } from '@/data/user/dashboard-stats';
import { Button } from '@/components/ui/button';
import { Plus, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';

function getGreeting(timezone?: string) {
  // Use Intl to get the hour in the user's timezone, with UTC fallback
  const now = new Date();
  let hour: number;
  
  try {
    if (timezone) {
      // Format to get 24-hour time in the user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone,
      });
      hour = parseInt(formatter.format(now), 10);
    } else {
      // Fallback to server time
      hour = now.getHours();
    }
  } catch (error) {
    // If timezone is invalid, fall back to server time
    hour = now.getHours();
  }
  
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getUserDisplayName(user: any): string {
  // Try user_metadata first
  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name.split(' ')[0]; // First name only
  }
  
  // Try email
  if (user?.email) {
    return user.email.split('@')[0];
  }
  
  return 'there';
}

interface BriefingItem {
  id: string;
  type: 'message' | 'task' | 'event';
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  timestamp?: Date;
  href: string;
  metadata?: string;
  messageId?: string; // For messages, store the messageId for dismissal
}

export async function MorningBrief() {
  const { data: { user } } = await getUser();
  
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseUserServerComponentClient();
  
  // Get user's workspace
  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_member_id', user.id)
    .limit(1)
    .single();
  
  if (!workspaceMembers) {
    return null;
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceMembers.workspace_id)
    .single();

  if (!workspace) {
    return null;
  }

  const workspaceId = workspace.id;
  const userId = user.id;

  // CRITICAL: Check if there are any active channel connections
  // If no channels are connected, don't show messages/stats
  const { data: activeConnections } = await supabase
    .from('channel_connections')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .limit(1);
  
  const hasActiveChannels = activeConnections && activeConnections.length > 0;

  // Get workspace settings for timezone, Zero Inbox, and excluded categories
  const { data: workspaceSettings } = await supabase
    .from('workspace_settings')
    .select('workspace_settings, inbox_zero_enabled, auto_send_excluded_categories')
    .eq('workspace_id', workspaceId)
    .single();

  // Extract timezone from settings (stored in JSON)
  const userTimezone = (workspaceSettings?.workspace_settings as any)?.timezone || undefined;
  
  // Check if Zero Inbox is enabled (default to true if not set)
  const isZeroInboxEnabled = workspaceSettings?.inbox_zero_enabled ?? true;
  
  // Get excluded categories - messages in these categories should be auto-handled and not counted
  const excludedCategories = (workspaceSettings?.auto_send_excluded_categories as string[]) || [];

  // Get user profile for display name
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  const displayName = userProfile?.full_name 
    ? userProfile.full_name.split(' ')[0]
    : getUserDisplayName(user);

  // Build base query for unread messages
  // We need to fetch messages with category to filter by excluded categories
  let unreadQuery = supabase
    .from('messages')
    .select('id, category, handled_by_aiva')
    .eq('workspace_id', workspaceId)
    .eq('is_read', false);
  
  // If Zero Inbox is enabled, exclude handled messages
  // Handle both false and NULL (NULL means unhandled, treat as false)
  if (isZeroInboxEnabled) {
    unreadQuery = unreadQuery.or('handled_by_aiva.is.null,handled_by_aiva.eq.false');
  }

  // Build query for active conversations
  // Active conversations = unique threads that have at least one unhandled message
  let activeConversationsQuery;
  if (isZeroInboxEnabled) {
    // Get unique threads with at least one unhandled message (need category to filter)
    // Handle both false and NULL (NULL means unhandled, treat as false)
    activeConversationsQuery = supabase
      .from('messages')
      .select('provider_thread_id, category, handled_by_aiva')
      .eq('workspace_id', workspaceId)
      .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
      .not('provider_thread_id', 'is', null);
  } else {
    // Count all messages (legacy behavior when Zero Inbox is disabled)
    activeConversationsQuery = supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
  }

  // Fetch crucial data - Use getNeedsAttentionItems for messages requiring human review
  // If no active channels, skip message queries and return empty results
  const [
    attentionItems,
    { data: unreadMessages },
    activeConversationsResult,
    { data: upcomingEvents },
    { count: todayEventsCount },
  ] = await Promise.all([
    // Messages that need human attention (requires_human_review = true or actionable)
    // If no channels, this will return empty array
    getNeedsAttentionItems(workspaceId, userId, 20),
    
    // Unread messages (need to filter by excluded categories in code)
    // If no channels, return empty result
    hasActiveChannels ? unreadQuery : Promise.resolve({ data: [] }),
    
    // Active conversations (need to filter by excluded categories in code)
    // If no channels, return empty result
    hasActiveChannels ? activeConversationsQuery : Promise.resolve({ data: [], count: 0 }),
    
    // Upcoming events (today and tomorrow)
    supabase
      .from('events')
      .select('id, title, description, start_time, end_time, location')
      .eq('workspace_id', workspaceId)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
    
    // Today's events count
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
  ]);

  // Calculate new vs active conversations
  // With Zero Inbox enabled, these should match the actionable items count
  // Use attentionItems which already has all the filtering logic applied
  // CRITICAL: If no active channels, always return 0
  let newMessages = 0;
  let activeConversations = 0;
  
  if (!hasActiveChannels) {
    // No channels = no messages = zero counts
    newMessages = 0;
    activeConversations = 0;
  } else if (isZeroInboxEnabled) {
    // With Zero Inbox: count only actionable items that need attention
    // This matches what's shown in "What needs your attention"
    newMessages = attentionItems.length;
    
    // Count unique threads from actionable items
    // We need to fetch thread IDs for the attention items
    if (attentionItems.length > 0) {
      const messageIds = attentionItems.map(item => item.messageId);
      const { data: messagesWithThreads } = await supabase
        .from('messages')
        .select('provider_thread_id')
        .eq('workspace_id', workspaceId)
        .in('id', messageIds)
        .not('provider_thread_id', 'is', null);
      
      const uniqueThreads = new Set(
        (messagesWithThreads || [])
          .map((msg: any) => msg.provider_thread_id)
          .filter(Boolean)
      );
      activeConversations = uniqueThreads.size;
    }
  } else {
    // Legacy behavior: count all unread/unhandled messages
    if (unreadMessages && Array.isArray(unreadMessages)) {
      // Filter out messages in excluded categories
      const filteredUnread = unreadMessages.filter((msg: any) => {
        if (!msg.category || excludedCategories.length === 0) return true;
        const categoryLower = msg.category.toLowerCase();
        return !excludedCategories.some(excluded => excluded.toLowerCase() === categoryLower);
      });
      newMessages = filteredUnread.length;
    }
    
    // Count all messages (legacy behavior)
    if (activeConversationsResult && 'count' in activeConversationsResult) {
      activeConversations = (activeConversationsResult as { count: number | null }).count || 0;
    }
  }

  // Build briefing items from attention items (messages requiring human review)
  const briefingItems: BriefingItem[] = [];
  const seenIds = new Set<string>(); // Track unique IDs to prevent duplicates

  // Utility: detect and mask sensitive content (OTPs, passwords, etc.)
  const maskSensitiveContent = (text: string): string => {
    // Patterns for sensitive content
    const sensitivePatterns = [
      /\b(OTP|code|verification|pin)[\s:]*\d{4,8}\b/gi,
      /\b(password|pwd|pass)[\s:]*\S+\b/gi,
      /\b\d{4,8}\s*(is your|is the|code)\b/gi,
    ];
    
    let maskedText = text;
    for (const pattern of sensitivePatterns) {
      maskedText = maskedText.replace(pattern, '••••••');
    }
    return maskedText;
  };

  // Convert AttentionItem[] to BriefingItem[]
  if (attentionItems && attentionItems.length > 0) {
    attentionItems.forEach((item: AttentionItem) => {
      // Skip if we've already seen this message ID
      const uniqueKey = `message-${item.messageId}`;
      if (seenIds.has(uniqueKey)) return;
      seenIds.add(uniqueKey);
      
      // Determine priority based on review reason and confidence
      let priority: 'urgent' | 'high' | 'medium' | 'low' = 'high';
      if (item.reviewReason === 'calendar_mismatch' || item.reviewReason === 'sensitive_topic') {
        priority = 'urgent';
      } else if (item.confidenceScore !== undefined && item.confidenceScore < 0.6) {
        priority = 'urgent';
      } else if (item.priority === 'urgent' || item.priority === 'high') {
        priority = item.priority as 'urgent' | 'high';
      }
      
      briefingItems.push({
        id: item.messageId,
        type: 'message',
        title: maskSensitiveContent(item.subject || 'No subject'),
        description: item.snippet || item.draftBody?.substring(0, 140) || '',
        priority,
        timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
        href: `/inbox?message=${item.messageId}${item.draftId ? `&draft=${item.draftId}` : ''}`,
        metadata: item.provider || 'Email',
        messageId: item.messageId, // Store messageId for dismissal
      });
    });
  }

  // Add upcoming events (with deduplication)
  if (upcomingEvents) {
    upcomingEvents.forEach((event: any) => {
      // Skip if we've already seen this event ID
      const uniqueKey = `event-${event.id}`;
      if (seenIds.has(uniqueKey)) return;
      seenIds.add(uniqueKey);
      
      const startTime = new Date(event.start_time);
      const isToday = startTime.toDateString() === new Date().toDateString();
      
      briefingItems.push({
        id: event.id,
        type: 'event',
        title: event.title,
        description: event.description || event.location || '',
        priority: isToday ? 'high' : 'medium',
        timestamp: startTime,
        href: '/calendar',
        metadata: isToday ? 'Today' : `In ${formatDistanceToNow(startTime, { addSuffix: true })}`,
      });
    });
  }

  // Sort by priority: urgent > high > medium > low, then by timestamp
  briefingItems.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    if (a.timestamp && b.timestamp) {
      return a.timestamp.getTime() - b.timestamp.getTime();
    }
    return 0;
  });

  // Final deduplication: remove items with identical titles (edge case for duplicates)
  const seenTitles = new Set<string>();
  const deduplicatedItems = briefingItems.filter((item) => {
    const normalizedTitle = item.title.toLowerCase().trim();
    if (seenTitles.has(normalizedTitle)) {
      return false;
    }
    seenTitles.add(normalizedTitle);
    return true;
  });

  // FIX: With Zero Inbox, newMessages should match the DEDUPLICATED count shown to user
  // The earlier calculation used raw attentionItems.length, but we need the final count
  // after deduplication to match what's displayed in "What needs your attention"
  if (isZeroInboxEnabled) {
    // Count only message items (not events) in the deduplicated list
    const messageItemsCount = deduplicatedItems.filter(item => item.type === 'message').length;
    newMessages = messageItemsCount;
    
    // Recalculate active conversations based on deduplicated message items
    const deduplicatedMessageIds = deduplicatedItems
      .filter(item => item.type === 'message' && item.messageId)
      .map(item => item.messageId!)
      .filter((id): id is string => id !== undefined);
    
    if (deduplicatedMessageIds.length > 0) {
      const { data: messagesWithThreads } = await supabase
        .from('messages')
        .select('provider_thread_id')
        .eq('workspace_id', workspaceId)
        .in('id', deduplicatedMessageIds)
        .not('provider_thread_id', 'is', null);
      
      const uniqueThreads = new Set(
        (messagesWithThreads || [])
          .map((msg: any) => msg.provider_thread_id)
          .filter(Boolean)
      );
      activeConversations = uniqueThreads.size || deduplicatedMessageIds.length;
    } else {
      activeConversations = 0;
    }
  }

  return (
    <div className="space-y-5">
      {/* Greeting and Summary */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">
          {getGreeting(userTimezone)}, {displayName}!
        </h1>
        <BriefingStats
          initialNewMessages={newMessages}
          initialActiveConversations={activeConversations}
          todayEventsCount={todayEventsCount || 0}
          upcomingEventsCount={upcomingEvents?.length || 0}
          itemCount={deduplicatedItems.length}
        />
      </div>

      {/* No Channels CTA - Show when no active channels are connected */}
      {!hasActiveChannels && (
        <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Connect Your First Channel</h3>
            <p className="text-center text-muted-foreground mb-6 max-w-md">
              Get started by connecting your email or messaging accounts. We'll sync your messages and help you manage them with AI.
            </p>
            <Button size="lg" asChild className="gap-2">
              <Link href="/channels">
                <Plus className="h-5 w-5" />
                Connect Channel
              </Link>
            </Button>
            <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <span>Gmail</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <span>Outlook</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>Slack</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Briefing Button with AI typing animation */}
      {deduplicatedItems.length > 0 && (
        <TodaysBriefingButton 
          itemCount={deduplicatedItems.length}
          briefingData={{
            newMessages: newMessages,
            activeConversations: activeConversations,
            todayEventsCount: todayEventsCount || 0,
            upcomingEventsCount: upcomingEvents?.length || 0,
            urgentItemsCount: deduplicatedItems.filter(item => item.priority === 'urgent' || item.priority === 'high').length,
          }}
        />
      )}

      {/* Briefing Items - Always render to show debug info */}
      <div id="briefing">
        <BriefingSection 
          items={deduplicatedItems} 
          workspaceId={workspaceId}
          userId={userId}
        />
      </div>

      {/* AI Chat Input */}
      <AivaChatInput />
    </div>
  );
}

