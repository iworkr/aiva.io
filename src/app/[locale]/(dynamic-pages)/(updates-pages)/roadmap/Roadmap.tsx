"use server";
import { Link } from "@/components/intl-link";
import { T } from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import { RoadmapList } from "./_components/RoadmapList";
import type { RoadmapData } from "./types";
import { MessageSquare, Map } from "lucide-react";

export async function Roadmap({ roadmapData }: { roadmapData: RoadmapData }) {
  const allItems = [...roadmapData.inProgress, ...roadmapData.plannedCards];

  return (
    <div className="md:flex gap-4 w-full">
      <div className="flex-1">
        <div className="flex flex-col border rounded-lg bg-card">
          {allItems.length > 0 ? (
            <RoadmapList cards={allItems} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
                <Map className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Roadmap Coming Soon</h3>
              <p className="text-base text-muted-foreground max-w-md mb-8">
                We're planning exciting features for Aiva.io. Want to influence what we build next? Share your ideas with us!
              </p>
              <Button asChild className="shadow-md hover:shadow-lg transition-all h-9 px-5 font-medium">
                <Link href="/feedback">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Submit Your Ideas
                </Link>
              </Button>
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
