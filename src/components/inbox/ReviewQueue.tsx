'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { 
  AlertCircle, 
  Calendar, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Edit2, 
  MessageSquare, 
  Send, 
  User, 
  X,
  AlertTriangle,
  HelpCircle,
  CalendarX,
  Shield,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  getReviewQueue,
  approveReviewItemAction,
  rejectReviewItemAction,
  type ReviewQueueItem,
} from '@/data/user/review-queue';

interface ReviewQueueProps {
  workspaceId: string;
  userId: string;
}

// Map review reasons to icons and colors
const REVIEW_REASON_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
  calendar_mismatch: { icon: CalendarX, color: 'text-orange-500', label: 'No Calendar Match' },
  no_calendar_connected: { icon: Calendar, color: 'text-yellow-500', label: 'No Calendar Connected' },
  calendar_check_failed: { icon: AlertTriangle, color: 'text-red-500', label: 'Calendar Check Failed' },
  scheduling_confirmation: { icon: Calendar, color: 'text-blue-500', label: 'Scheduling Confirmation' },
  commitment_confirmation: { icon: Check, color: 'text-purple-500', label: 'Commitment Request' },
  low_confidence: { icon: HelpCircle, color: 'text-gray-500', label: 'Low Confidence' },
  sensitive_topic: { icon: Shield, color: 'text-red-500', label: 'Sensitive Topic' },
  personal_relationship: { icon: Users, color: 'text-pink-500', label: 'Personal Context Needed' },
  uncertain_context: { icon: HelpCircle, color: 'text-gray-500', label: 'Unclear Context' },
  flagged_by_classifier: { icon: AlertCircle, color: 'text-yellow-500', label: 'AI Flagged' },
};

function ReviewReasonBadge({ reason }: { reason: string }) {
  const config = REVIEW_REASON_CONFIG[reason] || { 
    icon: AlertCircle, 
    color: 'text-gray-500', 
    label: reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
  };
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ReviewQueueItem({ 
  item, 
  onApprove, 
  onReject, 
  onEdit 
}: { 
  item: ReviewQueueItem;
  onApprove: (item: ReviewQueueItem) => void;
  onReject: (item: ReviewQueueItem) => void;
  onEdit: (item: ReviewQueueItem) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mb-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ReviewReasonBadge reason={item.reviewReason} />
                {item.confidenceScore && (
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(item.confidenceScore * 100)}% confidence
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base truncate">
                {item.subject}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <User className="h-3 w-3" />
                <span>{item.senderName || item.senderEmail}</span>
                <span className="text-muted-foreground">•</span>
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* AI Uncertainty Notes */}
            {item.aiUncertaintyNotes && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Why human review is needed:
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      {item.aiUncertaintyNotes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Context */}
            {item.calendarContext && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Calendar Context:
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {item.calendarContext.context || 'No additional context'}
                    </p>
                    {item.calendarContext.matchedEventTitle && (
                      <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                        Possible match: <strong>{item.calendarContext.matchedEventTitle}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI Draft */}
            {item.draftBody && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI-Generated Draft:
                </p>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{item.draftBody}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button 
                size="sm" 
                onClick={() => onApprove(item)}
                className="gap-1"
              >
                <Send className="h-3 w-3" />
                Send as-is
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onEdit(item)}
                className="gap-1"
              >
                <Edit2 className="h-3 w-3" />
                Edit & Send
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onReject(item)}
                className="gap-1 text-muted-foreground"
              >
                <X className="h-3 w-3" />
                Dismiss
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function ReviewQueue({ workspaceId, userId }: ReviewQueueProps) {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ReviewQueueItem | null>(null);
  const [editedBody, setEditedBody] = useState('');

  const { execute: approveItem, status: approveStatus } = useAction(approveReviewItemAction, {
    onSuccess: () => {
      toast.success('Reply sent successfully');
      refreshQueue();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to send reply');
    },
  });

  const { execute: rejectItem, status: rejectStatus } = useAction(rejectReviewItemAction, {
    onSuccess: () => {
      toast.success('Item dismissed');
      refreshQueue();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to dismiss');
    },
  });

  const refreshQueue = useCallback(async () => {
    try {
      setLoading(true);
      const queueItems = await getReviewQueue(workspaceId, userId);
      setItems(queueItems);
    } catch (error) {
      console.error('Failed to load review queue:', error);
      toast.error('Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, userId]);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  const handleApprove = (item: ReviewQueueItem) => {
    approveItem({
      workspaceId,
      messageId: item.messageId,
      draftId: item.draftId,
      action: 'approve',
    });
  };

  const handleReject = (item: ReviewQueueItem) => {
    rejectItem({
      workspaceId,
      messageId: item.messageId,
      action: 'rejected',
    });
  };

  const handleEdit = (item: ReviewQueueItem) => {
    setEditingItem(item);
    setEditedBody(item.draftBody || '');
  };

  const handleSendEdited = () => {
    if (!editingItem) return;
    
    approveItem({
      workspaceId,
      messageId: editingItem.messageId,
      draftId: editingItem.draftId,
      action: 'edit_and_send',
      editedBody,
    });

    setEditingItem(null);
    setEditedBody('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Check className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium">All caught up!</h3>
        <p className="text-muted-foreground">
          No messages need your review right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Needs Your Review
          </h2>
          <p className="text-sm text-muted-foreground">
            These messages require human verification before sending
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {items.map((item) => (
        <ReviewQueueItem
          key={item.id}
          item={item}
          onApprove={handleApprove}
          onReject={handleReject}
          onEdit={handleEdit}
        />
      ))}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Reply</DialogTitle>
            <DialogDescription>
              Edit the AI-generated draft before sending
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">Replying to:</span>{' '}
                {editingItem.senderName || editingItem.senderEmail}
              </div>
              <div className="text-sm">
                <span className="font-medium">Subject:</span>{' '}
                {editingItem.subject}
              </div>
              
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={10}
                placeholder="Edit your reply..."
                className="font-mono text-sm"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEdited}
              disabled={!editedBody.trim() || approveStatus === 'executing'}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Edited Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Review Queue Badge - Shows count of items needing review
 */
export function ReviewQueueBadge({ 
  count, 
  onClick 
}: { 
  count: number; 
  onClick?: () => void;
}) {
  if (count === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="relative gap-2"
    >
      <AlertCircle className="h-4 w-4 text-amber-500" />
      <span className="text-sm">Review Queue</span>
      <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
        {count}
      </Badge>
    </Button>
  );
}

