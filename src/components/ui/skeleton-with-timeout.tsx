/**
 * Skeleton with Timeout Component
 * Shows skeleton loading with a spinner, then fallback message after timeout
 */

'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkeletonWithTimeoutProps {
  children: ReactNode;
  timeoutMs?: number;
  onRefresh?: () => void;
  className?: string;
  showSpinner?: boolean;
}

export function SkeletonWithTimeout({
  children,
  timeoutMs = 10000,
  onRefresh,
  className,
  showSpinner = true,
}: SkeletonWithTimeoutProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs]);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      // Default: reload the page
      window.location.reload();
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Skeleton content */}
      {children}

      {/* Spinner overlay (visible while loading, before timeout) */}
      {showSpinner && !timedOut && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-border/50">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}

      {/* Timeout overlay */}
      {timedOut && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6 max-w-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Taking longer than expected
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              The content is still loading. This might be due to a slow connection or a temporary issue.
            </p>
            <Button
              onClick={handleRefresh}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

