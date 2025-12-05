/**
 * SyncStatusBanner
 * Slim top banner showing sync progress at a glance
 * Uses fixed positioning + CSS variable to push down sidebar & content
 */

'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSyncStatus } from './SyncStatusProvider';
import { getPhaseDescription } from '@/hooks/useSyncProgress';

const BANNER_HEIGHT = '41px'; // Height of banner including progress bar

export function SyncStatusBanner() {
  const { 
    isSyncing, 
    progress, 
    displayProgress, 
    setDialogOpen,
  } = useSyncStatus();

  // Set CSS variable for banner height when visible
  useEffect(() => {
    if (isSyncing) {
      document.documentElement.style.setProperty('--sync-banner-height', BANNER_HEIGHT);
      document.body.classList.add('sync-banner-visible');
    } else {
      document.documentElement.style.setProperty('--sync-banner-height', '0px');
      document.body.classList.remove('sync-banner-visible');
    }
    
    return () => {
      document.documentElement.style.setProperty('--sync-banner-height', '0px');
      document.body.classList.remove('sync-banner-visible');
    };
  }, [isSyncing]);

  // Don't render if not syncing
  if (!isSyncing) return null;

  const isComplete = progress?.phase === 'complete';
  const isError = progress?.phase === 'error';
  const isClassifying = progress?.phase === 'classifying';
  const percentage = Math.round(displayProgress);
  
  // Get current phase description for more detail
  const phaseText = progress ? getPhaseDescription(progress.phase) : 'Starting...';

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ease-out",
        "animate-in slide-in-from-top-2",
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
            {isComplete ? 'Sync complete!' : isError ? 'Sync failed' : phaseText}
          </span>
          
          {!isComplete && !isError && (
            <>
              <span className="text-primary-foreground/70">•</span>
              <span className="tabular-nums font-semibold">{percentage}%</span>
              
              {progress?.syncedMessages !== undefined && progress.syncedMessages > 0 && (
                <>
                  <span className="text-primary-foreground/70">•</span>
                  <span>{progress.syncedMessages} synced</span>
                </>
              )}
              
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
            {isComplete ? 'Complete!' : isError ? 'Failed' : `${percentage}%`}
          </span>
          {!isComplete && !isError && progress?.classifiedMessages !== undefined && progress.classifiedMessages > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              {progress.classifiedMessages}
            </span>
          )}
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
        <div className="h-1 bg-primary-foreground/20">
          <div 
            className="h-full bg-primary-foreground/80 transition-all duration-150 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default SyncStatusBanner;

