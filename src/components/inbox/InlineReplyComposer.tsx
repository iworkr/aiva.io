/**
 * InlineReplyComposer Component
 * Always-visible reply textarea at the bottom of message detail
 * Includes AI Quick Reply option
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Send, Sparkles, Loader2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendReplyAction, generateReplyDraftAction } from '@/data/user/messages';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

interface InlineReplyComposerProps {
  messageId: string;
  workspaceId: string;
  messageSubject: string;
  senderEmail: string;
  provider: 'gmail' | 'outlook' | 'slack' | 'teams';
  providerMessageId?: string;
  onSent?: () => void;
}

export function InlineReplyComposer({
  messageId,
  workspaceId,
  messageSubject,
  senderEmail,
  provider,
  providerMessageId,
  onSent,
}: InlineReplyComposerProps) {
  const [replyText, setReplyText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Send reply action
  const { execute: sendReply } = useAction(sendReplyAction, {
    onSuccess: () => {
      toast.success('Reply sent successfully');
      setReplyText('');
      setConfidenceScore(null);
      onSent?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to send reply');
      setIsSending(false);
    },
  });

  // Generate AI draft action
  const { execute: generateDraft } = useAction(generateReplyDraftAction, {
    onSuccess: ({ data }) => {
      const result = data?.data;
      const body = result?.body;
      const confidence = result?.confidenceScore;
      const aiError = (result as { error?: string })?.error;

      if (body && body.trim()) {
        setReplyText(body);
        setConfidenceScore(confidence || null);
        toast.success('AI draft generated');
      } else if (aiError) {
        toast.error('AI not available', { description: aiError });
      } else {
        toast.warning('Could not generate reply');
      }
      setIsGenerating(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to generate reply');
      setIsGenerating(false);
    },
  });

  const handleGenerateAI = useCallback(() => {
    if (!messageId || !workspaceId) return;
    setIsGenerating(true);
    setConfidenceScore(null);
    generateDraft({
      messageId,
      workspaceId,
      tone: 'professional',
      maxLength: 300,
    });
  }, [messageId, workspaceId, generateDraft]);

  const handleSendClick = () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = () => {
    setShowConfirmDialog(false);
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

  const handleClear = () => {
    setReplyText('');
    setConfidenceScore(null);
  };

  // Get confidence badge styling
  const getConfidenceBadgeStyle = (score: number) => {
    if (score >= 0.85) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    } else if (score >= 0.7) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    }
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
      <div className="p-4 pb-6">
        {/* Header with AI button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Reply</span>
            {confidenceScore !== null && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                  getConfidenceBadgeStyle(confidenceScore)
                )}
              >
                {Math.round(confidenceScore * 100)}% AI confidence
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Clear button */}
            {replyText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="h-8 w-8 p-0"
                      disabled={isGenerating || isSending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear reply</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Regenerate button */}
            {replyText && !isGenerating && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateAI}
                      className="h-8 w-8 p-0"
                      disabled={isSending}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate AI reply</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* AI Generate button */}
            {!replyText && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGenerating || isSending}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Draft
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Textarea */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={
              isGenerating
                ? 'Generating AI reply...'
                : `Reply to ${senderEmail}...`
            }
            disabled={isGenerating}
            className={cn(
              'min-h-[100px] resize-none pr-20',
              isGenerating && 'opacity-50'
            )}
          />

          {/* Loading overlay */}
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generating...</span>
              </div>
            </div>
          )}

          {/* Send button - positioned inside textarea */}
          <Button
            size="sm"
            onClick={handleSendClick}
            disabled={isSending || isGenerating || !replyText.trim()}
            className="absolute bottom-2 right-2 gap-1.5"
          >
            {isSending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send
              </>
            )}
          </Button>
        </div>

        {/* Replying to indicator */}
        <div className="mt-2 text-xs text-muted-foreground">
          Replying to: <span className="font-medium">{senderEmail}</span>
          {messageSubject && (
            <span className="ml-2 truncate">
              • Re: {messageSubject.replace(/^Re:\s*/i, '')}
            </span>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Reply?</AlertDialogTitle>
            <AlertDialogDescription>
              {confidenceScore !== null ? (
                <span>
                  This AI-generated reply has {Math.round(confidenceScore * 100)}% confidence.
                  Please confirm you've reviewed it before sending.
                </span>
              ) : (
                <span>Please confirm you want to send this reply.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>
              <Send className="mr-2 h-4 w-4" />
              Send Reply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

