/**
 * AITriageVignette - Marketing Feature Vignette
 * Shows AI analyzing and suggesting actions for an email
 */

'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback, useRef } from 'react';
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

type AnimationPhase = 'email-arrive' | 'analyzing' | 'suggestions' | 'complete';

export function AITriageVignette({
  className,
  autoPlay = true,
  loop = true,
  compact = false,
}: AITriageVignetteProps) {
  const [phase, setPhase] = useState<AnimationPhase>('email-arrive');
  const [emailPriority, setEmailPriority] = useState<'urgent' | 'high' | 'normal' | 'low' | undefined>(undefined);
  const [emailCategory, setEmailCategory] = useState<string | undefined>(undefined);
  const [showApplied, setShowApplied] = useState(false);
  const animationRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  }, []);

  const runAnimation = useCallback(() => {
    clearTimers();
    
    // Reset state
    setPhase('email-arrive');
    setEmailPriority(undefined);
    setEmailCategory(undefined);
    setShowApplied(false);

    // Phase 2: Analyzing
    animationRef.current.push(setTimeout(() => setPhase('analyzing'), 2500));

    // Phase 3: Show suggestions
    animationRef.current.push(setTimeout(() => setPhase('suggestions'), 5000));

    // Phase 4: Complete - apply suggestions
    animationRef.current.push(setTimeout(() => {
      setPhase('complete');
      setEmailPriority('high');
      setEmailCategory('Work - Finance');
      setShowApplied(true);
    }, 9000));
  }, [clearTimers]);

  useEffect(() => {
    if (autoPlay) {
      runAnimation();

      if (loop) {
        const interval = setInterval(runAnimation, 14000);
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
      {/* Floating badge - overlapping top */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30">
        <FloatingBadge
          label="AI Triage"
          icon={Sparkles}
          variant="primary"
          size="md"
          glow
          pulse={phase === 'analyzing'}
        />
      </div>

      {/* Main content - consistent full width layout */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-4 pt-6">
        {/* Email Card - takes 3 columns */}
        <div className="lg:col-span-3 relative">
          <GlowingCard
            glowColor={phase === 'analyzing' ? 'info' : 'primary'}
            glowIntensity="medium"
            hoverEffect={false}
          >
            <div className="p-5 relative min-h-[200px]">
              <MockEmailCard
                {...demoEmail}
                priority={emailPriority}
                category={emailCategory}
                labels={showApplied ? ['Needs Review'] : []}
              />

              {/* Analyzing overlay */}
              {phase === 'analyzing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      <Zap className="absolute inset-0 m-auto w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground animate-pulse">
                      Analyzing email...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </GlowingCard>

          {/* Applied badge - overlapping card */}
          {showApplied && (
            <div className="absolute -bottom-3 -right-3 z-20 animate-in zoom-in slide-in-from-bottom-2 duration-500">
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4" />
                Applied!
              </div>
            </div>
          )}
        </div>

        {/* AI Suggestions Panel - takes 2 columns */}
        <div 
          className={cn(
            'lg:col-span-2 transition-all duration-700',
            phase === 'suggestions' || phase === 'complete'
              ? 'opacity-100 translate-y-0'
              : 'opacity-30 translate-y-4'
          )}
        >
          <MockAISuggestionPanel
            suggestions={demoSuggestions}
            animate={phase === 'suggestions'}
            showAnalyzing={false}
          />
        </div>
      </div>

      {/* Compact mode suggestion summary */}
      {compact && (phase === 'suggestions' || phase === 'complete') && (
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
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
