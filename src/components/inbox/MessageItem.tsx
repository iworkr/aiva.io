/**
 * MessageItem Component
 * Individual message card with AI insights
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mail,
  MailOpen,
  Star,
  Archive,
  MoreVertical,
  Sparkles,
  Clock,
  AlertCircle,
  MessageSquare,
  Linkedin,
  Instagram,
  Facebook,
} from 'lucide-react';
import {
  markMessageAsReadAction,
  markMessageAsUnreadAction,
  starMessageAction,
  archiveMessageAction,
} from '@/data/user/messages';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PriorityBadge, CategoryBadge, SentimentBadge } from './ClassificationBadges';
import { QuickReply } from './QuickReply';

interface MessageItemProps {
  message: any;
  workspaceId: string;
  onUpdate: () => void;
}

export function MessageItem({ message, workspaceId, onUpdate }: MessageItemProps) {
  const router = useRouter();
  const [isStarred, setIsStarred] = useState(message.starred);

  // Mark as read action
  const { execute: markAsRead } = useAction(markMessageAsReadAction, {
    onSuccess: () => {
      toast.success('Marked as read');
      onUpdate();
    },
  });

  // Mark as unread action
  const { execute: markAsUnread } = useAction(markMessageAsUnreadAction, {
    onSuccess: () => {
      toast.success('Marked as unread');
      onUpdate();
    },
  });

  // Star action
  const { execute: toggleStar } = useAction(starMessageAction, {
    onSuccess: () => {
      setIsStarred(!isStarred);
      toast.success(isStarred ? 'Unstarred' : 'Starred');
      onUpdate();
    },
  });

  // Archive action
  const { execute: archive } = useAction(archiveMessageAction, {
    onSuccess: () => {
      toast.success('Archived');
      onUpdate();
    },
  });

  const handleClick = () => {
    // Mark as read if unread
    if (!message.is_read) {
      markAsRead({ id: message.id, workspaceId });
    }
    // Navigate to message detail
    router.push(`/inbox/${message.id}`);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar({ id: message.id, workspaceId });
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead({ id: message.id, workspaceId });
  };

  const handleMarkAsUnread = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsUnread({ id: message.id, workspaceId });
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    archive({ id: message.id, workspaceId });
  };

  // Get provider icon
  const getProviderIcon = () => {
    const provider = message.channel_connection?.provider;
    if (!provider) return null;

    const icons: Record<string, any> = {
      gmail: Mail,
      outlook: Mail,
      slack: MessageSquare,
      teams: MessageSquare,
      whatsapp: MessageSquare,
      instagram: Instagram,
      linkedin: Linkedin,
      facebook_messenger: Facebook,
    };

    const Icon = icons[provider.toLowerCase()] || Mail;
    return <Icon className="h-4 w-4" />;
  };

  // Get provider name
  const getProviderName = () => {
    const provider = message.channel_connection?.provider;
    if (!provider) return null;

    const names: Record<string, string> = {
      gmail: 'Gmail',
      outlook: 'Outlook',
      slack: 'Slack',
      teams: 'Microsoft Teams',
      whatsapp: 'WhatsApp',
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      facebook_messenger: 'Facebook Messenger',
    };

    return names[provider.toLowerCase()] || provider;
  };

  const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
  const isToday = new Date().toDateString() === timestamp.toDateString();
  const timeString = isToday
    ? format(timestamp, 'h:mm a')
    : formatDistanceToNow(timestamp, { addSuffix: true });

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative cursor-pointer px-6 py-4 transition-colors hover:bg-muted/50 border-b animated-border',
        !message.is_read && 'bg-muted/20'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Channel Icon */}
        <div className="mt-1 flex-shrink-0">
          {getProviderIcon() ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              {getProviderIcon()}
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Message content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  'truncate text-sm',
                  !message.is_read ? 'font-semibold' : 'font-medium'
                )}
              >
                {message.sender_name || message.sender_email}
              </span>
              {getProviderName() && (
                <span className="text-xs text-muted-foreground">
                  • {getProviderName()}
                </span>
              )}
              {message.priority && <PriorityBadge priority={message.priority} />}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{timeString}</span>
              
              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {message.is_read ? (
                    <DropdownMenuItem onClick={handleMarkAsUnread}>
                      <Mail className="mr-2 h-4 w-4" />
                      Mark as unread
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleMarkAsRead}>
                      <MailOpen className="mr-2 h-4 w-4" />
                      Mark as read
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Subject */}
          <div
            className={cn(
              'mt-1 truncate text-sm',
              !message.is_read ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {message.subject || '(no subject)'}
          </div>

          {/* Snippet */}
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {message.snippet || message.body?.substring(0, 200) || 'No preview available'}
          </p>

          {/* AI Classifications */}
          {(message.category || message.sentiment || message.actionability) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {message.ai_summary && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>AI analyzed</span>
                </div>
              )}
              {message.category && <CategoryBadge category={message.category} />}
              {message.sentiment && <SentimentBadge sentiment={message.sentiment} />}
              {message.actionability === 'requires_urgent_action' && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Urgent Action
                </Badge>
              )}
              {message.actionability === 'requires_action' && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  Action Needed
                </Badge>
              )}
            </div>
          )}

          {/* Quick Reply */}
          {message.channel_connection?.provider && 
           (message.channel_connection.provider === 'gmail' || 
            message.channel_connection.provider === 'outlook') && (
            <QuickReply
              messageId={message.id}
              workspaceId={workspaceId}
              messageSubject={message.subject || '(no subject)'}
              senderEmail={message.sender_email}
              provider={message.channel_connection.provider}
              providerMessageId={message.provider_message_id}
              onSent={onUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}


