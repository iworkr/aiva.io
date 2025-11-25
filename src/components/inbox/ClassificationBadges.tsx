/**
 * Classification Badges
 * Visual badges for AI-generated classifications
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Minus, TrendingDown, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { label: string; className: string; icon?: any }> = {
    urgent: {
      label: 'Urgent',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      icon: Flame,
    },
    high: {
      label: 'High',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
      icon: AlertTriangle,
    },
    medium: {
      label: 'Medium',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      icon: Minus,
    },
    low: {
      label: 'Low',
      className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
      icon: TrendingDown,
    },
  };

  const item = config[priority];
  if (!item) return null;

  const Icon = item.icon;

  return (
    <Badge variant="outline" className={cn('text-xs', item.className)}>
      {Icon && <Icon className="mr-1 h-3 w-3" />}
      {item.label}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const config: Record<string, { label: string; className: string }> = {
    work: {
      label: 'Work',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    },
    personal: {
      label: 'Personal',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    },
    marketing: {
      label: 'Marketing',
      className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
    },
    social: {
      label: 'Social',
      className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
    },
    finance: {
      label: 'Finance',
      className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
    },
    travel: {
      label: 'Travel',
      className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    },
    other: {
      label: 'Other',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    },
  };

  const item = config[category] || config.other;

  return (
    <Badge variant="outline" className={cn('text-xs', item.className)}>
      {item.label}
    </Badge>
  );
}

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { label: string; className: string; icon: any }> = {
    positive: {
      label: 'Positive',
      className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
      icon: TrendingUp,
    },
    neutral: {
      label: 'Neutral',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
      icon: Minus,
    },
    negative: {
      label: 'Negative',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      icon: TrendingDown,
    },
  };

  const item = config[sentiment];
  if (!item) return null;

  const Icon = item.icon;

  return (
    <Badge variant="outline" className={cn('text-xs', item.className)}>
      <Icon className="mr-1 h-3 w-3" />
      {item.label}
    </Badge>
  );
}

