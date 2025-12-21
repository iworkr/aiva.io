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
import { getNeedsAttentionItems, type AttentionItem } from '@/data/user/dashboard-stats';

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
  const [
    attentionItems,
    { data: unreadMessages },
    activeConversationsResult,
    { data: upcomingEvents },
    { count: todayEventsCount },
  ] = await Promise.all([
    // Messages that need human attention (requires_human_review = true or actionable)
    getNeedsAttentionItems(workspaceId, userId, 20),
    
    // Unread messages (need to filter by excluded categories in code)
    unreadQuery,
    
    // Active conversations (need to filter by excluded categories in code)
    activeConversationsQuery,
    
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
  // Filter out messages in excluded categories - these should be auto-handled and not counted
  let newMessages = 0;
  if (unreadMessages && Array.isArray(unreadMessages)) {
    // Filter out messages in excluded categories
    const filteredUnread = unreadMessages.filter((msg: any) => {
      if (!msg.category || excludedCategories.length === 0) return true;
      const categoryLower = msg.category.toLowerCase();
      return !excludedCategories.some(excluded => excluded.toLowerCase() === categoryLower);
    });
    newMessages = filteredUnread.length;
  }
  
  // For active conversations, if Zero Inbox is enabled, count unique threads
  // Otherwise, use the count from the query
  let activeConversations = 0;
  if (isZeroInboxEnabled) {
    // Count unique thread IDs from unhandled messages, excluding excluded categories
    if (activeConversationsResult?.data && Array.isArray(activeConversationsResult.data)) {
      // Filter out messages in excluded categories
      const filteredThreads = activeConversationsResult.data.filter((msg: any) => {
        if (!msg.category || excludedCategories.length === 0) return true;
        const categoryLower = msg.category.toLowerCase();
        return !excludedCategories.some(excluded => excluded.toLowerCase() === categoryLower);
      });
      
      const uniqueThreads = new Set(
        filteredThreads
          .map((msg: any) => msg.provider_thread_id)
          .filter(Boolean)
      );
      activeConversations = uniqueThreads.size;
    }
  } else {
    // Legacy behavior: count all messages
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

  // Server-side debug logging
  console.log('[MorningBrief] Server-side render:', {
    workspaceId,
    userId,
    isZeroInboxEnabled,
    excludedCategories,
    newMessages,
    activeConversations,
    attentionItemsCount: attentionItems?.length || 0,
    briefingItemsCount: briefingItems.length,
    deduplicatedItemsCount: deduplicatedItems.length,
    unreadMessagesCount: unreadMessages?.length || 0,
    activeConversationsResultCount: isZeroInboxEnabled 
      ? (activeConversationsResult?.data?.length || 0)
      : (activeConversationsResult && 'count' in activeConversationsResult ? (activeConversationsResult as { count: number | null }).count : 0),
    hasThursdayEmail: deduplicatedItems.some(item => 
      item.title?.includes('Thursday') || item.id === '367735ec-3639-4d13-b867-48e701d7da58'
    ),
    items: deduplicatedItems.map(item => ({
      id: item.id,
      messageId: item.messageId,
      title: item.title,
      type: item.type,
    })),
  });

  return (
    <div className="space-y-5">
      {/* Greeting and Summary */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">
          {getGreeting(userTimezone)}, {displayName}!
        </h1>
        <p className="text-base text-muted-foreground">
          {newMessages === 0 && activeConversations === 0 ? (
            "Your inbox is clear — nice work! 🎉"
          ) : newMessages === 0 ? (
            <>You're all caught up! <span className="font-semibold text-foreground">{activeConversations}</span> conversation{activeConversations !== 1 ? 's' : ''} waiting.</>
          ) : (
            <>
              <span className="font-semibold text-foreground">{newMessages}</span> new message{newMessages !== 1 ? 's' : ''} and{' '}
              <span className="font-semibold text-foreground">{activeConversations}</span> active conversation{activeConversations !== 1 ? 's' : ''} to catch up on
            </>
          )}
        </p>
      </div>

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

      {/* Quick Stats - Interactive cards with clear hover states */}
      <div className="grid grid-cols-3 gap-3 pt-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 ${newMessages === 0 ? 'opacity-60' : 'border-primary/10'}`}>
                <CardContent className="p-4 text-center">
                  {newMessages === 0 ? (
                    <div className="text-sm font-medium text-muted-foreground">Inbox zero! 🎉</div>
                  ) : (
                    <div className="text-2xl font-bold text-primary">{newMessages}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">New Messages</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Unread messages across all your channels</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 ${(todayEventsCount || 0) === 0 ? 'opacity-60' : 'border-primary/10'}`}>
                <CardContent className="p-4 text-center">
                  {(todayEventsCount || 0) === 0 ? (
                    <div className="text-sm font-medium text-muted-foreground">Clear schedule today</div>
                  ) : (
                    <div className="text-2xl font-bold text-primary">{todayEventsCount || 0}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">Today's Events</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your calendar events for today</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 ${(upcomingEvents?.length || 0) === 0 ? 'opacity-60' : 'border-primary/10'}`}>
                <CardContent className="p-4 text-center">
                  {(upcomingEvents?.length || 0) === 0 ? (
                    <div className="text-sm font-medium text-muted-foreground">Nothing scheduled</div>
                  ) : (
                    <div className="text-2xl font-bold text-primary">{upcomingEvents?.length || 0}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">Coming Up</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Events in the next 48 hours</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

