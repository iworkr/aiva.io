/**
 * Aiva Dashboard - Inbox Zero Experience
 * Main dashboard showing what needs attention, stats, and daily briefing
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Inbox,
  Calendar,
  Zap,
  Mail,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Star,
  User,
  MessageSquare,
  Timer,
  Percent,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  getDashboardStats,
  getNeedsAttentionItems,
  getDailyBriefing,
  type DashboardStats,
  type AttentionItem,
  type DailyBriefing,
} from '@/data/user/dashboard-stats';
import { rejectReviewItemAction, bulkDismissReviewItemsAction } from '@/data/user/review-queue';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { X, Trash2 } from 'lucide-react';

interface AivaDashboardProps {
  workspaceId: string;
  userId: string;
  userName?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = 'text-primary',
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-muted/50 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3 text-xs text-green-600">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionItemCard({ 
  item, 
  onClick,
  onDismiss,
}: { 
  item: AttentionItem; 
  onClick?: () => void;
  onDismiss?: (messageId: string, e: React.MouseEvent) => void;
}) {
  const typeConfig = {
    review: { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Needs Review' },
    high_priority: { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'High Priority' },
    scheduling: { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Scheduling' },
    unhandled: { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30', label: 'Unhandled' },
  };

  const config = typeConfig[item.type];
  
  // Format review reason for display
  const formatReviewReason = (reason?: string) => {
    if (!reason) return 'Needs Review';
    const reasonMap: Record<string, string> = {
      // Calendar-related
      calendar_mismatch: 'Calendar Mismatch',
      no_calendar_connected: 'No Calendar Connected',
      calendar_check_failed: 'Calendar Check Failed',
      scheduling_confirmation: 'Scheduling Confirmation',
      // Category-based
      customer_complaint: 'Customer Complaint',
      sales_lead_requires_review: 'Sales Lead',
      bill_requires_review: 'Bill',
      invoice_requires_review: 'Invoice',
      // Priority-based
      high_priority_urgent: 'Urgent Priority',
      high_priority_high: 'High Priority',
      // AI decision-based
      low_confidence: 'Low Confidence',
      not_auto_sendable: 'Not Auto-Sendable',
      commitment_confirmation: 'Needs Confirmation',
      sensitive_topic: 'Sensitive Topic',
      personal_relationship: 'Personal Relationship',
      uncertain_context: 'Uncertain Context',
      flagged_by_classifier: 'AI Flagged',
      // Missing information
      missing_information_pricing: 'Missing Pricing Info',
      missing_information_commitment: 'Missing Commitment Info',
      missing_information_availability: 'Missing Availability',
      missing_information_deadline: 'Missing Deadline',
      missing_information_delivery_date: 'Missing Delivery Date',
      missing_information_other: 'Missing Information',
      // Auto-replied
      auto_replied_needs_review: 'Auto-Replied (Needs Follow-up)',
      auto_replied_acknowledgement_needs_followup: 'Auto-Acknowledged (Needs Follow-up)',
      // Generic
      draft_held_for_review: 'Draft Held for Review',
      needs_review: 'Needs Review',
    };
    return reasonMap[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const hasDraftInfo = item.hasDraft && (item.draftBody || item.confidenceScore !== undefined);
  const isCalendarMismatch = item.reviewReason === 'calendar_mismatch';
  const calendarInfo = item.calendarContext as any;

  return (
    <Link href={`/inbox?message=${item.messageId}${item.draftId ? `&draft=${item.draftId}` : ''}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-amber-500">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${config.bg}`}>
              {item.type === 'review' && <AlertCircle className={`h-4 w-4 ${config.color}`} />}
              {item.type === 'high_priority' && <Star className={`h-4 w-4 ${config.color}`} />}
              {item.type === 'scheduling' && <Calendar className={`h-4 w-4 ${config.color}`} />}
              {item.type === 'unhandled' && <Mail className={`h-4 w-4 ${config.color}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${config.color} border-amber-500`}>
                  {formatReviewReason(item.reviewReason)}
                </Badge>
                {item.provider && (
                  <Badge variant="secondary" className="text-xs">
                    {item.provider}
                  </Badge>
                )}
                {hasDraftInfo && (
                  <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Draft Ready
                  </Badge>
                )}
                {item.confidenceScore !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(item.confidenceScore * 100)}% confidence
                  </Badge>
                )}
              </div>
              <h4 className="font-medium truncate mb-1">{item.subject}</h4>
              <p className="text-sm text-muted-foreground truncate">
                {item.senderName || item.senderEmail}
              </p>
              
              {/* Show draft preview or calendar mismatch info */}
              {hasDraftInfo && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs">
                  <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                    AI Draft Generated:
                  </p>
                  <p className="text-blue-800 dark:text-blue-400 line-clamp-2">
                    {item.draftBody?.substring(0, 150)}
                    {item.draftBody && item.draftBody.length > 150 ? '...' : ''}
                  </p>
                </div>
              )}
              
              {isCalendarMismatch && calendarInfo && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs">
                  <p className="font-medium text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Calendar Issue:
                  </p>
                  <p className="text-amber-800 dark:text-amber-400">
                    {calendarInfo.context || item.aiUncertaintyNotes || 'No matching calendar event found. Human verification needed.'}
                  </p>
                </div>
              )}
              
              {item.aiUncertaintyNotes && !isCalendarMismatch && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs">
                  <p className="text-amber-800 dark:text-amber-400">
                    {item.aiUncertaintyNotes}
                  </p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => onDismiss(item.messageId, e)}
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function InboxZeroState() {
  return (
    <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
      <CardContent className="py-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/50">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
          Inbox Zero! 🎉
        </h3>
        <p className="text-green-600 dark:text-green-500 max-w-md mx-auto">
          Amazing work! You have no messages that need your attention right now.
          Aiva is handling everything.
        </p>
      </CardContent>
    </Card>
  );
}

