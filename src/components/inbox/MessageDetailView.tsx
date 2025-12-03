/**
 * MessageDetailView Component
 * Full message display with AI insights
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabaseUserClientComponent } from '@/supabase-clients/user/supabaseUserClientComponent';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import {
  Mail,
  Calendar,
  User,
  Sparkles,
  MessageSquare,
  Archive,
  Star,
  FileText,
  Code,
} from 'lucide-react';
import { PriorityBadge, CategoryBadge, SentimentBadge } from './ClassificationBadges';
import { AIReplyComposer } from './AIReplyComposer';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  markMessageAsReadAction,
  starMessageAction,
  unstarMessageAction,
  archiveMessageAction,
} from '@/data/user/messages';
import { useAction } from 'next-safe-action/hooks';
import { autoCreateEventFromMessage } from '@/lib/ai/scheduling';

/**
 * Basic HTML sanitizer that removes dangerous tags and attributes
 * For production, consider using DOMPurify
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
  
  // Remove data: URLs in src (potential XSS vector)
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  
  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)[^>]*>.*?<\/\1>/gi, '');
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)[^>]*\/?>/gi, '');
  
  // Remove style tags (can contain expressions in older IE)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Add target="_blank" and rel="noopener noreferrer" to links for security
  sanitized = sanitized.replace(/<a\s+([^>]*href\s*=)/gi, '<a target="_blank" rel="noopener noreferrer" $1');
  
  return sanitized;
}

interface MessageDetailViewProps {
  messageId: string;
  workspaceId: string;
  userId: string;
}

export function MessageDetailView({ messageId, workspaceId, userId }: MessageDetailViewProps) {
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('message');
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showHtmlView, setShowHtmlView] = useState(false);

  // Fetch message
  useEffect(() => {
    const fetchMessage = async () => {
      const supabase = supabaseUserClientComponent;
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          channel_connections(provider, provider_account_name)
        `)
        .eq('id', messageId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error) {
        toast.error('Failed to load message');
        console.error(error);
      } else {
        setMessage(data);
        
        // Mark as read
        if (!data.is_read) {
          markAsRead({ id: messageId, workspaceId });
        }
      }
      
      setLoading(false);
    };

    fetchMessage();
  }, [messageId, workspaceId]);

  // Mark as read
  const { execute: markAsRead } = useAction(markMessageAsReadAction, {
    onSuccess: () => {
      if (message) {
        setMessage({ ...message, is_read: true });
      }
    },
  });

  // Star message
  const { execute: starMessage } = useAction(starMessageAction, {
    onSuccess: () => {
      if (message) {
        setMessage({ ...message, is_starred: true });
        toast.success('Starred');
      }
    },
  });

  // Unstar message
  const { execute: unstarMessage } = useAction(unstarMessageAction, {
    onSuccess: () => {
      if (message) {
        setMessage({ ...message, is_starred: false });
        toast.success('Unstarred');
      }
    },
  });

  // Archive message
  const { execute: archive } = useAction(archiveMessageAction, {
    onSuccess: () => {
      toast.success('Archived');
      window.history.back();
    },
  });

  // Strip HTML utility
  const stripHtml = (input: string | null | undefined) =>
    input ? input.replace(/<[^>]+>/g, '').trim() : '';

  // Determine if message has HTML content - MUST be before early returns
  const hasHtmlContent = useMemo(() => {
    if (!message) return false;
    const body = message?.body_html || message?.body || '';
    return /<[a-z][\s\S]*>/i.test(body);
  }, [message]);

  // Get sanitized HTML content - MUST be before early returns
  const sanitizedHtmlContent = useMemo(() => {
    if (!message) return '';
    const body = message?.body_html || message?.body || '';
    return sanitizeHtml(body);
  }, [message]);

  // Get plain text content - MUST be before early returns
  const plainTextContent = useMemo(() => {
    if (!message) return '';
    const body = message?.body || message?.body_html || '';
    return stripHtml(body);
  }, [message]);

  // Toggle star handler
  const handleToggleStar = () => {
    if (message?.is_starred) {
      unstarMessage({ id: messageId, workspaceId });
    } else {
      starMessage({ id: messageId, workspaceId });
    }
  };

  // Create event from message
  const handleCreateEvent = async () => {
    setCreatingEvent(true);
    try {
      const result = await autoCreateEventFromMessage(messageId, workspaceId, userId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      toast.error('Failed to create event');
      console.error(error);
    } finally {
      setCreatingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Mail className="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading message...</p>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Message not found</h3>
        </div>
      </div>
    );
  }

  const timestamp = new Date(message.timestamp);

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  {message.channel_connections?.provider && (
                    <Badge variant="outline">
                      {message.channel_connections.provider}
                    </Badge>
                  )}
                  {message.priority && <PriorityBadge priority={message.priority} />}
                  {message.category && <CategoryBadge category={message.category} />}
                  {message.sentiment && <SentimentBadge sentiment={message.sentiment} />}
                </div>
                <h1 className="text-2xl font-bold">{message.subject || '(no subject)'}</h1>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleStar}
                  aria-label={message.is_starred ? 'Unstar message' : 'Star message'}
                >
                  <Star
                    className={message.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => archive({ id: messageId, workspaceId })}
                  aria-label="Archive message"
                >
                  <Archive aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Sender info */}
            <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10" aria-hidden="true">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">
                  {message.sender_name || message.sender_email}
                </div>
                <div className="text-sm text-muted-foreground">
                  {message.sender_email}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(timestamp, 'MMM d, yyyy h:mm a')}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4" aria-label="Message view tabs">
                <TabsTrigger value="message" aria-label="View message content">
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Message
                </TabsTrigger>
                {message.ai_summary && (
                  <TabsTrigger value="ai-insights" aria-label="View AI insights">
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    AI Insights
                  </TabsTrigger>
                )}
                <TabsTrigger value="reply" aria-label="Reply to message">
                  <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                  Reply
                </TabsTrigger>
              </TabsList>

            {/* Message content */}
            <TabsContent value="message">
              <Card>
                {/* View toggle for HTML content */}
                {hasHtmlContent && (
                  <div className="flex items-center justify-end gap-2 p-3 border-b bg-muted/30">
                    <span className="text-xs text-muted-foreground mr-2">View:</span>
                    <Toggle
                      size="sm"
                      pressed={!showHtmlView}
                      onPressedChange={() => setShowHtmlView(false)}
                      aria-label="Plain text view"
                      className="h-7 px-2 text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Plain Text
                    </Toggle>
                    <Toggle
                      size="sm"
                      pressed={showHtmlView}
                      onPressedChange={() => setShowHtmlView(true)}
                      aria-label="Formatted HTML view"
                      className="h-7 px-2 text-xs"
                    >
                      <Code className="h-3 w-3 mr-1" />
                      Formatted
                    </Toggle>
                  </div>
                )}
                <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
                  {showHtmlView && hasHtmlContent ? (
                    <div 
                      className="message-html-content text-foreground"
                      dangerouslySetInnerHTML={{ __html: sanitizedHtmlContent }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-foreground">
                      {plainTextContent || '(No message content)'}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick actions */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateEvent}
                  disabled={creatingEvent}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </TabsContent>

            {/* AI Insights */}
            {message.ai_summary && (
              <TabsContent value="ai-insights">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">AI Analysis</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary */}
                    <div>
                      <h4 className="mb-2 font-semibold">Summary</h4>
                      <p className="text-sm text-muted-foreground">{message.ai_summary}</p>
                    </div>

                    <Separator />

                    {/* Key Points */}
                    {message.ai_key_points && message.ai_key_points.length > 0 && (
                      <>
                        <div>
                          <h4 className="mb-2 font-semibold">Key Points</h4>
                          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                            {message.ai_key_points.map((point: string, idx: number) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Classifications */}
                    <div>
                      <h4 className="mb-2 font-semibold">Classifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {message.priority && <PriorityBadge priority={message.priority} />}
                        {message.category && <CategoryBadge category={message.category} />}
                        {message.sentiment && <SentimentBadge sentiment={message.sentiment} />}
                        {message.actionability && (
                          <Badge variant="outline">
                            {message.actionability.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Reply composer */}
            <TabsContent value="reply">
              <AIReplyComposer
                messageId={messageId}
                workspaceId={workspaceId}
                message={message}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

