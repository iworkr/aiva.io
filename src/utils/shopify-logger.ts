/**
 * Shopify-specific logger utility
 * Only logs in development to avoid console errors in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const shopifyLogger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, but format them properly
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, you might want to send to error tracking service
      // For now, we'll still log errors but they should be handled gracefully
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
};
