/**
 * InboxZeroVignette - Marketing Feature Vignette
 * Shows transformation from cluttered inbox to inbox zero
 */

'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback, useRef } from 'react';
import { MockEmailCard } from '../base/MockEmailCard';
import { FloatingBadge } from '../base/FloatingBadge';
import { AnimatedCounter } from '../base/AnimatedCounter';
import { GlowingCard } from '../base/GlowingCard';
import { CheckCircle2, Inbox, Sparkles, Zap } from 'lucide-react';

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
];

type AnimationPhase = 'cluttered' | 'processing' | 'clearing' | 'zero' | 'stats';

export function InboxZeroVignette({
  className,
  autoPlay = true,
  loop = true,
  compact = false,
}: InboxZeroVignetteProps) {
  const [phase, setPhase] = useState<AnimationPhase>('cluttered');
  const [visibleEmails, setVisibleEmails] = useState<string[]>(clutterEmails.map(e => e.id));
  const [processedCount, setProcessedCount] = useState(0);
  const animationRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  }, []);

  const runAnimation = useCallback(() => {
    clearTimers();
    
    // Reset
    setPhase('cluttered');
    setVisibleEmails(clutterEmails.map((e) => e.id));
    setProcessedCount(0);

    // Phase 2: Start processing
    animationRef.current.push(setTimeout(() => setPhase('processing'), 3000));

    // Phase 3: Clear emails one by one
    animationRef.current.push(setTimeout(() => {
      setPhase('clearing');
      clutterEmails.forEach((_, index) => {
        animationRef.current.push(setTimeout(() => {
          setVisibleEmails((prev) => prev.slice(1));
          setProcessedCount((prev) => prev + 1);
        }, index * 700));
      });
    }, 5000));

    // Phase 4: Show inbox zero
    animationRef.current.push(setTimeout(() => setPhase('zero'), 9000));

    // Phase 5: Show stats
    animationRef.current.push(setTimeout(() => setPhase('stats'), 10500));
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
          label={phase === 'zero' || phase === 'stats' ? 'Inbox Zero!' : 'Inbox Zero'}
          icon={phase === 'zero' || phase === 'stats' ? CheckCircle2 : Inbox}
          variant={phase === 'zero' || phase === 'stats' ? 'success' : 'primary'}
          size="md"
          glow
          pulse={phase === 'processing' || phase === 'clearing'}
        />
      </div>

      <div className="w-full pt-6">
        <GlowingCard
          glowColor={phase === 'zero' || phase === 'stats' ? 'success' : 'primary'}
          glowIntensity="medium"
          hoverEffect={false}
        >
          <div className="p-5 min-h-[380px] relative">
            {/* Cluttered inbox state */}
            {(phase === 'cluttered' || phase === 'processing' || phase === 'clearing') && (
              <div className="space-y-3">
                {/* Unread count header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="text-sm font-medium text-muted-foreground">Inbox</span>
                  <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-semibold transition-all duration-300">
                    {visibleEmails.length} unread
                  </span>
                </div>

                {/* Email list */}
                <div className="space-y-2">
                  {clutterEmails.map((email) => (
                    <div
                      key={email.id}
                      className={cn(
                        'transition-all duration-500 ease-out',
                        visibleEmails.includes(email.id)
                          ? 'opacity-100 translate-x-0 scale-100'
                          : 'opacity-0 -translate-x-8 scale-95 h-0 overflow-hidden'
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
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-primary" />
                      </div>
                      <span className="text-base font-medium">Aiva is handling your inbox...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Inbox Zero state */}
            {(phase === 'zero' || phase === 'stats') && (
              <div className="flex flex-col items-center justify-center min-h-[340px]">
                <div className="relative mb-5">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                  Inbox Zero! 🎉
                </h3>
                <p className="text-base text-muted-foreground text-center max-w-sm">
                  Aiva handled all your messages. Nothing needs your attention.
                </p>
              </div>
            )}

            {/* Clearing counter - overlapping */}
            {phase === 'clearing' && processedCount > 0 && (
              <div className="absolute -bottom-4 -right-4 z-20">
                <div className="bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 font-bold text-lg">
                  <Zap className="w-5 h-5" />
                  {processedCount} handled
                </div>
              </div>
            )}
          </div>
        </GlowingCard>

        {/* Stats cards - overlapping the main card */}
        {phase === 'stats' && (
          <div className="relative -mt-8 mx-4 z-20 animate-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border-2 border-primary/20 rounded-xl p-4 text-center shadow-xl">
                <div className="text-3xl font-bold text-primary">
                  <AnimatedCounter value={127} />
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Handled Today</div>
              </div>
              <div className="bg-card border-2 border-green-500/20 rounded-xl p-4 text-center shadow-xl">
                <div className="text-3xl font-bold text-green-600">
                  <AnimatedCounter value={23} suffix="m" />
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Time Saved</div>
              </div>
              <div className="bg-card border-2 border-amber-500/20 rounded-xl p-4 text-center shadow-xl">
                <div className="text-3xl font-bold text-amber-600">
                  <AnimatedCounter value={34} />
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Auto-Replies</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InboxZeroVignette;
