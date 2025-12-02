/**
 * QuickReply Component
 * Collapsible AI-generated reply with editing capability
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Send, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendReplyAction, generateReplyDraftAction } from '@/data/user/messages';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

interface QuickReplyProps {
  messageId: string;
  workspaceId: string;
  messageSubject: string;
  senderEmail: string;
  provider: 'gmail' | 'outlook' | 'slack' | 'teams';
  providerMessageId?: string;
  onSent?: () => void;
}

export function QuickReply({
  messageId,
  workspaceId,
  messageSubject,
  senderEmail,
  provider,
  providerMessageId,
  onSent,
}: QuickReplyProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  
  // Track toast ID to dismiss it when cancelling
  const draftToastIdRef = useRef<string | number | undefined>(undefined);

  const { execute: sendReply } = useAction(sendReplyAction, {
    onSuccess: () => {
      toast.success('Reply sent successfully');
      setReplyText('');
      setIsExpanded(false);
      onSent?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to send reply');
      setIsSending(false);
      // Keep reply text so user can retry
    },
  });

  const { execute: generateDraft } = useAction(generateReplyDraftAction, {
    onSuccess: ({ data }) => {
      // Handle both possible data structures: data.data.body or direct body
      const result = data?.data;
      const body = result?.body;
      const confidence = result?.confidenceScore;
      
      if (body) {
        setReplyText(body);
        setConfidenceScore(confidence || null);
        // Store the toast ID so we can dismiss it when cancelling
        draftToastIdRef.current = toast.success('AI draft generated! Review and edit before sending.');
      } else {
        // Draft generated but empty - show placeholder
        setReplyText('');
        toast.info('AI could not generate a draft. Please type your reply manually.');
      }
      setIsGenerating(false);
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Failed to generate reply. You can still type your own reply.'
      );
      setIsGenerating(false);
      setConfidenceScore(null);
    },
  });
  
  // Dismiss the "AI draft generated" toast when the component collapses (cancel)
  useEffect(() => {
    if (!isExpanded && draftToastIdRef.current) {
      toast.dismiss(draftToastIdRef.current);
      draftToastIdRef.current = undefined;
    }
  }, [isExpanded]);

  const handleToggle = () => {
    if (!isExpanded && !replyText) {
      // Generate reply when expanding
      setIsGenerating(true);
      generateDraft({
        messageId,
        workspaceId,
        tone: 'professional',
        maxLength: 300,
      });
    }
    setIsExpanded(!isExpanded);
  };

  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    // Optimistic update - close immediately, show success
    const replyBody = replyText.trim();
    setIsSending(true);
    setIsExpanded(false);
    
    sendReply({
      messageId,
      workspaceId,
      body: replyBody,
      subject: messageSubject.startsWith('Re:') ? messageSubject : `Re: ${messageSubject}`,
      to: [senderEmail],
      provider,
      providerMessageId,
    });
  };

  return (
    <div className="mt-2 border-t pt-2" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="h-8 w-full justify-between text-xs text-muted-foreground hover:text-foreground"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          <span>Quick Reply</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {isGenerating ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Generating AI reply...</span>
            </div>
          ) : (
            <>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply or edit the AI-generated reply..."
                className="min-h-[80px] resize-none text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              {confidenceScore !== null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>AI Confidence: {Math.round(confidenceScore * 100)}%</span>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-1">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    // Dismiss the AI draft toast if it exists
                    if (draftToastIdRef.current) {
                      toast.dismiss(draftToastIdRef.current);
                      draftToastIdRef.current = undefined;
                    }
                    setIsExpanded(false);
                    // Clear the reply text if user cancels
                    setReplyText('');
                    setConfidenceScore(null);
                  }}
                  className="h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="default"
                  onClick={handleSend}
                  disabled={isSending || !replyText.trim()}
                  className="h-9 px-4"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

