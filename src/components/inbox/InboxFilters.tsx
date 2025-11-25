/**
 * InboxFilters Component
 * Filter messages by priority, category, and status
 */

'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  MailOpen,
  Flame,
  AlertTriangle,
  Minus,
  TrendingDown,
  Briefcase,
  User,
  ShoppingCart,
  Users,
  DollarSign,
  Plane,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InboxFiltersProps {
  currentFilters?: {
    priority?: string;
    category?: string;
    status?: string;
  };
  onFilterChange: (filters: any) => void;
}

export function InboxFilters({ currentFilters, onFilterChange }: InboxFiltersProps) {
  const handleFilterClick = (key: string, value: string) => {
    if (currentFilters?.[key as keyof typeof currentFilters] === value) {
      // Remove filter
      onFilterChange({ ...currentFilters, [key]: undefined });
    } else {
      // Add filter
      onFilterChange({ ...currentFilters, [key]: value });
    }
  };

  const FilterButton = ({
    icon: Icon,
    label,
    filterKey,
    filterValue,
  }: {
    icon: any;
    label: string;
    filterKey: string;
    filterValue: string;
  }) => {
    const isActive = currentFilters?.[filterKey as keyof typeof currentFilters] === filterValue;

    return (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size="sm"
        className={cn('w-full justify-start', isActive && 'bg-primary/10')}
        onClick={() => handleFilterClick(filterKey, filterValue)}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Status
        </h3>
        <div className="space-y-1">
          <FilterButton
            icon={Mail}
            label="Unread"
            filterKey="status"
            filterValue="unread"
          />
          <FilterButton
            icon={MailOpen}
            label="All"
            filterKey="status"
            filterValue="all"
          />
        </div>
      </div>

      <Separator />

      {/* Priority */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Priority
        </h3>
        <div className="space-y-1">
          <FilterButton
            icon={Flame}
            label="Urgent"
            filterKey="priority"
            filterValue="urgent"
          />
          <FilterButton
            icon={AlertTriangle}
            label="High"
            filterKey="priority"
            filterValue="high"
          />
          <FilterButton
            icon={Minus}
            label="Medium"
            filterKey="priority"
            filterValue="medium"
          />
          <FilterButton
            icon={TrendingDown}
            label="Low"
            filterKey="priority"
            filterValue="low"
          />
        </div>
      </div>

      <Separator />

      {/* Category */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Category
        </h3>
        <div className="space-y-1">
          <FilterButton
            icon={Briefcase}
            label="Work"
            filterKey="category"
            filterValue="work"
          />
          <FilterButton
            icon={User}
            label="Personal"
            filterKey="category"
            filterValue="personal"
          />
          <FilterButton
            icon={ShoppingCart}
            label="Marketing"
            filterKey="category"
            filterValue="marketing"
          />
          <FilterButton
            icon={Users}
            label="Social"
            filterKey="category"
            filterValue="social"
          />
          <FilterButton
            icon={DollarSign}
            label="Finance"
            filterKey="category"
            filterValue="finance"
          />
          <FilterButton
            icon={Plane}
            label="Travel"
            filterKey="category"
            filterValue="travel"
          />
        </div>
      </div>

      {/* Clear filters */}
      {(currentFilters?.priority || currentFilters?.category || currentFilters?.status) && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onFilterChange({})}
          >
            Clear all filters
          </Button>
        </>
      )}
    </div>
  );
}

