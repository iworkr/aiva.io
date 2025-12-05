/**
 * Briefing Section Component
 * Interactive briefing items with inline actions
 */

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  ChevronRight,
  MessageSquare,
  Check,
  X,
  CalendarClock,
  Sparkles,
  Send,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { getChannelLogo } from '@/constants/channel-logos';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

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

interface BriefingSectionProps {
  items: BriefingItem[];
}

export function BriefingSection({ items }: BriefingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  
  const topItems = items.slice(0, 3);
  const remainingItems = items.slice(3);

  if (items.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <Mail className="h-3.5 w-3.5" />;
      case 'event':
        return <Calendar className="h-3.5 w-3.5" />;
      default:
        return <Mail className="h-3.5 w-3.5" />;
    }
  };

  const handleQuickAction = async (item: BriefingItem, action: 'reply' | 'approve' | 'decline' | 'reschedule' | 'done') => {
    if (action === 'reply') {
      if (expandedItemId === item.id) {
        setExpandedItemId(null);
        setQuickReplyText('');
      } else {
        setExpandedItemId(item.id);
        setQuickReplyText('');
      }
      return;
    }

    if (action === 'done') {
      setCompletedItems(prev => new Set(prev).add(item.id));
      toast.success("Nice work! Task marked complete.");
      return;
    }

    if (action === 'approve') {
      setCompletedItems(prev => new Set(prev).add(item.id));
      toast.success("Meeting confirmed! I've sent a response for you.");
      return;
    }

    if (action === 'decline') {
      setCompletedItems(prev => new Set(prev).add(item.id));
      toast.success("Meeting declined. I'll let them know.");
      return;
    }

    if (action === 'reschedule') {
      toast.info("Opening calendar to find a new time...");
      // Would navigate to calendar with reschedule context
      return;
    }
  };

  const handleGenerateAIReply = async () => {
    setIsGeneratingReply(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    setQuickReplyText("Thanks for reaching out! I've reviewed your message and will get back to you with a detailed response shortly. Is there anything specific you'd like me to prioritize?");
    setIsGeneratingReply(false);
    toast.success("Here's a draft — feel free to tweak it!");
  };

  const handleSendQuickReply = async () => {
    if (!quickReplyText.trim() || !expandedItemId) return;
    
    setIsSendingReply(true);
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSendingReply(false);
    setCompletedItems(prev => new Set(prev).add(expandedItemId));
    setExpandedItemId(null);
    setQuickReplyText('');
    toast.success("Your reply is on its way! ✈️");
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-primary';
    }
  };

  // Get channel logo component using CDN URLs
  const renderChannelLogo = (metadata?: string) => {
    const logoUrl = getChannelLogo(metadata);
    if (!logoUrl) return null;
    
    return (
      <Image
        src={logoUrl}
        alt={metadata || 'Channel'}
        width={16}
        height={16}
        className="object-contain"
        unoptimized // Required for external CDN URLs
      />
    );
  };

  const renderItem = (item: BriefingItem) => {
    const channelLogo = item.type === 'message' ? renderChannelLogo(item.metadata) : null;
    const isCompleted = completedItems.has(item.id);
    const isItemExpanded = expandedItemId === item.id;
    
    if (isCompleted) {
      return (
        <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 opacity-60">
          <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span className="text-sm line-through text-muted-foreground truncate flex-1">{item.title}</span>
          <span className="text-xs text-emerald-500">Done</span>
        </div>
      );
    }
    
    return (
      <div key={item.id} className="space-y-2">
        <div className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
          {/* Priority dot */}
          <span className={cn("h-2 w-2 rounded-full flex-shrink-0", getPriorityDot(item.priority))} />
          
          {/* Icon */}
          <span className="text-muted-foreground flex-shrink-0">
            {getIcon(item.type)}
          </span>
          
          {/* Title - clickable link */}
          <Link href={item.href} className="text-sm truncate flex-1 min-w-0 hover:underline">
            {item.title}
          </Link>
          
          {/* Channel logo */}
          {channelLogo && (
            <span className="flex-shrink-0 opacity-70">
              {channelLogo}
            </span>
          )}
          
          {/* Timestamp */}
          {item.timestamp && (
            <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
            </span>
          )}
          
          {/* Quick Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.type === 'message' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        handleQuickAction(item, 'reply');
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Quick reply</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {item.type === 'event' && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600"
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickAction(item, 'approve');
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Accept</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickAction(item, 'decline');
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Decline</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickAction(item, 'reschedule');
                        }}
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reschedule</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            
            {item.type === 'task' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600"
                      onClick={(e) => {
                        e.preventDefault();
                        handleQuickAction(item, 'done');
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark done</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {/* Arrow to full view */}
          <Link href={item.href}>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
        
        {/* Expanded quick reply */}
        {isItemExpanded && item.type === 'message' && (
          <div className="ml-7 mr-3 p-3 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Quick reply</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleGenerateAIReply}
                disabled={isGeneratingReply}
              >
                {isGeneratingReply ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    Draft with AI
                  </>
                )}
              </Button>
            </div>
            <Textarea
              placeholder="Type your reply..."
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              disabled={isGeneratingReply}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExpandedItemId(null);
                  setQuickReplyText('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendQuickReply}
                disabled={!quickReplyText.trim() || isSendingReply}
                className="gap-1.5"
              >
                {isSendingReply ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="briefing" className="space-y-1">
      <div className="flex items-center justify-between px-3 mb-1">
        <h2 className="text-sm font-medium text-muted-foreground">What needs your attention</h2>
        {items.length > 3 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                +{remainingItems.length} more
              </>
            )}
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-0.5">
        {topItems.map(renderItem)}
        
        {/* Show remaining items when expanded */}
        {isExpanded && remainingItems.map(renderItem)}
      </div>
    </div>
  );
}

