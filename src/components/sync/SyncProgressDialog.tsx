/**
 * SyncProgressDialog Component
 * Shows detailed sync progress with live message counts
 * Now uses shared SyncStatusProvider context for global state
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPhaseDescription } from '@/hooks/useSyncProgress';
import type { SyncProgress as SyncProgressType, SyncPhase } from '@/types/sync';
import { getIntegrationById } from '@/lib/integrations/config';
import { useSyncStatus } from './SyncStatusProvider';

interface SyncProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSyncComplete?: () => void;
}

export function SyncProgressDialog({ 
  isOpen, 
  onClose, 
  workspaceId,
  onSyncComplete 
}: SyncProgressDialogProps) {
  const [showComplete, setShowComplete] = useState(false);
  const [localComplete, setLocalComplete] = useState(false);
  
  // Use shared context instead of local hook
  const { progress, isSyncing, displayProgress } = useSyncStatus();
  
  // Track completion
  useEffect(() => {
    if (progress?.phase === 'complete' && !localComplete) {
      setLocalComplete(true);
      setShowComplete(true);
      onSyncComplete?.();
      // Auto-close dialog after 2 seconds on complete (but keep banner visible briefly)
      setTimeout(() => {
        onClose();
        setShowComplete(false);
      }, 2000);
    }
  }, [progress?.phase, localComplete, onSyncComplete, onClose]);

  // Reset local complete state when a new sync starts
  useEffect(() => {
    if (progress?.phase === 'connecting' || progress?.phase === 'fetching') {
      setLocalComplete(false);
    }
  }, [progress?.phase]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowComplete(false);
    }
  }, [isOpen]);

  // Use the smooth interpolated progress instead of raw percentage
  const percentage = displayProgress;
  const phaseDescription = progress ? getPhaseDescription(progress.phase) : 'Starting sync...';

  // Get provider logo
  const providerLogo = progress?.provider 
    ? getIntegrationById(progress.provider.toLowerCase())?.logoUrl 
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className={cn(
              "h-5 w-5",
              isSyncing && "animate-spin"
            )} />
            {showComplete ? 'Sync Complete!' : 'Syncing Your Inbox'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connection Info */}
          {progress && (
            <div className="flex items-center gap-3">
              {providerLogo ? (
                <img 
                  src={providerLogo} 
                  alt={progress.provider} 
                  className="h-8 w-8 rounded-lg"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {progress.provider.charAt(0).toUpperCase() + progress.provider.slice(1)}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {progress.connectionName || 'Connecting...'}
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar - with smooth CSS transition */}
          <div className="space-y-2">
            <Progress 
              value={percentage} 
              className="h-2 [&>div]:transition-all [&>div]:duration-300 [&>div]:ease-out" 
            />
            <p className="text-xs text-muted-foreground text-center tabular-nums">
              {Math.round(percentage)}%
            </p>
          </div>

          {/* Phase Description */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <PhaseIcon phase={progress?.phase || 'connecting'} />
            <span className={cn(
              progress?.phase === 'error' && 'text-destructive',
              progress?.phase === 'complete' && 'text-emerald-600 dark:text-emerald-400'
            )}>
              {phaseDescription}
            </span>
          </div>

          {/* Stats */}
          {progress && progress.phase !== 'connecting' && progress.phase !== 'fetching' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-semibold tabular-nums">
                  {progress.syncedMessages}
                </p>
                <p className="text-xs text-muted-foreground">New messages</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold tabular-nums">
                  {progress.classifiedMessages}/{progress.totalMessages || progress.syncedMessages || 0}
                </p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI classified
                </p>
              </div>
            </div>
          )}

          {/* Current Message */}
          {progress?.currentMessage && progress.phase !== 'complete' && progress.phase !== 'error' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Current:</p>
              <p className="text-sm truncate max-w-[300px] mx-auto">
                "{progress.currentMessage}"
              </p>
            </div>
          )}

          {/* Error Message */}
          {progress?.phase === 'error' && progress.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{progress.error}</p>
            </div>
          )}

          {/* Complete State */}
          {showComplete && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                All messages synced and classified!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PhaseIcon({ phase }: { phase: SyncPhase }) {
  switch (phase) {
    case 'connecting':
    case 'fetching':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'syncing':
      return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
    case 'classifying':
      return <Sparkles className="h-4 w-4 text-primary animate-pulse" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin" />;
  }
}

export default SyncProgressDialog;

