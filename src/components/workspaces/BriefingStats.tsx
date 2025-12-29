/**
 * Client component for briefing stats that updates optimistically
 * when items are dismissed
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BriefingStatsProps {
  initialNewMessages: number;
  initialActiveConversations: number;
  todayEventsCount: number;
  upcomingEventsCount: number;
  itemCount: number; // Current number of items (for optimistic updates)
}

export function BriefingStats({
  initialNewMessages,
  initialActiveConversations,
  todayEventsCount,
  upcomingEventsCount,
  itemCount,
}: BriefingStatsProps) {
  // Track stats with optimistic updates
  const [newMessages, setNewMessages] = useState(initialNewMessages);
  const [activeConversations, setActiveConversations] = useState(initialActiveConversations);
  const [prevItemCount, setPrevItemCount] = useState(itemCount);

  // Update stats when itemCount changes (items were dismissed)
  useEffect(() => {
    // When items are dismissed, the itemCount decreases
    // Calculate how many items were removed
    const itemsRemoved = prevItemCount - itemCount;
    
    if (itemsRemoved > 0) {
      // Update newMessages: remove the number of items that were dismissed
      // Since itemCount represents actionable items (mostly messages), we can directly subtract
      setNewMessages(prev => Math.max(0, prev - itemsRemoved));
      
      // For activeConversations: if all items are dismissed, set to 0
      // Otherwise, estimate that some conversations were removed
      if (itemCount === 0) {
        setActiveConversations(0);
      } else {
        // Estimate: assume at least one conversation per removed item (conservative)
        // But don't go below 0
        setActiveConversations(prev => Math.max(0, prev - itemsRemoved));
      }
    }
    
    // Update previous count for next comparison
    setPrevItemCount(itemCount);
  }, [itemCount, prevItemCount]);

  // Sync with server data when it changes (after router.refresh())
  useEffect(() => {
    setNewMessages(initialNewMessages);
    setActiveConversations(initialActiveConversations);
    setPrevItemCount(itemCount); // Reset tracking when server data updates
  }, [initialNewMessages, initialActiveConversations, itemCount]);

  return (
    <>
      {/* Greeting Summary */}
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

      {/* Quick Stats - Interactive cards */}
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
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 ${todayEventsCount === 0 ? 'opacity-60' : 'border-primary/10'}`}>
                <CardContent className="p-4 text-center">
                  {todayEventsCount === 0 ? (
                    <div className="text-sm font-medium text-muted-foreground">Clear schedule today</div>
                  ) : (
                    <div className="text-2xl font-bold text-primary">{todayEventsCount}</div>
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
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 ${upcomingEventsCount === 0 ? 'opacity-60' : 'border-primary/10'}`}>
                <CardContent className="p-4 text-center">
                  {upcomingEventsCount === 0 ? (
                    <div className="text-sm font-medium text-muted-foreground">Nothing scheduled</div>
                  ) : (
                    <div className="text-2xl font-bold text-primary">{upcomingEventsCount}</div>
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
    </>
  );
}
