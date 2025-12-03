/**
 * MessageDetailSkeleton Component
 * Loading state for message detail view - matches actual layout
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function MessageDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <Card className="border border-border/50">
        <CardHeader className="space-y-4">
          {/* Tags and actions row */}
          <div className="flex items-start justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
          
          {/* Subject */}
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          
          {/* Sender info */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Message body */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          
          {/* Quick reply section */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

