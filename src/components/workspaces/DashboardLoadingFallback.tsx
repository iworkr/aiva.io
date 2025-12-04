"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonWithTimeout } from "@/components/ui/skeleton-with-timeout";
import { ProjectsLoadingFallback } from "./ProjectsLoadingFallback";

export const DashboardLoadingFallback = () => {
  return (
    <SkeletonWithTimeout timeoutMs={10000} className="flex flex-col space-y-8 mt-6 w-full">
      {/* Header with greeting and search */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-5 w-40 rounded" />
        </div>
        <div className="gap-3 md:flex hidden">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>

      {/* Aiva chat input skeleton */}
      <Skeleton className="h-11 w-full rounded-xl" />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-6 w-10 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Morning brief section */}
      <Card className="border border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-64 rounded" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/30">
              <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Projects section */}
      <div>
        <Skeleton className="h-7 w-32 rounded mb-4" />
        <ProjectsLoadingFallback quantity={3} />
      </div>
    </SkeletonWithTimeout>
  );
};
