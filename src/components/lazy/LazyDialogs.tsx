/**
 * Lazy-loaded Dialog Components
 * Reduces initial bundle size by code-splitting heavy dialog components
 */

'use client';

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy dialogs
export const LazyCreateEditContactDialog = lazy(
  () => import('@/components/contacts/CreateEditContactDialog').then((mod) => ({
    default: mod.CreateEditContactDialog,
  }))
);

export const LazyContactDetailDialog = lazy(
  () => import('@/components/contacts/ContactDetailDialog').then((mod) => ({
    default: mod.ContactDetailDialog,
  }))
);

export const LazyCreateEventDialog = lazy(
  () => import('@/components/calendar/CreateEventDialog').then((mod) => ({
    default: mod.CreateEventDialog,
  }))
);

export const LazyConnectChannelDialog = lazy(
  () => import('@/components/channels/ConnectChannelDialog').then((mod) => ({
    default: mod.ConnectChannelDialog,
  }))
);

// Dialog skeleton fallback
const DialogSkeleton = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-6 w-32" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-24 w-full" />
    <div className="flex justify-end gap-2">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);

// Wrapper component with Suspense
export function withLazyDialog<P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>
) {
  return function LazyDialogWrapper(props: P) {
    return (
      <Suspense fallback={<DialogSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

