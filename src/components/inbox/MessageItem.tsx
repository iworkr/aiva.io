/**
 * MessageItem Component
 * Individual message card with AI insights
 */

'use client';

import React, { useState, memo } from 'react';
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
  ShieldAlert,
} from 'lucide-react';
import {
  markMessageAsReadAction,
  markMessageAsUnreadAction,
  starMessageAction,
  archiveMessageAction,
  unarchiveMessageAction,
} from '@/data/user/messages';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PriorityBadge, CategoryBadge, SentimentBadge } from './ClassificationBadges';
import { QuickReply } from './QuickReply';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getIntegrationById } from '@/lib/integrations/config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MessageItemProps {
  message: any;
  workspaceId: string;
  onUpdate: () => void;
  selectedChannel?: string | null;
}

export const MessageItem = memo(function MessageItem({ message, workspaceId, onUpdate, selectedChannel }: MessageItemProps) {
  const router = useRouter();
  const [isStarred, setIsStarred] = useState(message.is_starred || false);
  const [isQuickReplyExpanded, setIsQuickReplyExpanded] = useState(false);

  // Mark as read action with optimistic update
  const { execute: markAsRead } = useAction(markMessageAsReadAction, {
    onSuccess: () => {
      toast.success('Marked as read');
      onUpdate();
    },
    onError: () => {
      toast.error('Failed to mark as read');
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

  // Star action with optimistic update
  const { execute: toggleStar } = useAction(starMessageAction, {
    onSuccess: () => {
      // Already optimistically updated
      toast.success(isStarred ? 'Unstarred' : 'Starred');
      onUpdate();
    },
    onError: () => {
      // Revert optimistic update on error
      setIsStarred(message.is_starred || false);
      toast.error('Failed to update star status');
    },
  });

  // Archive action
  const { execute: archive } = useAction(archiveMessageAction, {
    onSuccess: () => {
      // Show toast with undo option
      toast.success('Conversation archived', {
        action: {
          label: 'Undo',
          onClick: () => {
            unarchive({ id: message.id, workspaceId });
          },
        },
      });
      onUpdate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to archive conversation');
    },
  });

  // Unarchive action used by toast "Undo"
  const { execute: unarchive } = useAction(unarchiveMessageAction, {
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to undo archive');
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
    // Optimistic update
    setIsStarred(!isStarred);
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

  // Get provider logo URL from integrations config
  const getProviderLogo = () => {
    const provider = message.channel_connection?.provider;
    if (!provider) return null;
    const integration = getIntegrationById(provider.toLowerCase());
    return integration?.logoUrl || null;
  };

  // Check if we're in "All Inboxes" view (no specific channel selected)
  const isAllInboxes = !selectedChannel;

  // Simple markdown parser - converts **text** to bold
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const timestamp = message.timestamp ? new Date(message.timestamp) : new Date(message.created_at || new Date());
  const isToday = new Date().toDateString() === timestamp.toDateString();
  const timeString = isToday
    ? format(timestamp, 'h:mm a')
    : formatDistanceToNow(timestamp, { addSuffix: true });

  const senderDisplay =
    message.sender_name || message.sender_email || 'Sender';

  const senderInitial =
    typeof senderDisplay === 'string' && senderDisplay.length > 0
      ? senderDisplay.charAt(0).toUpperCase()
      : 'S';

  const senderAvatarUrl =
    (message as any).sender_avatar_url && typeof (message as any).sender_avatar_url === 'string'
      ? ((message as any).sender_avatar_url as string)
      : undefined;

  // Robust HTML sanitization - strips all HTML tags and entities
  const stripHtml = (input: string | null | undefined): string => {
    if (!input) return '';
    return input
      // Remove all HTML tags including doctype, comments, scripts, styles
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z]+;/gi, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Mask sensitive content (OTPs, passwords, verification codes)
  const maskSensitiveContent = (text: string): { masked: string; hasMaskedContent: boolean } => {
    const sensitivePatterns = [
      /\b(OTP|code|verification|pin)[\s:]*\d{4,8}\b/gi,
      /\b(password|pwd|pass)[\s:]*\S+\b/gi,
      /\b\d{4,8}\s*(is your|is the|code)\b/gi,
    ];
    let maskedText = text;
    let hasMaskedContent = false;
    for (const pattern of sensitivePatterns) {
      if (pattern.test(maskedText)) {
        hasMaskedContent = true;
      }
      maskedText = maskedText.replace(pattern, '••••••');
    }
    return { masked: maskedText, hasMaskedContent };
  };

  // Priority: AI summary > snippet > body
  // Show shimmer if summary is being generated (no summary yet, but has body)
  const hasAISummary = Boolean(message.ai_summary_short);
  const isPendingSummary = !hasAISummary && Boolean(message.body);
  
  // Apply HTML stripping to both snippet and body, then mask sensitive content
  const rawSnippet = message.ai_summary_short || message.snippet || message.body || '';
  const cleanedSnippet = stripHtml(rawSnippet).substring(0, 200);
  const { masked: safeSnippet, hasMaskedContent } = maskSensitiveContent(cleanedSnippet);
  const displaySnippet = safeSnippet || 'No preview available';

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative cursor-pointer px-6 py-4 transition-colors border-b',
        !message.is_read
          ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary'
          : 'hover:bg-muted/40'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Sender Avatar */}
        <div className="mt-1 flex-shrink-0 relative">
          <Avatar className="h-8 w-8">
            {senderAvatarUrl && (
              <AvatarImage
                src={senderAvatarUrl}
                alt={senderDisplay}
              />
            )}
            <AvatarFallback className="text-xs font-medium">
              {senderInitial}
            </AvatarFallback>
          </Avatar>
          {/* Unread indicator dot */}
          {!message.is_read && (
            <span 
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
              aria-label="Unread message"
            />
          )}
        </div>

        {/* Message content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {/* Provider logo - only shown in All Inboxes view */}
              {isAllInboxes && getProviderLogo() && (
                <img 
                  src={getProviderLogo()!} 
                  alt={getProviderName() || 'Provider'} 
                  className="h-4 w-4 flex-shrink-0 rounded-sm"
                />
              )}
              <span
                className={cn(
                  'truncate text-sm',
                  !message.is_read ? 'font-semibold' : 'font-medium'
                )}
              >
                {message.sender_name || message.sender_email}
              </span>
              {message.priority && <PriorityBadge priority={message.priority} />}
            </div>

            <div className="flex items-center gap-2">
              {/* Sensitive content shield - moved to header next to timestamp */}
              {hasMaskedContent && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-shrink-0">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" aria-label="Contains masked sensitive content" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Sensitive content (codes, passwords) hidden for security</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="text-xs text-muted-foreground">{timeString}</span>
              
              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="More message actions"
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
              !message.is_read ? 'font-semibold' : 'text-muted-foreground'
            )}
          >
            {message.subject || '(no subject)'}
          </div>

          {/* Snippet/AI Summary with markdown formatting */}
          {isPendingSummary ? (
            <div className="mt-1.5 space-y-1.5">
              <div className="h-4 w-full rounded bg-muted/60 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent animate-shimmer" />
              </div>
              <div className="h-4 w-3/4 rounded bg-muted/60 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent animate-shimmer" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          ) : (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {hasAISummary && <Sparkles className="inline h-3 w-3 mr-1 text-primary/60" aria-hidden="true" />}
            {parseMarkdown(displaySnippet)}
          </p>
          )}

          {/* AI Classifications & Quick Actions Row */}
          <div className="mt-3 flex items-center justify-between gap-2">
            {/* Left: Classification badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {message.ai_summary && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                </div>
              )}
              {message.category && (
                <CategoryBadge 
                  category={message.category} 
                  confidenceScore={message.confidence_score}
                />
              )}
              {message.sentiment && <SentimentBadge sentiment={message.sentiment} />}
              {message.actionability === 'requires_urgent_action' && (
                <Badge variant="destructive" className="text-xs py-0 h-5">
                  <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                  Urgent
                </Badge>
              )}
              {message.actionability === 'requires_action' && (
                <Badge variant="secondary" className="text-xs py-0 h-5">
                  <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                  Action
                </Badge>
              )}
            </div>

            {/* Right: Quick Reply button (only when collapsed) */}
            {message.channel_connection?.provider && 
             (message.channel_connection.provider === 'gmail' || 
              message.channel_connection.provider === 'outlook') && 
             !isQuickReplyExpanded && (
              <QuickReply
                messageId={message.id}
                workspaceId={workspaceId}
                messageSubject={message.subject || '(no subject)'}
                senderEmail={message.sender_email}
                provider={message.channel_connection.provider}
                providerMessageId={message.provider_message_id}
                onSent={onUpdate}
                isExpanded={isQuickReplyExpanded}
                onExpandedChange={setIsQuickReplyExpanded}
                renderMode="button"
              />
            )}
          </div>

          {/* Expanded Quick Reply (full width, below the badges row) */}
          {message.channel_connection?.provider && 
           (message.channel_connection.provider === 'gmail' || 
            message.channel_connection.provider === 'outlook') && 
           isQuickReplyExpanded && (
            <QuickReply
              messageId={message.id}
              workspaceId={workspaceId}
              messageSubject={message.subject || '(no subject)'}
              senderEmail={message.sender_email}
              provider={message.channel_connection.provider}
              providerMessageId={message.provider_message_id}
              onSent={() => {
                setIsQuickReplyExpanded(false);
                onUpdate();
              }}
              isExpanded={isQuickReplyExpanded}
              onExpandedChange={setIsQuickReplyExpanded}
              renderMode="content"
            />
          )}
        </div>
      </div>
    </div>
  );
});


