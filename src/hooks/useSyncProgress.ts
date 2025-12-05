/**
 * useSyncProgress Hook
 * Subscribes to Supabase Realtime for sync progress updates
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseUserClientComponent } from '@/supabase-clients/user/supabaseUserClientComponent';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SyncProgress, SyncPhase } from '@/types/sync';

interface UseSyncProgressOptions {
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface UseSyncProgressReturn {
  progress: SyncProgress | null;
  isActive: boolean;
  reset: () => void;
}

const initialProgress: SyncProgress = {
  phase: 'connecting',
  connectionName: '',
  provider: '',
  totalMessages: 0,
  syncedMessages: 0,
  classifiedMessages: 0,
  timestamp: Date.now(),
};

export function useSyncProgress(
  workspaceId: string | null,
  options: UseSyncProgressOptions = {}
): UseSyncProgressReturn {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isActive, setIsActive] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { onComplete, onError } = options;

  const reset = useCallback(() => {
    setProgress(null);
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    // Clean up previous channel if exists
    if (channelRef.current) {
      supabaseUserClientComponent.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Subscribe to sync progress channel
    const channel = supabaseUserClientComponent.channel(`sync-progress:${workspaceId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'sync.progress' }, (payload) => {
        const syncProgress = payload.payload as SyncProgress;
        
        setProgress(syncProgress);
        
        // Track active state
        if (syncProgress.phase === 'connecting' || syncProgress.phase === 'fetching' || 
            syncProgress.phase === 'syncing' || syncProgress.phase === 'classifying') {
          setIsActive(true);
        }

        // Handle completion
        if (syncProgress.phase === 'complete') {
          setIsActive(false);
          onComplete?.();
        }

        // Handle error
        if (syncProgress.phase === 'error') {
          setIsActive(false);
          onError?.(syncProgress.error || 'Unknown error');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`📡 Subscribed to sync progress for workspace ${workspaceId}`);
        }
      });

    return () => {
      if (channelRef.current) {
        supabaseUserClientComponent.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, onComplete, onError]);

  return { progress, isActive, reset };
}

/**
 * Helper to calculate progress percentage
 */
export function calculateSyncPercentage(progress: SyncProgress | null): number {
  if (!progress) return 0;
  
  const { phase, totalMessages, syncedMessages, classifiedMessages } = progress;
  
  if (phase === 'connecting') return 5;
  if (phase === 'fetching') return 10;
  if (phase === 'complete') return 100;
  if (phase === 'error') return 0;
  
  if (totalMessages === 0) return 15;
  
  if (phase === 'syncing') {
    // Syncing is 10-60% of total progress
    const syncProgress = (syncedMessages / totalMessages) * 50;
    return Math.min(60, 10 + syncProgress);
  }
  
  if (phase === 'classifying') {
    // Classifying is 60-100% of total progress
    const classifyProgress = (classifiedMessages / syncedMessages) * 40;
    return Math.min(99, 60 + classifyProgress);
  }
  
  return 15;
}

/**
 * Helper to get human-readable phase description
 */
export function getPhaseDescription(phase: SyncPhase): string {
  switch (phase) {
    case 'connecting':
      return 'Connecting to your inbox...';
    case 'fetching':
      return 'Fetching messages...';
    case 'syncing':
      return 'Syncing messages...';
    case 'classifying':
      return 'Aiva is analyzing your messages...';
    case 'complete':
      return 'Sync complete!';
    case 'error':
      return 'Sync failed';
    default:
      return 'Processing...';
  }
}

