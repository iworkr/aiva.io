/**
 * ThreadMessage Component
 * Individual message display within a conversation thread
 * Minimalist design with compact sender info
 */

'use client';

import { memo, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Sparkles, Mail, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge, CategoryBadge, SentimentBadge } from './ClassificationBadges';

interface ThreadMessageProps {
  message: {
    id: string;
    subject?: string | null;
    body?: string | null;
    body_html?: string | null;
    sender_name?: string | null;
    sender_email: string;
    timestamp: string;
    is_read?: boolean | null;
    priority?: string | null;
    category?: string | null;
    sentiment?: string | null;
    ai_summary?: string | null;
    ai_key_points?: string[] | null;
    direction?: 'inbound' | 'outbound' | null;
  };
  isCurrentMessage?: boolean;
  isOutbound?: boolean;
  userEmail?: string;
}

/**
 * Basic HTML sanitizer
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/<(iframe|object|embed|form)[^>]*>.*?<\/\1>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  return sanitized;
}

function stripHtml(input: string | null | undefined): string {
  return input ? input.replace(/<[^>]+>/g, '').trim() : '';
}

/**
 * Convert URLs in text to clickable hyperlinks
 */
function linkifyText(text: string): string {
  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  return text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">$1</a>');
}

/**
 * Convert markdown-style formatting to HTML
 * Supports: **bold**, *italic*, __underline__, ~~strikethrough~~
 */
function formatMarkdown(text: string): string {
  let formatted = text;
  
  // Bold: **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>');
  
  // Italic: *text* (but not inside URLs or already processed bold)
  // Use negative lookbehind/lookahead to avoid matching inside other tags
  formatted = formatted.replace(/(?<![*<])\*([^*\n]+?)\*(?![*>])/g, '<em class="italic">$1</em>');
  
  // Strikethrough: ~~text~~
  formatted = formatted.replace(/~~(.+?)~~/g, '<del class="line-through opacity-70">$1</del>');
  
  // Code: `text`
  formatted = formatted.replace(/`([^`\n]+?)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-sm font-mono">$1</code>');
  
  return formatted;
}

export const ThreadMessage = memo(function ThreadMessage({
  message,
  isCurrentMessage = false,
  isOutbound = false,
  userEmail,
}: ThreadMessageProps) {
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [showFullContent, setShowFullContent] = useState(isCurrentMessage);

  // Determine if this message is from the user
  const isFromUser = useMemo(() => {
    if (isOutbound) return true;
    if (message.direction === 'outbound') return true;
    if (userEmail && message.sender_email?.toLowerCase() === userEmail.toLowerCase()) return true;
    return false;
  }, [isOutbound, message.direction, message.sender_email, userEmail]);

  // Get display name
  const displayName = isFromUser 
    ? 'You' 
    : (message.sender_name || message.sender_email?.split('@')[0] || 'Unknown');

  // Get avatar initials
  const initials = displayName === 'You' 
    ? 'Y' 
    : displayName.slice(0, 2).toUpperCase();

  // Format timestamp
  const timestamp = new Date(message.timestamp);
  const formattedTime = format(timestamp, 'MMM d, yyyy h:mm a');

  // Get content
  const hasHtmlContent = useMemo(() => {
    const body = message.body_html || message.body || '';
    return /<[a-z][\s\S]*>/i.test(body);
  }, [message.body_html, message.body]);

  const plainTextContent = useMemo(() => {
    const body = message.body || message.body_html || '';
    return stripHtml(body);
  }, [message.body, message.body_html]);

  const sanitizedHtmlContent = useMemo(() => {
    const body = message.body_html || message.body || '';
    return sanitizeHtml(body);
  }, [message.body_html, message.body]);

  // Truncate content for non-current messages
  const shouldTruncate = !isCurrentMessage && !showFullContent && plainTextContent.length > 200;
  const displayContent = shouldTruncate 
    ? plainTextContent.slice(0, 200) + '...' 
    : plainTextContent;

  const hasAiInsights = message.ai_summary || (message.ai_key_points && message.ai_key_points.length > 0);

  return (
    <div
      className={cn(
        'group relative rounded-lg border transition-all',
        isCurrentMessage
          ? 'border-primary/30 bg-primary/5 shadow-sm'
          : 'border-border/40 bg-card/50 hover:border-border/60',
        isFromUser && 'ml-8'
      )}
    >
      {/* Message Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        {/* Avatar */}
        <Avatar className={cn('h-8 w-8 flex-shrink-0', isFromUser && 'bg-primary/20')}>
          <AvatarFallback className={cn(
            'text-xs font-medium',
            isFromUser ? 'bg-primary/20 text-primary' : 'bg-muted'
          )}>
            {isFromUser ? <Send className="h-3.5 w-3.5" /> : initials}
          </AvatarFallback>
        </Avatar>

        {/* Sender & Time */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'font-medium text-sm',
              isFromUser && 'text-primary'
            )}>
              {displayName}
            </span>
            {!isFromUser && message.sender_email && (
              <span className="text-xs text-muted-foreground truncate">
                &lt;{message.sender_email}&gt;
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              • {formattedTime}
            </span>
          </div>

          {/* Badges - only show on current message */}
          {isCurrentMessage && (message.priority || message.category || message.sentiment) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {message.priority && <PriorityBadge priority={message.priority} />}
              {message.category && <CategoryBadge category={message.category} />}
              {message.sentiment && <SentimentBadge sentiment={message.sentiment} />}
            </div>
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className="px-4 pb-3 pl-[52px] overflow-hidden">
        {isCurrentMessage && hasHtmlContent ? (
          <div 
            className="prose prose-sm max-w-none dark:prose-invert text-foreground overflow-x-auto break-words [&_a]:text-primary [&_a]:break-all [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:max-w-full [&_table]:overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: sanitizedHtmlContent }}
          />
        ) : (
          <div 
            className="text-sm text-foreground/90 whitespace-pre-wrap break-words overflow-wrap-anywhere"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(linkifyText(displayContent)) }}
          />
        )}

        {/* Show more/less for truncated messages */}
        {!isCurrentMessage && plainTextContent.length > 200 && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary mt-1"
            onClick={() => setShowFullContent(!showFullContent)}
          >
            {showFullContent ? 'Show less' : 'Show more'}
          </Button>
        )}

        {/* AI Insights (collapsible, only on current message) */}
        {isCurrentMessage && hasAiInsights && (
          <Collapsible open={showAiInsights} onOpenChange={setShowAiInsights}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 mt-3 text-xs text-muted-foreground hover:text-primary gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Insights
                {showAiInsights ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-md bg-muted/50 space-y-2">
                {message.ai_summary && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Summary</h4>
                    <p className="text-sm">{message.ai_summary}</p>
                  </div>
                )}
                {message.ai_key_points && message.ai_key_points.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Key Points</h4>
                    <ul className="list-disc list-inside text-sm space-y-0.5">
                      {message.ai_key_points.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
});

