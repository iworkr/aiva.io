/**
 * Classification Badges
 * Visual badges for AI-generated classifications
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { getCategoryDisplay, getPriorityDisplay } from '@/lib/ai/priority-mapper';
import { cn } from '@/lib/utils';
import type { MessageCategory, MessagePriority } from '@/utils/zod-schemas/aiva-schemas';
import {
  AlertTriangle,
  Ban,
  Bell,
  Building2,
  Calendar,
  CircleDot,
  CreditCard,
  DollarSign,
  Flame,
  Headphones,
  HelpCircle,
  KeyRound,
  LogIn,
  Megaphone,
  MessageSquareWarning,
  Minus,
  Newspaper,
  Receipt,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';

export function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  if (!priority) return null;

  const display = getPriorityDisplay(priority as MessagePriority);
  const iconMap: Record<string, any> = {
    urgent: Flame,
    high: AlertTriangle,
    medium: Minus,
    low: TrendingDown,
    noise: Ban,
  };
  const Icon = iconMap[priority] || Minus;

  return (
    <Badge variant="outline" className={cn('text-xs', display.color, display.bgColor)}>
      <Icon className="mr-1 h-3 w-3" />
      {display.label}
    </Badge>
  );
}

// Icon and color mapping for categories
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  customer_inquiry: { icon: HelpCircle, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  customer_complaint: { icon: MessageSquareWarning, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950' },
  sales_lead: { icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950' },
  client_support: { icon: Headphones, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  bill: { icon: DollarSign, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  invoice: { icon: Receipt, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  payment_confirmation: { icon: CreditCard, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950' },
  authorization_code: { icon: KeyRound, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  sign_in_code: { icon: LogIn, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  security_alert: { icon: ShieldAlert, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950' },
  marketing: { icon: Megaphone, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-950' },
  junk_email: { icon: Trash2, color: 'text-gray-500 dark:text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-900' },
  newsletter: { icon: Newspaper, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-950' },
  internal: { icon: Building2, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-950' },
  meeting_request: { icon: Calendar, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-950' },
  personal: { icon: User, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  social: { icon: Users, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-950' },
  notification: { icon: Bell, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-950' },
  other: { icon: CircleDot, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-950' },
};

export function CategoryBadge({
  category,
  confidenceScore
}: {
  category: string | null | undefined;
  confidenceScore?: number | null;
}) {
  if (!category) return null;

  const display = getCategoryDisplay(category as MessageCategory);
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  const Icon = config.icon;

  const confidence = confidenceScore !== null && confidenceScore !== undefined
    ? Math.round(confidenceScore * 100)
    : null;

  return (
    <Badge
      variant="outline"
      className={cn('text-xs', config.color, config.bgColor)}
      title={confidence !== null ? `${display.description} (${confidence}% confidence)` : display.description}
    >
      <Icon className="mr-1 h-3 w-3" />
      {display.label}
      {confidence !== null && (
        <span className="ml-1.5 text-[10px] opacity-70">{confidence}%</span>
      )}
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

