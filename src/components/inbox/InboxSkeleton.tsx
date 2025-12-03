/**
 * InboxSkeleton Component
 * Loading state for inbox - matches actual inbox layout
 */

import { Skeleton } from '@/components/ui/skeleton';

export function InboxSkeleton() {
  return (
    <div className="flex h-full bg-background">
      {/* Channel Sidebar Skeleton */}
      <div className="w-20 flex flex-col items-center py-4 border-r border-border/50 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-10 rounded-lg" />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border border-border/50 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-2/3 rounded" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