export function AivaDashboard({ workspaceId, userId, userName }: AivaDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  const { execute: dismissItem, status: dismissStatus } = useAction(rejectReviewItemAction, {
    onSuccess: () => {
      toast.success('Item dismissed');
      loadDashboardData();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to dismiss item');
    },
  });

  const { execute: bulkDismiss, status: bulkDismissStatus } = useAction(bulkDismissReviewItemsAction, {
    onSuccess: ({ data }) => {
      toast.success(`Dismissed ${data?.dismissedCount || 0} items`);
      loadDashboardData();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to dismiss items');
    },
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, itemsData, briefingData] = await Promise.all([
        getDashboardStats(workspaceId, userId),
        getNeedsAttentionItems(workspaceId, userId, 5),
        getDailyBriefing(workspaceId, userId),
      ]);
      setStats(statsData);
      setAttentionItems(itemsData);
      setBriefing(briefingData);
      
      // Debug logging
      console.log('[Dashboard] Loaded attention items:', {
        count: itemsData.length,
        items: itemsData.map(i => ({
          messageId: i.messageId,
          subject: i.subject,
          hasDraft: i.hasDraft,
          draftId: i.draftId,
          reviewReason: i.reviewReason,
          timestamp: i.timestamp,
        })),
      });
      
      // Check specifically for the Thursday email
      const thursdayEmail = itemsData.find(i => 
        i.messageId === '367735ec-3639-4d13-b867-48e701d7da58' ||
        i.subject?.includes('Thursday')
      );
      if (thursdayEmail) {
        console.log('[Dashboard] ✅ Thursday email found in attention items:', thursdayEmail);
      } else {
        console.log('[Dashboard] ❌ Thursday email NOT found in attention items');
        console.log('[Dashboard] All message IDs:', itemsData.map(i => i.messageId));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleDismissItem = (messageId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dismissItem({
      workspaceId,
      messageId,
      action: 'rejected',
    });
  };

  const handleClearAll = () => {
    if (attentionItems.length === 0) return;
    const messageIds = attentionItems.map(item => item.messageId);
    bulkDismiss({
      workspaceId,
      messageIds,
      action: 'rejected',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const needsAttention = (stats?.reviewQueueCount || 0) + (stats?.highPriorityUnhandled || 0);

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {briefing?.greeting || `Welcome back${userName ? `, ${userName}` : ''}!`}
              </h1>
              <p className="text-muted-foreground mt-1">
                {briefing?.summary || 'Loading your daily briefing...'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {needsAttention > 0 ? (
                <Badge variant="destructive" className="text-base px-4 py-2">
                  {needsAttention} need{needsAttention !== 1 ? '' : 's'} attention
                </Badge>
              ) : (
                <Badge variant="outline" className="text-base px-4 py-2 border-green-500 text-green-600">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  All caught up
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Handled Today"
          value={stats?.messagesHandledToday || 0}
          icon={CheckCircle2}
          description={`of ${stats?.messagesReceivedToday || 0} received`}
          color="text-green-600"
        />
        <StatCard
          title="Auto-Replies"
          value={stats?.autoRepliesSentToday || 0}
          icon={Zap}
          description="sent automatically"
          color="text-amber-600"
        />
        <StatCard
          title="Time Saved"
          value={`${stats?.timeSavedMinutes || 0}m`}
          icon={Timer}
          description="estimated today"
          color="text-blue-600"
        />
        <StatCard
          title="Inbox Reduction"
          value={`${stats?.inboxReductionPercent || 0}%`}
          icon={Percent}
          description="of emails handled"
          color="text-purple-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Section - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              What Needs Your Attention
            </h2>
            <div className="flex items-center gap-2">
              {attentionItems.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={bulkDismissStatus === 'executing'}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                  <Link href="/inbox?filter=needs_attention">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {attentionItems.length === 0 ? (
            <InboxZeroState />
          ) : (
            <div className="space-y-3">
              {attentionItems.map((item) => (
                <AttentionItemCard 
                  key={item.id} 
                  item={item} 
                  onDismiss={handleDismissItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Key Contacts */}
          {briefing?.keyContacts && briefing.keyContacts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Key Contacts Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {briefing.keyContacts.slice(0, 4).map((contact, i) => (
                  <div key={contact.email} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">
                        {contact.name || contact.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.latestSubject}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2 flex-shrink-0">
                      {contact.messageCount}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          {briefing?.upcomingEvents && briefing.upcomingEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {briefing.upcomingEvents.slice(0, 3).map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(event.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      {event.attendees && event.attendees.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          with {event.attendees.slice(0, 2).join(', ')}
                          {event.attendees.length > 2 && ` +${event.attendees.length - 2}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <Link href="/calendar">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View Calendar
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Aiva Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Conversations</span>
                <span className="font-medium">{stats?.activeConversations || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Review Queue</span>
                <span className="font-medium">{stats?.reviewQueueCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">High Priority</span>
                <span className="font-medium">{stats?.highPriorityUnhandled || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/inbox" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Inbox className="h-4 w-4 mr-2" />
                  Go to Inbox
                </Button>
              </Link>
              <Link href="/calendar" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Calendar
                </Button>
              </Link>
              <Link href="/settings" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AivaDashboard;
