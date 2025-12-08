/**
 * AutoReplyVignette - Marketing Feature Vignette
 * Shows AI drafting and sending a reply automatically
 */

'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { MockEmailCard } from '../base/MockEmailCard';
import { MockDraftReply } from '../base/MockDraftReply';
import { FloatingBadge } from '../base/FloatingBadge';
import { GlowingCard } from '../base/GlowingCard';
import { Sparkles, Send, CheckCircle, Clock, Zap } from 'lucide-react';

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
    'Hey! I was reviewing your proposal and had a quick question. Are you available for a 30-minute call this Thursday or Friday afternoon? Would love to discuss the pricing section in more detail.',
  timestamp: 'Just now',
  isUnread: true,
  priority: 'high' as const,
};

const replyText = `Hi Mike,

Thanks for reaching out! I'd be happy to discuss the pricing section with you.

I'm available Thursday at 2pm or Friday at 3pm. Let me know which works better for you, and I'll send over a calendar invite.

Looking forward to our conversation!

Best regards`;

type AnimationPhase = 'idle' | 'email-arrive' | 'analyzing' | 'typing' | 'complete' | 'sent';

export function AutoReplyVignette({
  className,
  autoPlay = true,
  loop = true,
  compact = false,
}: AutoReplyVignetteProps) {
  const [phase, setPhase] = useState<AnimationPhase>('idle');
  const [showTyping, setShowTyping] = useState(false);

  const runAnimation = useCallback(() => {
    // Reset
    setPhase('idle');
    setShowTyping(false);

    // Phase 1: Email arrives (time to read incoming email)
    setTimeout(() => setPhase('email-arrive'), 500);

    // Phase 2: Analyzing (time to see email content)
    setTimeout(() => setPhase('analyzing'), 3500);

    // Phase 3: Start typing (time to see analyzing)
    setTimeout(() => {
      setPhase('typing');
      setShowTyping(true);
    }, 5500);

    // Phase 4: Complete typing (wait for typing animation)
    setTimeout(() => setPhase('complete'), 10000);

    // Phase 5: Sent (time to see completed draft)
    setTimeout(() => setPhase('sent'), 12500);
  }, []);

  useEffect(() => {
    if (autoPlay) {
      runAnimation();

      if (loop) {
        const interval = setInterval(runAnimation, 16000);
        return () => clearInterval(interval);
      }
    }
  }, [autoPlay, loop, runAnimation]);

  return (
    <div className={cn('relative', className)}>
      {/* Header badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
        <FloatingBadge
          label={phase === 'sent' ? 'Sent Automatically!' : 'Smart Auto-Reply'}
          icon={phase === 'sent' ? CheckCircle : Zap}
          variant={phase === 'sent' ? 'success' : 'primary'}
          size="md"
          glow
          animate={phase !== 'idle'}
          pulse={phase === 'analyzing' || phase === 'typing'}
        />
      </div>

      <div className={cn('space-y-4 pt-6', compact && 'space-y-3')}>
        {/* Incoming Email */}
        <div className="relative">
          <GlowingCard
            glowColor="info"
            glowIntensity="subtle"
            hoverEffect={false}
            animate={phase === 'email-arrive'}
          >
            <div className="p-3 relative">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-medium text-muted-foreground">Incoming</span>
                {phase === 'analyzing' && (
                  <span className="text-xs text-primary animate-pulse ml-auto">
                    AI analyzing...
                  </span>
                )}
              </div>
              <MockEmailCard
                {...incomingEmail}
                className="text-sm"
                animate={phase === 'email-arrive'}
              />
            </div>
          </GlowingCard>
        </div>

        {/* Typing indicator / Draft */}
        {(phase === 'typing' || phase === 'complete' || phase === 'sent') && (
          <div className="animate-in slide-in-from-bottom-4 duration-700 relative">
            <GlowingCard
              glowColor={phase === 'sent' ? 'success' : 'primary'}
              glowIntensity="subtle"
              hoverEffect={false}
            >
              <div className="p-3 relative">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">AI Draft</span>
                  {phase === 'typing' && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Drafting...
                    </span>
                  )}
                </div>

                <MockDraftReply
                  replyText={replyText}
                  recipientName="Mike"
                  confidence={0.94}
                  tone="Professional"
                  animate={phase === 'typing' && showTyping}
                  typingSpeed={35}
                />

                {/* Sent overlay */}
                {phase === 'sent' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 backdrop-blur-sm rounded-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center gap-2 text-green-700 dark:text-green-400">
                      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <Send className="w-8 h-8" />
                      </div>
                      <span className="font-semibold">Sent Successfully!</span>
                      <span className="text-xs text-muted-foreground">94% confidence</span>
                    </div>
                  </div>
                )}
              </div>
            </GlowingCard>
          </div>
        )}

        {/* Compact mode - condensed view */}
        {compact && phase === 'analyzing' && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoReplyVignette;
