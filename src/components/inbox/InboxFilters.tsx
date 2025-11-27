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
  Ban,
  Briefcase,
  User,
  ShoppingCart,
  Users,
  DollarSign,
  Plane,
  MessageCircle,
  AlertCircle,
  Receipt,
  Key,
  Shield,
  Mailbox,
  Calendar,
  Bell,
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
          <FilterButton
            icon={Ban}
            label="Noise"
            filterKey="priority"
            filterValue="noise"
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
            icon={MessageCircle}
            label="Customer Inquiry"
            filterKey="category"
            filterValue="customer_inquiry"
          />
          <FilterButton
            icon={AlertCircle}
            label="Customer Complaint"
            filterKey="category"
            filterValue="customer_complaint"
          />
          <FilterButton
            icon={Briefcase}
            label="Sales Lead"
            filterKey="category"
            filterValue="sales_lead"
          />
          <FilterButton
            icon={Users}
            label="Client Support"
            filterKey="category"
            filterValue="client_support"
          />
          <FilterButton
            icon={Receipt}
            label="Bill / Invoice"
            filterKey="category"
            filterValue="bill"
          />
          <FilterButton
            icon={Key}
            label="Auth Code"
            filterKey="category"
            filterValue="authorization_code"
          />
          <FilterButton
            icon={Shield}
            label="Security Alert"
            filterKey="category"
            filterValue="security_alert"
          />
          <FilterButton
            icon={ShoppingCart}
            label="Marketing"
            filterKey="category"
            filterValue="marketing"
          />
          <FilterButton
            icon={Mailbox}
            label="Junk Email"
            filterKey="category"
            filterValue="junk_email"
          />
          <FilterButton
            icon={Calendar}
            label="Meeting"
            filterKey="category"
            filterValue="meeting_request"
          />
          <FilterButton
            icon={User}
            label="Personal"
            filterKey="category"
            filterValue="personal"
          />
          <FilterButton
            icon={Bell}
            label="Notification"
            filterKey="category"
            filterValue="notification"
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

