/**
 * InboxZeroVignette - Marketing Feature Vignette
 * Shows transformation from cluttered inbox to inbox zero
 */

'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { MockEmailCard } from '../base/MockEmailCard';
import { FloatingBadge } from '../base/FloatingBadge';
import { AnimatedCounter } from '../base/AnimatedCounter';
import { GlowingCard } from '../base/GlowingCard';
import { CheckCircle2, Inbox, Sparkles, Clock, Zap, TrendingUp } from 'lucide-react';
import Image from 'next/image';

interface InboxZeroVignetteProps {
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  compact?: boolean;
}

const clutterEmails = [
  {
    id: '1',
    sender: { name: 'Sarah Johnson', email: 'sarah@acme.com' },
    subject: 'Q4 Budget Review - Action Required',
    snippet: 'Please review the attached budget...',
    priority: 'urgent' as const,
    isUnread: true,
  },
  {
    id: '2',
    sender: { name: 'Mike Chen', email: 'mike@startup.io' },
    subject: 'Partnership Opportunity',
    snippet: 'I think there could be some great synergies...',
    priority: 'high' as const,
    isUnread: true,
  },
  {
    id: '3',
    sender: { name: 'Newsletter', email: 'digest@news.com' },
    subject: 'Your Daily Tech Digest',
    snippet: 'Top stories in tech today...',
    isUnread: true,
  },
  {
    id: '4',
    sender: { name: 'Alex Rivera', email: 'alex@design.co' },
    subject: 'Design Review Feedback',
    snippet: 'Here are the mockups you requested...',
    hasAttachment: true,
    isUnread: true,
  },
  {
    id: '5',
    sender: { name: 'LinkedIn', email: 'notifications@linkedin.com' },
    subject: '5 new connection requests',
    snippet: 'Sarah and 4 others want to connect...',
    isUnread: false,
  },
];

type AnimationPhase = 'idle' | 'cluttered' | 'processing' | 'clearing' | 'zero' | 'stats';

export function InboxZeroVignette({
  className,
  autoPlay = true,
  loop = true,
  compact = false,
}: InboxZeroVignetteProps) {
  const [phase, setPhase] = useState<AnimationPhase>('idle');
  const [visibleEmails, setVisibleEmails] = useState<string[]>([]);
  const [processedCount, setProcessedCount] = useState(0);

  const runAnimation = useCallback(() => {
    // Reset
    setPhase('idle');
    setVisibleEmails([]);
    setProcessedCount(0);

    // Phase 1: Show cluttered inbox (time to see the mess)
    setTimeout(() => {
      setPhase('cluttered');
      setVisibleEmails(clutterEmails.map((e) => e.id));
    }, 500);

    // Phase 2: Start processing (time to see cluttered inbox)
    setTimeout(() => setPhase('processing'), 3500);

    // Phase 3: Clear emails one by one (slower, more satisfying)
    setTimeout(() => {
      setPhase('clearing');
      clutterEmails.forEach((_, index) => {
        setTimeout(() => {
          setVisibleEmails((prev) => prev.slice(1));
          setProcessedCount((prev) => prev + 1);
        }, index * 800); // Slower clearing
      });
    }, 5500);

    // Phase 4: Show inbox zero (after emails clear)
    setTimeout(() => setPhase('zero'), 10000);

    // Phase 5: Show stats (time to enjoy inbox zero)
    setTimeout(() => setPhase('stats'), 11500);
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
          label={phase === 'zero' || phase === 'stats' ? 'Inbox Zero!' : 'Inbox Zero'}
          icon={phase === 'zero' || phase === 'stats' ? CheckCircle2 : Inbox}
          variant={phase === 'zero' || phase === 'stats' ? 'success' : 'primary'}
          size="md"
          glow
          animate={phase !== 'idle'}
          pulse={phase === 'processing' || phase === 'clearing'}
        />
      </div>

      <GlowingCard
        glowColor={phase === 'zero' || phase === 'stats' ? 'success' : 'primary'}
        glowIntensity="medium"
        hoverEffect={false}
        className="pt-6"
      >
        <div className="p-4 min-h-[300px] relative">
          {/* Cluttered inbox state */}
          {(phase === 'cluttered' || phase === 'processing' || phase === 'clearing') && (
            <div className="space-y-2">
              {/* Unread count */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Inbox
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                  {visibleEmails.length} unread
                </span>
              </div>

              {/* Email list */}
              <div className="space-y-2 relative">
                {clutterEmails.map((email, index) => (
                  <div
                    key={email.id}
                    className={cn(
                      'transition-all duration-400',
                      visibleEmails.includes(email.id)
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-full'
                    )}
                  >
                    <MockEmailCard
                      sender={email.sender}
                      subject={email.subject}
                      snippet={email.snippet}
                      priority={email.priority}
                      hasAttachment={email.hasAttachment}
                      isUnread={email.isUnread}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Processing overlay */}
              {phase === 'processing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-xl animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <Image
                        src="/logos/aiva-mark.svg"
                        width={48}
                        height={48}
                        alt="Aiva"
                        className="animate-pulse"
                      />
                    </div>
                    <span className="text-sm font-medium">Aiva is handling your inbox...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inbox Zero state */}
          {(phase === 'zero' || phase === 'stats') && (
            <div className="flex flex-col items-center justify-center min-h-[260px] animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-1">
                Inbox Zero! 🎉
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Aiva handled all your messages. Nothing needs your attention.
              </p>

              {/* Stats */}
              {phase === 'stats' && (
                <div className="grid grid-cols-3 gap-4 mt-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-center p-3 rounded-lg bg-primary/5">
                    <div className="text-2xl font-bold text-primary">
                      <AnimatedCounter value={127} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Handled Today</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/5">
                    <div className="text-2xl font-bold text-green-600">
                      <AnimatedCounter value={23} suffix="m" />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Time Saved</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-500/5">
                    <div className="text-2xl font-bold text-amber-600">
                      <AnimatedCounter value={34} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Auto-Replies</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing counter */}
          {phase === 'clearing' && processedCount > 0 && (
            <div className="absolute bottom-4 right-4 animate-in fade-in duration-200">
              <FloatingBadge
                label={`${processedCount} handled`}
                icon={Zap}
                variant="success"
                size="sm"
              />
            </div>
          )}
        </div>
      </GlowingCard>
    </div>
  );
}

export default InboxZeroVignette;

