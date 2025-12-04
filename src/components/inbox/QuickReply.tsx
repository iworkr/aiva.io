/**
 * QuickReply Component
 * Small button that expands to show AI-generated reply with editing capability
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
import { Send, Sparkles, Loader2, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendReplyAction, generateReplyDraftAction } from '@/data/user/messages';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  // Controlled mode - when provided, parent controls expanded state
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  // Render mode - 'button' only shows button, 'content' only shows expanded content, 'full' shows both
  renderMode?: 'button' | 'content' | 'full';
}

export function QuickReply({
  messageId,
  workspaceId,
  messageSubject,
  senderEmail,
  provider,
  providerMessageId,
  onSent,
  isExpanded: controlledExpanded,
  onExpandedChange,
  renderMode = 'full',
}: QuickReplyProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Use controlled or internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const setIsExpanded = (value: boolean) => {
    if (onExpandedChange) {
      onExpandedChange(value);
    } else {
      setInternalExpanded(value);
    }
  };
  const [replyText, setReplyText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasSensitiveContent, setHasSensitiveContent] = useState(false);
  
  // Track toast ID to dismiss it when cancelling
  const draftToastIdRef = useRef<string | number | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    onExecute: () => {
      console.log('[QuickReply] Action executing for message:', messageId);
    },
    onSuccess: ({ data }) => {
      console.log('[QuickReply] Action success, raw response:', data);
      const result = data?.data;
      const body = result?.body;
      const confidence = result?.confidenceScore;
      
      if (body) {
        console.log('[QuickReply] Generated reply body:', body.substring(0, 100) + '...');
        setReplyText(body);
        setConfidenceScore(confidence || null);
        draftToastIdRef.current = toast.success('AI draft ready');
      } else {
        console.warn('[QuickReply] No body in response:', result);
        setReplyText('');
        toast.warning('Could not generate reply. Please type manually.');
      }
      setIsGenerating(false);
      // Focus textarea after generating
      setTimeout(() => textareaRef.current?.focus(), 100);
    },
    onError: ({ error }) => {
      console.error('[QuickReply] Action error:', error);
      toast.error(error.serverError || 'Failed to generate reply. Please try again.');
      setIsGenerating(false);
      setConfidenceScore(null);
    },
  });
  
  // Dismiss toast when collapsing
  useEffect(() => {
    if (!isExpanded && draftToastIdRef.current) {
      toast.dismiss(draftToastIdRef.current);
      draftToastIdRef.current = undefined;
    }
  }, [isExpanded]);

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[QuickReply] Expand clicked, isExpanded:', isExpanded, 'replyText:', replyText);
    if (!isExpanded && !replyText) {
      console.log('[QuickReply] Starting AI generation for message:', messageId, 'workspace:', workspaceId);
      setIsGenerating(true);
      generateDraft({
        messageId,
        workspaceId,
        tone: 'professional',
        maxLength: 300,
      });
    }
    setIsExpanded(true);
  };

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (draftToastIdRef.current) {
      toast.dismiss(draftToastIdRef.current);
      draftToastIdRef.current = undefined;
    }
    setIsExpanded(false);
    setReplyText('');
    setConfidenceScore(null);
  };

  const handleSendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    const isSensitive = containsSensitiveContent(replyText) || containsSensitiveContent(messageSubject);
    setHasSensitiveContent(isSensitive);
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = () => {
    setShowConfirmDialog(false);
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

  // Regenerate the AI reply
  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[QuickReply] Regenerating reply for message:', messageId);
    setIsGenerating(true);
    setReplyText('');
    setConfidenceScore(null);
    generateDraft({
      messageId,
      workspaceId,
      tone: 'professional',
      maxLength: 300,
    });
  };

  // Get confidence badge styling based on score
  const getConfidenceBadgeStyle = (score: number) => {
    if (score >= 0.85) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    } else if (score >= 0.7) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    } else {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  // Button component (used in both modes)
  const renderButton = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpand}
            className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Quick Reply</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Generate AI reply</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // If renderMode is 'button', only show the button (no wrapper)
  if (renderMode === 'button') {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        {renderButton()}
      </div>
    );
  }

  // If renderMode is 'content', only show expanded content when expanded
  if (renderMode === 'content') {
    if (!isExpanded) return null;
    // Fall through to render expanded content below
  }

  // Full mode: collapsed state - small button with wrapper
  if (!isExpanded && renderMode === 'full') {
    return (
      <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
        {renderButton()}
      </div>
    );
  }

  // Don't render anything in content-only mode when not expanded
  if (!isExpanded) return null;

  // Expanded state - reply form
  return (
    <div 
      className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">AI Quick Reply</span>
          {confidenceScore !== null && (
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-semibold',
              getConfidenceBadgeStyle(confidenceScore)
            )}>
              {Math.round(confidenceScore * 100)}% confidence
            </span>
          )}
          {/* Regenerate button */}
          {!isGenerating && replyText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Regenerate reply</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCollapse}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Textarea with loading overlay */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={isGenerating ? "Generating AI reply..." : "Type your reply..."}
          disabled={isGenerating}
          className={cn(
            "min-h-[80px] resize-none text-sm bg-background border-border/50 focus:border-primary/50",
            isGenerating && "opacity-50"
          )}
          onClick={(e) => e.stopPropagation()}
        />
        {/* Loading overlay */}
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCollapse}
          className="h-8 px-3 text-xs"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSendClick}
          disabled={isSending || isGenerating || !replyText.trim()}
          className="h-8 px-3 text-xs gap-1.5"
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {hasSensitiveContent && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Send Reply?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {hasSensitiveContent ? (
                <>
                  <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                    ⚠️ This may contain sensitive content.
                  </p>
                  <p>
                    Please verify this AI-generated reply is appropriate.
                  </p>
                </>
              ) : (
                <p>
                  Please confirm you've reviewed this AI-generated reply.
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
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
