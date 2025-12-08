/**
 * AITriageVignette - Marketing Feature Vignette
 * Shows AI analyzing and suggesting actions for an email
 */

'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { MockEmailCard } from '../base/MockEmailCard';
import { MockAISuggestionPanel } from '../base/MockAISuggestionPanel';
import { FloatingBadge } from '../base/FloatingBadge';
import { GlowingCard } from '../base/GlowingCard';
import { Sparkles, Zap, CheckCircle } from 'lucide-react';

interface AITriageVignetteProps {
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  compact?: boolean;
}

const demoEmail = {
  sender: {
    name: 'Sarah Johnson',
    email: 'sarah@acme.com',
  },
  subject: 'Q4 Budget Review - Action Required',
  snippet:
    'Hi team, please review the attached Q4 budget proposal and provide your feedback by EOD Friday. We need to finalize the numbers before the board meeting next week.',
  timestamp: 'Just now',
  isUnread: true,
};

const demoSuggestions = [
  {
    id: '1',
    type: 'priority' as const,
    label: 'Priority',
    value: 'High',
    reasoning: 'Subject contains "Action Required" and sender is a key stakeholder',
    confidence: 0.94,
  },
  {
    id: '2',
    type: 'category' as const,
    label: 'Category',
    value: 'Work - Finance',
    reasoning: 'Email mentions budget, board meeting, and comes from @acme.com',
    confidence: 0.92,
  },
  {
    id: '3',
    type: 'action' as const,
    label: 'Suggested Action',
    value: 'Reply with Review',
    reasoning: 'Message requests feedback with deadline, response expected',
    confidence: 0.89,
  },
];

type AnimationPhase = 'idle' | 'email-arrive' | 'analyzing' | 'suggestions' | 'complete';

export function AITriageVignette({
  className,
  autoPlay = true,
  loop = true,
  compact = false,
}: AITriageVignetteProps) {
  const [phase, setPhase] = useState<AnimationPhase>('idle');
  const [emailPriority, setEmailPriority] = useState<'urgent' | 'high' | 'normal' | 'low' | undefined>(undefined);
  const [emailCategory, setEmailCategory] = useState<string | undefined>(undefined);
  const [showApplied, setShowApplied] = useState(false);

  const runAnimation = useCallback(() => {
    // Reset state
    setPhase('idle');
    setEmailPriority(undefined);
    setEmailCategory(undefined);
    setShowApplied(false);

    // Phase 1: Email arrives
    setTimeout(() => setPhase('email-arrive'), 300);

    // Phase 2: Analyzing
    setTimeout(() => setPhase('analyzing'), 1200);

    // Phase 3: Show suggestions
    setTimeout(() => setPhase('suggestions'), 2200);

    // Phase 4: Complete
    setTimeout(() => setPhase('complete'), 4500);
  }, []);

  useEffect(() => {
    if (autoPlay) {
      runAnimation();

      if (loop) {
        const interval = setInterval(runAnimation, 8000);
        return () => clearInterval(interval);
      }
    }
  }, [autoPlay, loop, runAnimation]);

  const handleApplyAll = () => {
    setEmailPriority('high');
    setEmailCategory('Work - Finance');
    setShowApplied(true);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Floating badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
        <FloatingBadge
          label="AI Triage"
          icon={Sparkles}
          variant="primary"
          size="md"
          glow
          animate={phase !== 'idle'}
          pulse={phase === 'analyzing'}
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          'grid gap-4',
          compact ? 'grid-cols-1' : 'md:grid-cols-2',
          'pt-6'
        )}
      >
        {/* Email Card */}
        <GlowingCard
          glowColor={phase === 'analyzing' ? 'info' : 'primary'}
          glowIntensity="subtle"
          hoverEffect={false}
          animate={phase === 'email-arrive'}
        >
          <div className="p-4">
            <MockEmailCard
              {...demoEmail}
              priority={emailPriority}
              category={emailCategory}
              animate={phase === 'email-arrive'}
              labels={showApplied ? ['Needs Review'] : []}
            />

            {/* Analyzing overlay */}
            {phase === 'analyzing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <Zap className="absolute inset-0 m-auto w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground animate-pulse">
                    Analyzing email...
                  </span>
                </div>
              </div>
            )}

            {/* Applied badge */}
            {showApplied && (
              <div className="absolute top-2 right-2 animate-in zoom-in duration-300">
                <FloatingBadge
                  label="Applied"
                  icon={CheckCircle}
                  variant="success"
                  size="sm"
                />
              </div>
            )}
          </div>
        </GlowingCard>

        {/* AI Suggestions Panel */}
        {!compact && (
          <div
            className={cn(
              'transition-all duration-500',
              phase === 'suggestions' || phase === 'complete'
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-8 pointer-events-none'
            )}
          >
            <MockAISuggestionPanel
              suggestions={demoSuggestions}
              animate={phase === 'suggestions'}
              showAnalyzing={false}
              onApplyAll={handleApplyAll}
            />
          </div>
        )}
      </div>

      {/* Compact mode suggestion summary */}
      {compact && (phase === 'suggestions' || phase === 'complete') && (
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">AI Suggestion:</span>
            <span className="text-muted-foreground">
              High priority • Work - Finance • Reply recommended
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AITriageVignette;

