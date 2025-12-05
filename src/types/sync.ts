/**
 * Sync Progress Types
 * Types for tracking sync progress in real-time
 */

export type SyncPhase = 
  | 'connecting'
  | 'fetching'
  | 'syncing'
  | 'classifying'
  | 'complete'
  | 'error';

export interface SyncProgress {
  /** Current phase of the sync operation */
  phase: SyncPhase;
  /** Name of the connection being synced (e.g., "user@gmail.com") */
  connectionName: string;
  /** Provider type (gmail, outlook, etc.) */
  provider: string;
  /** Total messages to sync */
  totalMessages: number;
  /** Number of messages synced so far */
  syncedMessages: number;
  /** Number of messages classified so far */
  classifiedMessages: number;
  /** Subject of the current message being processed */
  currentMessage?: string;
  /** Error message if phase is 'error' */
  error?: string;
  /** Timestamp of this progress update */
  timestamp: number;
}

export interface SyncProgressEvent {
  type: 'broadcast';
  event: 'sync.progress';
  payload: SyncProgress;
}

export interface ConnectionSyncStatus {
  connectionId: string;
  provider: string;
  accountName: string | null;
  lastSyncAt: string | null;
  status: 'active' | 'inactive' | 'error';
  isSyncing: boolean;
}

export interface WorkspaceSyncStatus {
  connections: ConnectionSyncStatus[];
  isAnySyncing: boolean;
  lastSyncAt: string | null;
}

