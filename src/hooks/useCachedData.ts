/**
 * useCachedData Hook
 * Implements stale-while-revalidate pattern for instant UI with background updates
 * 
 * - Returns cached data immediately on mount (no loading state if cache exists)
 * - Fetches fresh data in background
 * - Only triggers re-render when fresh data differs from cache
 * - Configurable cache TTL (time-to-live)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCachedDataOptions<T> {
  /** Time-to-live for cache in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Callback when data is updated */
  onUpdate?: (data: T) => void;
  /** Whether to skip initial fetch if cache exists (default: false) */
  skipInitialFetchIfCached?: boolean;
  /** Dependencies that trigger a refetch when changed */
  deps?: any[];
}

interface UseCachedDataResult<T> {
  /** The cached/fetched data */
  data: T | null;
  /** True only on first load when no cache exists */
  isLoading: boolean;
  /** True when fetching fresh data in background */
  isRefreshing: boolean;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Clear the cache for this key */
  clearCache: () => void;
  /** Error from last fetch attempt */
  error: Error | null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache for faster access than localStorage
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Get cached data from memory or localStorage
 */
function getCachedData<T>(key: string, ttl: number): T | null {
  // Try memory cache first
  const memEntry = memoryCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < ttl) {
    return memEntry.data;
  }

  // Fall back to localStorage
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed: CacheEntry<T> = JSON.parse(stored);
    if (Date.now() - parsed.timestamp < ttl) {
      // Restore to memory cache
      memoryCache.set(key, parsed);
      return parsed.data;
    }
  } catch (error) {
    console.error(`Error reading cache for "${key}":`, error);
  }
  
  return null;
}

/**
 * Set cached data in both memory and localStorage
 */
function setCachedData<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  
  // Update memory cache
  memoryCache.set(key, entry);
  
  // Update localStorage
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error(`Error writing cache for "${key}":`, error);
  }
}

/**
 * Clear cached data from both memory and localStorage
 */
function clearCachedData(key: string): void {
  memoryCache.delete(key);
  
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing cache for "${key}":`, error);
  }
}

/**
 * Deep comparison to check if data has changed
 */
function hasDataChanged<T>(oldData: T | null, newData: T): boolean {
  if (oldData === null) return true;
  
  try {
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  } catch {
    return true;
  }
}

/**
 * Stale-while-revalidate data fetching hook
 */
export function useCachedData<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: UseCachedDataOptions<T> = {}
): UseCachedDataResult<T> {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    onUpdate,
    skipInitialFetchIfCached = false,
    deps = [],
  } = options;

  // Initialize with cached data if available
  const [data, setData] = useState<T | null>(() => getCachedData<T>(cacheKey, ttl));
  const [isLoading, setIsLoading] = useState<boolean>(() => !getCachedData<T>(cacheKey, ttl));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string>('');

  // Fetch function with deduplication
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    // Prevent duplicate concurrent fetches
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;
    
    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      const freshData = await fetchFn();
      
      if (!isMountedRef.current) return;
      
      // Only update if data has changed
      if (hasDataChanged(data, freshData)) {
        setData(freshData);
        setCachedData(cacheKey, freshData);
        onUpdate?.(freshData);
      }
      
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error(`Error fetching data for "${cacheKey}":`, error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      fetchingRef.current = false;
    }
  }, [cacheKey, fetchFn, data, onUpdate]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Clear cache function
  const clearCache = useCallback(() => {
    clearCachedData(cacheKey);
    setData(null);
  }, [cacheKey]);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    isMountedRef.current = true;
    
    // Create a unique key for this fetch based on cacheKey and deps
    const fetchKey = `${cacheKey}-${JSON.stringify(deps)}`;
    
    // Skip if same fetch key (prevents duplicate fetches)
    if (fetchKey === lastFetchKeyRef.current) {
      return;
    }
    lastFetchKeyRef.current = fetchKey;
    
    // Check if we have cached data
    const cachedData = getCachedData<T>(cacheKey, ttl);
    
    if (cachedData !== null) {
      // We have cache - show it immediately
      setData(cachedData);
      setIsLoading(false);
      
      // Still fetch in background unless skipInitialFetchIfCached is true
      if (!skipInitialFetchIfCached) {
        fetchData(true);
      }
    } else {
      // No cache - show loading and fetch
      setIsLoading(true);
      fetchData(false);
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [cacheKey, ttl, skipInitialFetchIfCached, ...deps]);

  return {
    data,
    isLoading,
    isRefreshing,
    refresh,
    clearCache,
    error,
  };
}

/**
 * Utility to prefetch data into cache
 */
export async function prefetchData<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<void> {
  try {
    const data = await fetchFn();
    setCachedData(cacheKey, data);
  } catch (error) {
    console.error(`Error prefetching data for "${cacheKey}":`, error);
  }
}

/**
 * Utility to invalidate cache for a key or pattern
 */
export function invalidateCache(keyOrPattern: string | RegExp): void {
  if (typeof keyOrPattern === 'string') {
    clearCachedData(keyOrPattern);
  } else {
    // Clear matching keys from memory cache
    for (const key of memoryCache.keys()) {
      if (keyOrPattern.test(key)) {
        memoryCache.delete(key);
      }
    }
    
    // Clear matching keys from localStorage
    if (typeof window !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && keyOrPattern.test(key)) {
          localStorage.removeItem(key);
        }
      }
    }
  }
}

