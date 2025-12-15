import { Skeleton } from "@/components/ui/skeleton";

export const SettingsFormSkeleton = () => {
  return (
    <div className="max-w-md p-6 space-y-6 rounded-lg">
      <div className="space-y-3">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="pt-4">
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
};
