/**
 * Morning Brief Component
 * Displays a personalized morning briefing with crucial messages and action items
 * Similar to Kinso.AI's morning brief feature
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronRight,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getUser } from '@/utils/server/serverSessionUtils';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { BriefingSection } from './BriefingSection';
import { AivaChatInput } from './AivaChatInput';

function getGreeting() {
  const hour = new Date().getHours();
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

  return (
    <div className="space-y-5">
      {/* Greeting and Summary */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">
          {getGreeting()}, {displayName}
        </h1>
        <p className="text-base text-muted-foreground">
          You've got{' '}
          <span className="font-semibold text-foreground">{newMessages}</span> new and{' '}
          <span className="font-semibold text-foreground">{activeConversations}</span> active conversations
        </p>
      </div>

      {/* Today's Briefing Button - Only show if there are briefing items */}
      {briefingItems.length > 0 && (
        <div className="flex justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="group"
                  asChild
                  aria-label={`View today's briefing with ${briefingItems.length} items that need your attention`}
                >
                  <Link href="#briefing">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Today's briefing</span>
                    <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {briefingItems.length}
                    </span>
                    <ChevronRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Jump to your {briefingItems.length} priority items: urgent messages and upcoming events</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Briefing Items */}
      {briefingItems.length > 0 && (
        <div id="briefing">
          <BriefingSection items={briefingItems} />
        </div>
      )}

      {/* AI Chat Input */}
      <AivaChatInput />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 pt-3">
        <Card className={newMessages === 0 ? 'opacity-60' : ''}>
          <CardContent className="p-3 text-center">
            {newMessages === 0 ? (
              <div className="text-sm font-medium text-muted-foreground">No new messages yet</div>
            ) : (
              <div className="text-xl font-bold">{newMessages}</div>
            )}
            <div className="text-xs text-muted-foreground">New Messages</div>
          </CardContent>
        </Card>
        <Card className={(todayEventsCount || 0) === 0 ? 'opacity-60' : ''}>
          <CardContent className="p-3 text-center">
            {(todayEventsCount || 0) === 0 ? (
              <div className="text-sm font-medium text-muted-foreground">No events today</div>
            ) : (
              <div className="text-xl font-bold">{todayEventsCount || 0}</div>
            )}
            <div className="text-xs text-muted-foreground">Today's Events</div>
          </CardContent>
        </Card>
        <Card className={(upcomingEvents?.length || 0) === 0 ? 'opacity-60' : ''}>
          <CardContent className="p-3 text-center">
            {(upcomingEvents?.length || 0) === 0 ? (
              <div className="text-sm font-medium text-muted-foreground">No upcoming events</div>
            ) : (
              <div className="text-xl font-bold">{upcomingEvents?.length || 0}</div>
            )}
            <div className="text-xs text-muted-foreground">Upcoming Events</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

