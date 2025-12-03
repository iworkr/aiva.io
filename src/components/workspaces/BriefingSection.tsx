/**
 * Briefing Section Component
 * Minimal, sleek expandable/collapsible briefing items
 */

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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

  // Get channel logo based on provider/metadata
  const getChannelLogo = (metadata?: string) => {
    const provider = metadata?.toLowerCase() || '';
    
    // Gmail - Red envelope icon
    if (provider.includes('gmail') || provider === 'email') {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="#EA4335"/>
        </svg>
      );
    }
    // Outlook - Blue icon
    if (provider.includes('outlook') || provider.includes('microsoft')) {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#0078D4"/>
          <path d="M12 6C9.24 6 7 8.24 7 11C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11C17 8.24 14.76 6 12 6ZM12 14C10.34 14 9 12.66 9 11C9 9.34 10.34 8 12 8C13.66 8 15 9.34 15 11C15 12.66 13.66 14 12 14Z" fill="white"/>
        </svg>
      );
    }
    // Slack - Colorful hashtag
    if (provider.includes('slack')) {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
        </svg>
      );
    }
    // Teams - Purple icon
    if (provider.includes('teams')) {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#5059C9"/>
          <circle cx="16" cy="8" r="2" fill="white"/>
          <path d="M8 10H14V16H8V10Z" fill="white"/>
        </svg>
      );
    }
    // WhatsApp - Green icon
    if (provider.includes('whatsapp')) {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 14.17 2.69 16.17 3.86 17.78L2.07 22L6.39 20.25C7.93 21.2 9.89 21.97 12 21.97C17.52 21.97 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#25D366"/>
          <path d="M8.5 14.5L10.5 12.5L14 16L17 11L13 9L10.5 11.5L8.5 9.5L6 12L8.5 14.5Z" fill="white"/>
        </svg>
      );
    }
    // Telegram - Blue icon
    if (provider.includes('telegram')) {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#0088CC"/>
          <path d="M7 12L10 15L17 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    // Default: no logo
    return null;
  };

  const renderItem = (item: BriefingItem) => {
    const channelLogo = item.type === 'message' ? getChannelLogo(item.metadata) : null;
    
    return (
      <Link key={item.id} href={item.href}>
        <div className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
          {/* Priority dot */}
          <span className={cn("h-2 w-2 rounded-full flex-shrink-0", getPriorityDot(item.priority))} />
          
          {/* Icon */}
          <span className="text-muted-foreground flex-shrink-0">
            {getIcon(item.type)}
          </span>
          
          {/* Title */}
          <span className="text-sm truncate flex-1 min-w-0">{item.title}</span>
          
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
          
          {/* Arrow */}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
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

