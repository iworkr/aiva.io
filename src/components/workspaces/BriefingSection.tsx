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
import Image from 'next/image';
import { getChannelLogo } from '@/constants/channel-logos';

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

