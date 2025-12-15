/**
 * MockAISuggestionPanel - Marketing UI Component
 * AI suggestions panel with reasoning
 */

'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Tag,
  Flag,
  User,
  Reply,
  Archive,
  Calendar,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface Suggestion {
  id: string;
  type: 'priority' | 'category' | 'assignee' | 'action';
  label: string;
  value: string;
  reasoning: string;
  confidence?: number;
  icon?: React.ReactNode;
}

interface MockAISuggestionPanelProps {
  suggestions: Suggestion[];
  onApplyAll?: () => void;
  className?: string;
  animate?: boolean;
  showAnalyzing?: boolean;
  title?: string;
}

const typeIcons = {
  priority: Flag,
  category: Tag,
  assignee: User,
  action: Reply,
};

const actionIcons = {
  reply: Reply,
  archive: Archive,
  schedule: Calendar,
};

// Default suggestions for demo
export const sampleSuggestions: Suggestion[] = [
  {
    id: '1',
    type: 'priority',
    label: 'Priority',
    value: 'High',
    reasoning: 'Sender is a key stakeholder and subject contains "Action Required"',
    confidence: 0.92,
  },
  {
    id: '2',
    type: 'category',
    label: 'Category',
    value: 'Work',
    reasoning: 'Email is from @acme.com domain, matches work contacts',
    confidence: 0.95,
  },
  {
    id: '3',
    type: 'action',
    label: 'Suggested Action',
    value: 'Reply',
    reasoning: 'Message asks for review and feedback, response expected',
    confidence: 0.88,
  },
];

export function MockAISuggestionPanel({
  suggestions = sampleSuggestions,
  onApplyAll,
  className,
  animate = false,
  showAnalyzing = false,
  title = 'AI Suggestions',
}: MockAISuggestionPanelProps) {
  const [visibleSuggestions, setVisibleSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(showAnalyzing);

  useEffect(() => {
    if (animate) {
      setVisibleSuggestions([]);
      setIsAnalyzing(true);

      // Show analyzing state (longer to read)
      const analyzeTimer = setTimeout(() => {
        setIsAnalyzing(false);
        // Then reveal suggestions one by one (slower stagger)
        suggestions.forEach((suggestion, index) => {
          setTimeout(() => {
            setVisibleSuggestions((prev) => [...prev, suggestion.id]);
          }, index * 800); // Much slower reveal
        });
      }, 1500);

      return () => clearTimeout(analyzeTimer);
    } else {
      setVisibleSuggestions(suggestions.map((s) => s.id));
    }
  }, [animate, suggestions]);

  return (
    <div
      className={cn(
        'rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden',
        'shadow-lg shadow-primary/5',
        animate && 'animate-in slide-in-from-right-4 duration-500',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b">
        <div className="p-1.5 rounded-lg bg-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-sm">{title}</span>
        {isAnalyzing && (
          <span className="ml-auto text-xs text-muted-foreground animate-pulse">
            Analyzing...
          </span>
        )}
      </div>

      {/* Suggestions */}
      <div className="p-3 space-y-2">
        {isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-primary" />
            </div>
          </div>
        ) : (
          suggestions.map((suggestion) => {
            const Icon = typeIcons[suggestion.type];
            const isVisible = visibleSuggestions.includes(suggestion.id);

            return (
              <div
                key={suggestion.id}
                className={cn(
                  'rounded-lg border bg-background p-3 transition-all duration-300',
                  'hover:border-primary/30 hover:shadow-sm',
                  !isVisible && 'opacity-0 translate-y-2',
                  isVisible && 'opacity-100 translate-y-0'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {suggestion.label}
                      </span>
                      {suggestion.confidence && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          {Math.round(suggestion.confidence * 100)}% confident
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm mt-0.5">{suggestion.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {suggestion.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Apply All Button */}
      {!isAnalyzing && visibleSuggestions.length === suggestions.length && (
        <div className="px-3 pb-3">
          <Button
            onClick={onApplyAll}
            className={cn(
              'w-full gap-2',
              animate && 'animate-in fade-in duration-300'
            )}
            style={{ animationDelay: animate ? '900ms' : undefined }}
          >
            <CheckCircle className="w-4 h-4" />
            Apply All Suggestions
            <ChevronRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default MockAISuggestionPanel;

