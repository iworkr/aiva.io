import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ChangelogListSkeletonFallBack() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2 mb-8">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-5 w-96 rounded" />
      </div>

      {/* Changelog items */}
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-24 rounded" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-28 rounded" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-3/4 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
