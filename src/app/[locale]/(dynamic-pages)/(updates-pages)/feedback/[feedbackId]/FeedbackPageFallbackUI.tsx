import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { clsx } from "clsx";

export function FeedbackDetailFallback() {
  return (
    <Card className="h-full flex flex-col border border-border/50">
      <CardHeader className="space-y-4">
        {/* Title and meta */}
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-3/4 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        {/* Author info */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 py-6 space-y-4">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-32 w-full rounded-lg mt-4" />
      </CardContent>
      <div className="border-t border-border/50 p-4 space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </Card>
  );
}

function FeedbackPageFallbackUI({ feedbackId }: { feedbackId: string }) {
  return (
    <div className="h-full flex md:gap-4">
      {/* List panel */}
      <div
        className={clsx(
          feedbackId && "hidden",
          "md:flex flex-col flex-1 h-full",
        )}
      >
        {/* Search and filters */}
        <div className="flex flex-col gap-3 mb-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="w-24 h-8 rounded-full" />
            <Skeleton className="w-28 h-8 rounded-full" />
            <Skeleton className="w-20 h-8 rounded-full" />
          </div>
        </div>
        {/* Feedback list */}
        <div className="flex flex-col flex-1 overflow-y-auto gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-5 w-12 rounded" />
                </div>
                <Skeleton className="h-4 w-full rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Pagination */}
        <div className="border-t border-border/50 py-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>
      <Separator orientation="vertical" className="hidden md:block" />
      {/* Detail panel */}
      <div
        className={clsx(!feedbackId && "hidden", "md:block flex-1 relative")}
      >
        <FeedbackDetailFallback />
      </div>
    </div>
  );
}

export default FeedbackPageFallbackUI;

