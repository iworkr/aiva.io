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

  // Get workspace settings for timezone
  const { data: workspaceSettings } = await supabase
    .from('workspace_settings')
    .select('workspace_settings')
    .eq('workspace_id', workspaceId)
    .single();

  // Extract timezone from settings (stored in JSON)
  const userTimezone = (workspaceSettings?.workspace_settings as any)?.timezone || undefined;

  // Get user profile for display name
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  const displayName = userProfile?.full_name 
    ? userProfile.full_name.split(' ')[0]
    : getUserDisplayName(user);

  // Fetch crucial data
  const [
    { data: urgentMessages },
    { count: unreadCount },
    { count: allCount },
    { data: upcomingEvents },
    { count: todayEventsCount },
  ] = await Promise.all([
    // Urgent/high priority messages
    supabase
      .from('messages')
      .select('id, subject, body, priority, created_at, is_read, channel_connection:channel_connections(provider)')
      .eq('workspace_id', workspaceId)
      .in('priority', ['high'])
      .eq('is_read', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    
    // Unread messages count
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_read', false),
    
    // All messages for active conversations
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    
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
  const newMessages = unreadCount || 0;
  const activeConversations = allCount || 0;

  // Build briefing items (using Set to track unique IDs and prevent duplicates)
  const briefingItems: BriefingItem[] = [];
  const seenIds = new Set<string>(); // Track unique IDs to prevent duplicates

  // Utility: strip basic HTML tags from message bodies for cleaner snippets
  const stripHtml = (input: string | null | undefined) =>
    input ? input.replace(/<[^>]+>/g, '').trim() : '';

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

  // Add urgent messages (with deduplication)
  if (urgentMessages) {
    urgentMessages.forEach((msg: any) => {
      // Skip if we've already seen this message ID
      const uniqueKey = `message-${msg.id}`;
      if (seenIds.has(uniqueKey)) return;
      seenIds.add(uniqueKey);
      
      const cleanBody = stripHtml(msg.body)?.substring(0, 140) || '';
      const safeDescription = maskSensitiveContent(cleanBody);
      
      briefingItems.push({
        id: msg.id,
        type: 'message',
        title: maskSensitiveContent(msg.subject || 'No subject'),
        description: safeDescription,
        priority: msg.priority === 'urgent' ? 'urgent' : 'high',
        timestamp: msg.created_at ? new Date(msg.created_at) : undefined,
        href: `/inbox/${msg.id}`,
        metadata: msg.channel_connection?.provider || 'Email',
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

      {/* Briefing Items */}
      {deduplicatedItems.length > 0 && (
        <div id="briefing">
          <BriefingSection items={deduplicatedItems} />
        </div>
      )}

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

