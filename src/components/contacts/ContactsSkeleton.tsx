/**
 * Contacts Skeleton
 * Loading state for contacts page - matches minimal tile layout
 */

import { Skeleton } from '@/components/ui/skeleton';

export function ContactsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-lg p-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            
            {/* Name and subtitle */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            
            {/* Channel icons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
