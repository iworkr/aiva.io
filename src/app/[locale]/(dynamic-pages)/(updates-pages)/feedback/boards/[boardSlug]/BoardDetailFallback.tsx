import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function BoardDetailFallback() {
    return (
        <div className="space-y-6">
            {/* Back button */}
            <Skeleton className="h-9 w-24 rounded-lg" />
            
            {/* Header */}
            <div className="space-y-3">
                <Skeleton className="h-8 w-64 rounded-lg" />
                <Skeleton className="h-5 w-96 rounded" />
            </div>
            
            {/* Filter tabs */}
            <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            
            {/* Feedback items */}
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="border border-border/50">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-start justify-between">
                                <Skeleton className="h-6 w-3/4 rounded" />
                                <Skeleton className="h-6 w-14 rounded" />
                            </div>
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-2/3 rounded" />
                            <div className="flex items-center gap-3 pt-2">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="h-4 w-28 rounded" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
