/**
 * API Cache Headers Utility
 * Provides consistent cache headers for API routes
 */

import { NextResponse } from 'next/server';

export interface CacheOptions {
  maxAge?: number; // in seconds
  staleWhileRevalidate?: number; // in seconds
  immutable?: boolean;
  private?: boolean;
  noCache?: boolean;
  noStore?: boolean;
}

/**
 * Creates cache headers for API responses
 */
export function createCacheHeaders(options: CacheOptions = {}): Record<string, string> {
  const {
    maxAge = 60, // Default 1 minute
    staleWhileRevalidate,
    immutable = false,
    private: isPrivate = false,
    noCache = false,
    noStore = false,
  } = options;

  const headers: Record<string, string> = {};

  if (noStore) {
    headers['Cache-Control'] = 'no-store';
    return headers;
  }

  if (noCache) {
    headers['Cache-Control'] = 'no-cache, must-revalidate';
    return headers;
  }

  const directives: string[] = [];

  if (isPrivate) {
    directives.push('private');
  } else {
    directives.push('public');
  }

  if (immutable) {
    directives.push(`max-age=${maxAge}`, 'immutable');
  } else {
    directives.push(`max-age=${maxAge}`);
    if (staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    } else {
      directives.push('must-revalidate');
    }
  }

  headers['Cache-Control'] = directives.join(', ');

  // Add ETag support hint
  headers['Vary'] = 'Accept, Accept-Encoding';

  return headers;
}

/**
 * Wraps a NextResponse with cache headers
 */
export function withCacheHeaders(
  response: NextResponse,
  options: CacheOptions = {}
): NextResponse {
  const headers = createCacheHeaders(options);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Preset cache configurations
 */
export const CachePresets = {
  /** Static assets - cache forever */
  static: (): CacheOptions => ({
    maxAge: 31536000, // 1 year
    immutable: true,
  }),

  /** API data that changes rarely - cache for 5 minutes */
  apiStable: (): CacheOptions => ({
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
  }),

  /** API data that changes frequently - cache for 30 seconds */
  apiDynamic: (): CacheOptions => ({
    maxAge: 30,
    staleWhileRevalidate: 60,
  }),

  /** User-specific data - private cache */
  userData: (): CacheOptions => ({
    maxAge: 60,
    private: true,
  }),

  /** No cache - always fresh */
  noCache: (): CacheOptions => ({
    noCache: true,
  }),

  /** No store - never cache */
  noStore: (): CacheOptions => ({
    noStore: true,
  }),
};

