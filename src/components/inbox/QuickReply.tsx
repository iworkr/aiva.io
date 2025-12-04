/**
 * QuickReply Component
 * Collapsible AI-generated reply with editing capability
 */

'use client';

import { useState, useRef, useEffect } from 'react';
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
import { ChevronDown, ChevronUp, Send, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendReplyAction, generateReplyDraftAction } from '@/data/user/messages';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

// Keywords that indicate sensitive content in the message
const SENSITIVE_KEYWORDS = [
  'verification code', 'otp', 'one-time password', 'password',
  'pin', 'security code', 'access code', '2fa', 'two-factor',
  'reset link', 'login link', 'confirm your email',
  'account verification', 'verify your', 'confirm your identity',
  'credit card', 'card number', 'cvv', 'expiry', 'ssn',
  'social security', 'bank account', 'routing number',
];

// Check if reply content might contain or reply to sensitive content
function containsSensitiveContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasSensitiveContent, setHasSensitiveContent] = useState(false);
  
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

  const handleSendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    // Check for sensitive content and show confirmation dialog
    const isSensitive = containsSensitiveContent(replyText) || containsSensitiveContent(messageSubject);
    setHasSensitiveContent(isSensitive);
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = () => {
    setShowConfirmDialog(false);
    
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
    <div className="mt-3 border-t pt-3" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="h-9 w-full justify-between text-sm border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 hover:border-primary/60 text-foreground font-medium shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Quick Reply with AI</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
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
                  className="h-9 px-4 border-border/70 hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="default"
                  onClick={handleSendClick}
                  disabled={isSending || !replyText.trim()}
                  className="h-9 px-4 shadow-sm hover:shadow-md transition-shadow"
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {hasSensitiveContent && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Confirm Send AI-Generated Reply
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {hasSensitiveContent ? (
                <>
                  <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                    ⚠️ This message may contain or reference sensitive content (verification codes, passwords, financial information).
                  </p>
                  <p>
                    Please double-check that this AI-generated reply is appropriate and doesn't expose any confidential information.
                  </p>
                </>
              ) : (
                <p>
                  Are you sure you want to send this AI-generated reply? Make sure you've reviewed the content before sending.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSend}
              className={hasSensitiveContent ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
            >
              <Send className="mr-2 h-4 w-4" />
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

