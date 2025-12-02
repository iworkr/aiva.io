"use server";
import { Link } from "@/components/intl-link";
import { T } from "@/components/ui/Typography";
import { RoadmapList } from "./_components/RoadmapList";
import type { RoadmapData } from "./types";

export async function Roadmap({ roadmapData }: { roadmapData: RoadmapData }) {
  const allItems = [...roadmapData.inProgress, ...roadmapData.plannedCards];

  return (
    <div className="md:flex gap-4 w-full">
      <div className="flex-1">
        <div className="flex flex-col border rounded-lg bg-card">
          {allItems.length > 0 ? (
            <RoadmapList cards={allItems} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-1">Roadmap Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                We're planning exciting features for Aiva.io. Check back soon to see what's next!
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block w-[300px] space-y-4">
        <div className="border rounded-lg bg-card p-4 space-y-3">
          <T.H4 className="font-semibold mt-0">Have a suggestion?</T.H4>
          <p className="text-sm text-muted-foreground">
            We&apos;d love to hear your ideas for improving the platform.
          </p>
          <Link
            href="/feedback"
            className="text-primary underline font-medium text-sm hover:text-primary/80"
          >
            Submit feedback →
          </Link>
        </div>

        <div className="border rounded-lg bg-card p-4 space-y-3">
          <T.H4 className="font-semibold mt-0">Statistics</T.H4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-medium">
                {roadmapData.inProgress.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Planned</span>
              <span className="font-medium">
                {roadmapData.plannedCards.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
