/**
 * AutoReplyVignette - Marketing Feature Vignette
 * Shows AI drafting and sending a reply automatically
 */

'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback, useRef } from 'react';
import { MockEmailCard } from '../base/MockEmailCard';
import { MockDraftReply } from '../base/MockDraftReply';
import { FloatingBadge } from '../base/FloatingBadge';
import { GlowingCard } from '../base/GlowingCard';
import { Sparkles, Send, CheckCircle, Zap } from 'lucide-react';

interface AutoReplyVignetteProps {
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  compact?: boolean;
}

const incomingEmail = {
  sender: {
    name: 'Mike Chen',
    email: 'mike@startup.io',
  },
  subject: 'Quick question about the proposal',
  snippet:
    'Hey! I was reviewing your proposal and had a quick question. Are you available for a 30-minute call this Thursday or Friday afternoon?',
  timestamp: 'Just now',
  isUnread: true,
  priority: 'high' as const,
};

const replyText = `Hi Mike,

Thanks for reaching out! I'd be happy to discuss the pricing section with you.

I'm available Thursday at 2pm or Friday at 3pm. Let me know which works better for you, and I'll send over a calendar invite.

Best regards`;

type AnimationPhase = 'email-arrive' | 'analyzing' | 'typing' | 'complete' | 'sent';

export function AutoReplyVignette({
  className,
  autoPlay = true,
  loop = true,
  compact = false,
}: AutoReplyVignetteProps) {
  const [phase, setPhase] = useState<AnimationPhase>('email-arrive');
  const [showTyping, setShowTyping] = useState(false);
  const animationRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  }, []);

  const runAnimation = useCallback(() => {
    clearTimers();
    
    // Reset
    setPhase('email-arrive');
    setShowTyping(false);

    // Phase 2: Analyzing
    animationRef.current.push(setTimeout(() => setPhase('analyzing'), 3000));

    // Phase 3: Start typing
    animationRef.current.push(setTimeout(() => {
      setPhase('typing');
      setShowTyping(true);
    }, 5000));

    // Phase 4: Complete typing
    animationRef.current.push(setTimeout(() => setPhase('complete'), 9500));

    // Phase 5: Sent
    animationRef.current.push(setTimeout(() => setPhase('sent'), 12000));
  }, [clearTimers]);

  useEffect(() => {
    if (autoPlay) {
      runAnimation();

      if (loop) {
        const interval = setInterval(runAnimation, 16000);
        return () => {
          clearInterval(interval);
          clearTimers();
        };
      }
    }
    return clearTimers;
  }, [autoPlay, loop, runAnimation, clearTimers]);

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Header badge - overlapping */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30">
        <FloatingBadge
          label={phase === 'sent' ? 'Sent!' : 'Smart Auto-Reply'}
          icon={phase === 'sent' ? CheckCircle : Zap}
          variant={phase === 'sent' ? 'success' : 'primary'}
          size="md"
          glow
          pulse={phase === 'analyzing' || phase === 'typing'}
        />
      </div>

      <div className="w-full pt-6 space-y-4">
        {/* Incoming Email */}
        <GlowingCard
          glowColor="info"
          glowIntensity="subtle"
          hoverEffect={false}
        >
          <div className="p-4 relative">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Incoming</span>
              {phase === 'analyzing' && (
                <span className="text-xs text-primary font-medium animate-pulse ml-auto flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI analyzing...
                </span>
              )}
            </div>
            <MockEmailCard
              {...incomingEmail}
              className="text-sm"
            />
          </div>
        </GlowingCard>

        {/* AI Draft Reply */}
        {(phase === 'typing' || phase === 'complete' || phase === 'sent') && (
          <div className="relative">
            <GlowingCard
              glowColor={phase === 'sent' ? 'success' : 'primary'}
              glowIntensity="medium"
              hoverEffect={false}
            >
              <div className="p-4 relative">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Draft</span>
                  {phase === 'typing' && (
                    <span className="ml-auto text-xs text-muted-foreground animate-pulse">
                      Drafting reply...
                    </span>
                  )}
                </div>

                <MockDraftReply
                  replyText={replyText}
                  recipientName="Mike"
                  confidence={0.94}
                  tone="Professional"
                  animate={phase === 'typing' && showTyping}
                  typingSpeed={30}
                />

                {/* Sent overlay */}
                {phase === 'sent' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 backdrop-blur-sm rounded-xl">
                    <div className="flex flex-col items-center gap-3 text-green-700 dark:text-green-400">
                      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <Send className="w-10 h-10" />
                      </div>
                      <span className="text-xl font-bold">Sent Successfully!</span>
                      <span className="text-sm text-muted-foreground">94% confidence</span>
                    </div>
                  </div>
                )}
              </div>
            </GlowingCard>

            {/* Confidence badge - overlapping */}
            {phase === 'complete' && (
              <div className="absolute -bottom-3 -right-3 z-20 animate-in zoom-in duration-300">
                <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  94% Confident
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact mode placeholder during analyzing */}
        {compact && phase === 'analyzing' && (
          <div className="flex items-center justify-center gap-2 py-6">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoReplyVignette;
