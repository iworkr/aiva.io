/**
 * Briefing Section Component
 * Expandable/collapsible briefing items
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckSquare,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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
        return <Mail className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500/70 bg-card';
      case 'high':
        return 'border-orange-500/70 bg-card';
      case 'medium':
        return 'border-yellow-500/70 bg-card';
      default:
        return 'border-primary/70 bg-card';
    }
  };

  const renderItem = (item: BriefingItem) => {
    const getHoverBorderColor = () => {
      switch (item.priority) {
        case 'urgent':
          return 'hover:border-l-red-500 hover:border-opacity-100';
        case 'high':
          return 'hover:border-l-orange-500 hover:border-opacity-100';
        case 'medium':
          return 'hover:border-l-yellow-500 hover:border-opacity-100';
        default:
          return 'hover:border-l-primary hover:border-opacity-100';
      }
    };

    return (
      <Link key={item.id} href={item.href}>
        <Card className={`group relative transition-all duration-300 hover:shadow-md cursor-pointer border-l-4 overflow-hidden ${getPriorityColor(item.priority)} ${getHoverBorderColor()}`}>
          {/* Shimmer effect */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-300 pointer-events-none z-10" />
          <CardContent className="py-1.5 px-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0">{getIcon(item.type)}</div>
            <h3 className="font-medium text-sm truncate flex-1 min-w-0">{item.title}</h3>
            <Badge
              variant={
                item.priority === 'urgent'
                  ? 'destructive'
                  : item.priority === 'high'
                  ? 'default'
                  : 'secondary'
              }
              className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
            >
              {item.priority}
            </Badge>
            {(item.metadata || item.timestamp) && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-shrink-0">
                {item.metadata && (
                  <span className="flex items-center gap-0.5 whitespace-nowrap">
                    {item.type === 'message' && <Mail className="h-2.5 w-2.5" />}
                    {item.metadata}
                  </span>
                )}
                {item.timestamp && (
                  <span className="flex items-center gap-0.5 whitespace-nowrap">
                    <Clock className="h-2.5 w-2.5" />
                    {item.type === 'task' && item.metadata?.includes('Due')
                      ? item.metadata
                      : formatDistanceToNow(item.timestamp, { addSuffix: true })}
                  </span>
                )}
              </div>
            )}
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
    );
  };

  return (
    <div id="briefing" className="space-y-2.5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">What needs your attention</h2>
        {items.length > 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1.5 h-8 text-xs font-medium border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show {remainingItems.length} more
              </>
            )}
          </Button>
        )}
      </div>

      {/* Always show top 3 items */}
      <div className="space-y-2">
        {topItems.map(renderItem)}
      </div>

      {/* Show remaining items when expanded */}
      {isExpanded && remainingItems.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          {remainingItems.map(renderItem)}
        </div>
      )}
    </div>
  );
}

