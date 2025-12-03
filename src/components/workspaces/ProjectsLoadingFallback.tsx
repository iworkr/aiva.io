import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  quantity: number;
};

const ProjectsLoadingFallback = ({ quantity }: Props) => {
  return (
    <div className="flex w-full gap-4 overflow-x-auto pb-2">
      {[...Array(quantity)].map((_, i) => (
        <Card
          className="flex-shrink-0 w-72 border border-border/50"
          key={`${i}skeleton`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-full rounded" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export { ProjectsLoadingFallback };
