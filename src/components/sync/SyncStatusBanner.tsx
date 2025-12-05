/**
 * SyncStatusBanner
 * Slim top banner showing sync progress at a glance
 */

'use client';

import React from 'react';
import { RefreshCw, Sparkles, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSyncStatus } from './SyncStatusProvider';

export function SyncStatusBanner() {
  const { 
    isSyncing, 
    progress, 
    displayProgress, 
    phaseDescription, 
    setDialogOpen,
    dialogOpen,
  } = useSyncStatus();

  // Debug logging
  console.log('🎯 SyncStatusBanner render:', { isSyncing, dialogOpen, phase: progress?.phase });

  // Don't render if not syncing
  if (!isSyncing) return null;
  
  // Don't show banner if dialog is open (avoid redundancy)
  // Actually, let's show it always when syncing - user can see it when they close dialog

  const isComplete = progress?.phase === 'complete';
  const isError = progress?.phase === 'error';
  const isClassifying = progress?.phase === 'classifying';
  const percentage = Math.round(displayProgress);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ease-out",
        "animate-in slide-in-from-top-full",
        isComplete && "bg-emerald-600",
        isError && "bg-destructive",
        !isComplete && !isError && "bg-primary"
      )}
    >
      <div className="flex items-center justify-center gap-2 sm:gap-4 px-4 py-2 text-sm text-primary-foreground">
        {/* Status Icon */}
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        ) : isError ? (
          <XCircle className="h-4 w-4 flex-shrink-0" />
        ) : isClassifying ? (
          <Sparkles className="h-4 w-4 flex-shrink-0 animate-pulse" />
        ) : (
          <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" />
        )}

        {/* Progress Info - Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="font-medium">
            {isComplete ? 'Sync complete!' : isError ? 'Sync failed' : 'Syncing your inbox...'}
          </span>
          
          {!isComplete && !isError && (
            <>
              <span className="text-primary-foreground/70">•</span>
              <span className="tabular-nums font-semibold">{percentage}%</span>
              
              {progress?.classifiedMessages !== undefined && progress.classifiedMessages > 0 && (
                <>
                  <span className="text-primary-foreground/70">•</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {progress.classifiedMessages} classified
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Progress Info - Mobile (condensed) */}
        <div className="flex sm:hidden items-center gap-2">
          <span className="font-medium">
            {isComplete ? 'Complete!' : isError ? 'Failed' : `Syncing ${percentage}%`}
          </span>
        </div>

        {/* View Details Button */}
        {!isComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-7 px-2 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground gap-1"
          >
            <span className="hidden sm:inline">View Details</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Progress bar at bottom of banner */}
      {!isComplete && !isError && (
        <div className="h-0.5 bg-primary-foreground/20">
          <div 
            className="h-full bg-primary-foreground/60 transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default SyncStatusBanner;

