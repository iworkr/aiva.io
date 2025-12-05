/**
 * SyncStatusProvider
 * Global context for sync status that persists across page navigation
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSyncProgress, calculateSyncPercentage, getPhaseDescription } from '@/hooks/useSyncProgress';
import type { SyncProgress } from '@/types/sync';

interface SyncStatusContextType {
  // Sync state
  isSyncing: boolean;
  progress: SyncProgress | null;
  displayProgress: number;
  phaseDescription: string;
  workspaceId: string | null;
  
  // Dialog controls
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  
  // Actions
  startSync: () => void;
  reset: () => void;
  setWorkspaceId: (id: string | null) => void;
}

const SyncStatusContext = createContext<SyncStatusContextType | undefined>(undefined);

interface SyncStatusProviderProps {
  children: ReactNode;
  initialWorkspaceId?: string | null;
}

export function SyncStatusProvider({ children, initialWorkspaceId = null }: SyncStatusProviderProps) {
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(initialWorkspaceId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualSyncStarted, setManualSyncStarted] = useState(false);

  const handleComplete = useCallback(() => {
    // Keep banner visible briefly after completion, then hide
    setTimeout(() => {
      setManualSyncStarted(false);
    }, 3000); // Give user 3 seconds to see "Sync complete" in banner
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('Sync error:', error);
    // Keep banner visible briefly to show error state
    setTimeout(() => {
      setManualSyncStarted(false);
    }, 5000);
  }, []);

  const { progress, isActive, displayProgress, reset: resetProgress } = useSyncProgress(
    workspaceId,
    {
      onComplete: handleComplete,
      onError: handleError,
    }
  );

  // Debug logging
  useEffect(() => {
    console.log('🔄 SyncStatusProvider state:', { 
      workspaceId, 
      isActive, 
      manualSyncStarted, 
      phase: progress?.phase,
      isSyncing: isActive || manualSyncStarted 
    });
  }, [workspaceId, isActive, manualSyncStarted, progress?.phase]);

  const startSync = useCallback(() => {
    console.log('🚀 startSync called');
    setManualSyncStarted(true);
    setDialogOpen(true);
  }, []);

  const reset = useCallback(() => {
    resetProgress();
    setDialogOpen(false);
    setManualSyncStarted(false);
  }, [resetProgress]);

  const setWorkspaceId = useCallback((id: string | null) => {
    console.log('📍 setWorkspaceId:', id);
    setWorkspaceIdState(id);
  }, []);

  // Determine if we should show sync status - active from Realtime OR manually started
  const isSyncing = isActive || manualSyncStarted;
  
  // Get phase description
  const phaseDescription = progress ? getPhaseDescription(progress.phase) : 'Starting sync...';

  const value: SyncStatusContextType = {
    isSyncing,
    progress,
    displayProgress,
    phaseDescription,
    workspaceId,
    dialogOpen,
    setDialogOpen,
    startSync,
    reset,
    setWorkspaceId,
  };

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus() {
  const context = useContext(SyncStatusContext);
  if (context === undefined) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return context;
}

export default SyncStatusProvider;

