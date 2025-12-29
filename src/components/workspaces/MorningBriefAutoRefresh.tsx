/**
 * Client component that auto-refreshes the page when visible
 * This will refresh all server components including MorningBrief
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshProps {
  refreshInterval?: number; // Refresh interval in seconds (default: 30)
}

export function AutoRefresh({ 
  refreshInterval = 30 
}: AutoRefreshProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    // Check initial visibility
    setIsVisible(!document.hidden);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-refresh when page is visible
  useEffect(() => {
    if (!isVisible) {
      return; // Don't poll when page is hidden
    }

    const interval = setInterval(() => {
      // Only refresh if page is still visible
      if (!document.hidden) {
        console.log('[AutoRefresh] Refreshing page data...');
        router.refresh();
        setLastRefresh(Date.now());
      }
    }, refreshInterval * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isVisible, refreshInterval, router]);

  // Also refresh when page becomes visible again (after being hidden)
  useEffect(() => {
    if (isVisible) {
      const timeSinceLastRefresh = Date.now() - lastRefresh;
      // If it's been more than the refresh interval since last refresh, refresh immediately
      if (timeSinceLastRefresh >= refreshInterval * 1000) {
        console.log('[AutoRefresh] Page became visible, refreshing data...');
        router.refresh();
        setLastRefresh(Date.now());
      }
    }
  }, [isVisible, lastRefresh, refreshInterval, router]);

  // This component doesn't render anything - it just handles refresh logic
  return null;
}
