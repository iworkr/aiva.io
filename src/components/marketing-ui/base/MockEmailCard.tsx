/**
 * MockEmailCard - Marketing UI Component
 * Simplified email preview for marketing visuals
 */

'use client';

import { cn } from '@/lib/utils';
import { Mail, Paperclip, Star } from 'lucide-react';
import Image from 'next/image';

interface MockEmailCardProps {
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  snippet: string;
  timestamp?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  category?: string;
  hasAttachment?: boolean;
  isStarred?: boolean;
  isUnread?: boolean;
  labels?: string[];
  className?: string;
  animate?: boolean;
  animationDelay?: number;
}

const priorityColors = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400',
};

const priorityLabels = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export function MockEmailCard({
  sender,
  subject,
  snippet,
  timestamp = '2m ago',
  priority,
  category,
  hasAttachment,
  isStarred,
  isUnread = true,
  labels = [],
  className,
  animate = false,
  animationDelay = 0,
}: MockEmailCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-4 shadow-sm transition-all duration-300',
        'hover:shadow-md hover:border-primary/30',
        isUnread && 'border-l-4 border-l-primary',
        animate && 'animate-in fade-in slide-in-from-bottom-2',
        className
      )}
      style={{ animationDelay: animate ? `${animationDelay}ms` : undefined }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {sender.avatar ? (
            <Image
              src={sender.avatar}
              alt={sender.name}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {sender.name.charAt(0).toUpperCase()}
            </div>
          )}
          {isUnread && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-card" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                'font-medium truncate text-sm',
                isUnread && 'font-semibold text-foreground'
              )}>
                {sender.name}
              </span>
              {priority && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium text-white',
                  priorityColors[priority]
                )}>
                  {priorityLabels[priority]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isStarred && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
              {hasAttachment && <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </div>
          </div>

          {/* Subject */}
          <p className={cn(
            'text-sm truncate',
            isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
          )}>
            {subject}
          </p>

          {/* Snippet */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {snippet}
          </p>

          {/* Labels */}
          {(labels.length > 0 || category) && (
            <div className="flex items-center gap-1.5 pt-1">
              {category && (
                <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground">
                  {category}
                </span>
              )}
              {labels.map((label, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MockEmailCard;

