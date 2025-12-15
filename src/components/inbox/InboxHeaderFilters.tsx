/**
 * InboxHeaderFilters Component
 * Compact filter bar with quick filter pills and sort dropdown
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Mail,
  MailOpen,
  Star,
  ArrowUpDown,
  ChevronDown,
  Filter,
  X,
  Flame,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { MessagePriority, MessageCategory } from '@/utils/zod-schemas/aiva-schemas';

export type SortOption = 'date_desc' | 'date_asc' | 'priority' | 'sender';
export type StatusFilter = 'all' | 'unread' | 'starred';

interface InboxHeaderFiltersProps {
  // Status filter
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  // Sort
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  // Priority filter
  priorityFilter?: MessagePriority;
  onPriorityFilterChange: (priority: MessagePriority | undefined) => void;
  // Category filter
  categoryFilter?: MessageCategory;
  onCategoryFilterChange: (category: MessageCategory | undefined) => void;
  // Counts for badges
  unreadCount?: number;
  starredCount?: number;
}

const PRIORITY_OPTIONS: { value: MessagePriority; label: string; icon: typeof Flame }[] = [
  { value: 'urgent', label: 'Urgent', icon: Flame },
  { value: 'high', label: 'High', icon: AlertTriangle },
  { value: 'medium', label: 'Medium', icon: Clock },
  { value: 'low', label: 'Low', icon: Clock },
];

const CATEGORY_OPTIONS: { value: MessageCategory; label: string }[] = [
  { value: 'customer_inquiry', label: 'Customer Inquiry' },
  { value: 'customer_complaint', label: 'Customer Complaint' },
  { value: 'sales_lead', label: 'Sales Lead' },
  { value: 'client_support', label: 'Client Support' },
  { value: 'bill', label: 'Bill / Invoice' },
  { value: 'authorization_code', label: 'Auth Code' },
  { value: 'security_alert', label: 'Security Alert' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'meeting_request', label: 'Meeting' },
  { value: 'personal', label: 'Personal' },
  { value: 'notification', label: 'Notification' },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'priority', label: 'Priority' },
  { value: 'sender', label: 'Sender name' },
];

export function InboxHeaderFilters({
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  priorityFilter,
  onPriorityFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  unreadCount = 0,
  starredCount = 0,
}: InboxHeaderFiltersProps) {
  const hasActiveFilters = priorityFilter || categoryFilter;

  const handleClearFilters = () => {
    onPriorityFilterChange(undefined);
    onCategoryFilterChange(undefined);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Status pills */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onStatusFilterChange('all')}
          className={cn(
            'h-7 px-2.5 text-xs rounded-r-none border-r-0',
            statusFilter === 'all' 
              ? 'bg-primary/10 text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onStatusFilterChange('unread')}
          className={cn(
            'h-7 px-2.5 text-xs rounded-none',
            statusFilter === 'unread' 
              ? 'bg-primary/10 text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Mail className="mr-1 h-3 w-3" />
          Unread
          {unreadCount > 0 && (
            <span className="ml-1 text-[10px] opacity-70">({unreadCount > 99 ? '99+' : unreadCount})</span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onStatusFilterChange('starred')}
          className={cn(
            'h-7 px-2.5 text-xs rounded-l-none',
            statusFilter === 'starred' 
              ? 'bg-primary/10 text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Star className="mr-1 h-3 w-3" />
          Starred
        </Button>
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Priority filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 text-xs gap-1',
              priorityFilter ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Priority
            {priorityFilter && <span className="text-[10px]">: {priorityFilter}</span>}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel className="text-xs">Filter by priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PRIORITY_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={priorityFilter === option.value}
              onCheckedChange={(checked) =>
                onPriorityFilterChange(checked ? option.value : undefined)
              }
            >
              <option.icon className="mr-2 h-3.5 w-3.5" />
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Category filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 text-xs gap-1',
              categoryFilter ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Category
            {categoryFilter && <span className="text-[10px] max-w-[60px] truncate">: {categoryFilter.replace(/_/g, ' ')}</span>}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">Filter by category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {CATEGORY_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={categoryFilter === option.value}
              onCheckedChange={(checked) =>
                onCategoryFilterChange(checked ? option.value : undefined)
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
            <ArrowUpDown className="h-3 w-3" />
            {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={sortBy === option.value}
              onCheckedChange={() => onSortChange(option.value as SortOption)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

