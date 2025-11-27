/**
 * QuickReply Component
 * Collapsible AI-generated reply with editing capability
 */

'use client';

import { useState } from 'react';
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
    },
  });

  const { execute: generateDraft } = useAction(generateReplyDraftAction, {
    onSuccess: ({ data }) => {
      if (data?.data?.body) {
        setReplyText(data.data.body);
        setConfidenceScore(data.data.confidenceScore || null);
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

    setIsSending(true);
    sendReply({
      messageId,
      workspaceId,
      body: replyText.trim(),
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
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={isSending || !replyText.trim()}
                  className="h-8 text-xs"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3 w-3" />
                      Send
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

