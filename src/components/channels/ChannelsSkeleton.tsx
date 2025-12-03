/**
 * ChannelsSkeleton Component
 * Loading state for channels view - matches actual UI layout
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function ChannelsSkeleton() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-5 w-56 rounded" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>

        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-7 w-12 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section header */}
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Channels list skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border border-border/50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32 rounded" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-3 w-36 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

