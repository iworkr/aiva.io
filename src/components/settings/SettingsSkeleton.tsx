/**
 * SettingsSkeleton Component
 * Loading state for settings view - matches actual UI layout
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SettingsSkeleton() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Page header */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-5 w-64 rounded" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 border-b border-border/50 pb-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>

        {/* Cards skeleton */}
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="border border-border/50">
              <CardHeader className="pb-4">
                <Skeleton className="h-6 w-48 rounded" />
                <Skeleton className="h-4 w-72 rounded" />
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Form fields */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                {/* Toggle rows */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-36 rounded" />
                    <Skeleton className="h-3 w-48 rounded" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save button skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

