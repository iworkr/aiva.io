/**
 * usePrefetch Hook
 * Prefetch routes on hover for instant navigation
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function usePrefetch() {
  const router = useRouter();

  const prefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  const onMouseEnter = useCallback(
    (href: string) => () => {
      prefetch(href);
    },
    [prefetch]
  );

  return { prefetch, onMouseEnter };
}

/**
 * useDebouncedValue Hook
 * Debounce values for better performance (search, filters, etc.)
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

