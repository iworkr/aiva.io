/**
 * MockDraftReply - Marketing UI Component
 * AI-generated reply with typing animation
 */

'use client';

import { cn } from '@/lib/utils';
import { Sparkles, Send, Edit, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface MockDraftReplyProps {
  replyText: string;
  recipientName?: string;
  confidence?: number;
  tone?: string;
  className?: string;
  animate?: boolean;
  typingSpeed?: number;
  onSend?: () => void;
  onEdit?: () => void;
}

export function MockDraftReply({
  replyText,
  recipientName = 'Sarah',
  confidence = 0.92,
  tone = 'Professional',
  className,
  animate = false,
  typingSpeed = 35, // Slower, more readable typing
  onSend,
  onEdit,
}: MockDraftReplyProps) {
  const [displayedText, setDisplayedText] = useState(animate ? '' : replyText);
  const [isTyping, setIsTyping] = useState(animate);
  const [showActions, setShowActions] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setDisplayedText(replyText);
      setShowActions(true);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);
    setShowActions(false);

    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex < replyText.length) {
        setDisplayedText(replyText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        setTimeout(() => setShowActions(true), 300);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [animate, replyText, typingSpeed]);

  const confidenceColor =
    confidence >= 0.85
      ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
      : confidence >= 0.7
      ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden shadow-lg',
        animate && 'animate-in fade-in slide-in-from-bottom-4 duration-500',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">AI Draft Reply</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full', confidenceColor)}>
            {Math.round(confidence * 100)}% confident
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {tone}
          </span>
        </div>
      </div>

      {/* Reply Content */}
      <div className="p-4">
        <div className="text-xs text-muted-foreground mb-2">
          To: {recipientName}
        </div>
        <div className="min-h-[120px] text-sm leading-relaxed">
          {displayedText}
          {isTyping && (
            <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
          )}
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Confidence</span>
          <span className="ml-auto">{Math.round(confidence * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-out',
              confidence >= 0.85
                ? 'bg-green-500'
                : confidence >= 0.7
                ? 'bg-yellow-500'
                : 'bg-orange-500'
            )}
            style={{
              width: showActions ? `${confidence * 100}%` : '0%',
            }}
          />
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 p-4 pt-2 border-t animate-in fade-in duration-300">
          <Button onClick={onSend} className="flex-1 gap-2">
            <Send className="w-4 h-4" />
            Send Reply
          </Button>
          <Button variant="outline" size="icon" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default MockDraftReply;

