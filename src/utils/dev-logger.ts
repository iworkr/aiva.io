/**
 * Development Logger Utility
 * Only logs in development environment to avoid console noise in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};
