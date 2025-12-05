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
  displayProgress: number;
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
  const [displayProgress, setDisplayProgress] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const { onComplete, onError } = options;

  const reset = useCallback(() => {
    setProgress(null);
    setIsActive(false);
    setDisplayProgress(0);
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Smooth progress interpolation - 1% ticks for smooth visual
  useEffect(() => {
    const targetProgress = calculateSyncPercentage(progress);
    
    // Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    // Animate towards target progress with smooth 1% increments
    animationRef.current = setInterval(() => {
      setDisplayProgress(current => {
        const diff = targetProgress - current;
        
        // If we're very close, snap to target
        if (Math.abs(diff) < 0.3) {
          return targetProgress;
        }
        
        // Always move in ~1% increments for smooth visual
        // Faster interval (30ms) with smaller steps = smooth animation
        if (diff > 0) {
          // Moving forward - increment by 1 or less
          return current + Math.min(1, diff * 0.2);
        } else {
          // Moving backward (rare) - decrement
          return current + Math.max(-1, diff * 0.2);
        }
      });
    }, 30); // 30ms = ~33fps for smooth animation

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [progress]);

  // Continuous slow creep forward when active (keeps bar moving even between updates)
  useEffect(() => {
    if (!isActive) return;

    const creepInterval = setInterval(() => {
      const targetProgress = calculateSyncPercentage(progress);
      
      setDisplayProgress(current => {
        // Always creep forward slightly if we're behind target and not complete
        if (current < targetProgress - 0.5 && current < 99) {
          // Small creep to show continuous activity
          return current + 0.15;
        }
        // If at or near target but not complete, creep very slowly
        if (current < 99 && progress?.phase !== 'complete' && progress?.phase !== 'error') {
          return current + 0.05;
        }
        return current;
      });
    }, 100); // Every 100ms for constant movement feel

    return () => clearInterval(creepInterval);
  }, [isActive, progress]);

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

  return { progress, isActive, displayProgress, reset };
}

/**
 * Helper to calculate progress percentage
 * Now uses cumulative progress from orchestrator (totalMessages field contains overall %)
 */
export function calculateSyncPercentage(progress: SyncProgress | null): number {
  if (!progress) return 0;
  
  const { phase, totalMessages } = progress;
  
  // Complete and error are definitive states
  if (phase === 'complete') return 100;
  if (phase === 'error') return 0;
  
  // The orchestrator now sends cumulative progress in totalMessages field
  // This represents the overall progress across all accounts (0-100)
  if (totalMessages > 0 && totalMessages <= 100) {
    // Use the cumulative progress directly
    return Math.min(99, totalMessages);
  }
  
  // Fallback for initial phases before we have progress data
  if (phase === 'connecting') return 2;
  if (phase === 'fetching') return 5;
  if (phase === 'syncing') return 10;
  if (phase === 'classifying') return 50;
  
  return 1;
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

