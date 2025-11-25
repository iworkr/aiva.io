import { DashboardLoadingFallback } from "@/components/workspaces/DashboardLoadingFallback";
import { MorningBrief } from "@/components/workspaces/MorningBrief";
import { getCachedSoloWorkspace } from "@/rsc-data/user/workspaces";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const workspace = await getCachedSoloWorkspace();

  return {
    title: `Morning Brief | Aiva.io`,
    description: `Start every day knowing what matters. Your morning briefing with crucial messages and action items.`,
  };
}

export default async function WorkspaceDashboardPage(props: {
  searchParams: Promise<unknown>;
}) {
  const searchParams = await props.searchParams;
  const workspace = await getCachedSoloWorkspace();
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Suspense fallback={<DashboardLoadingFallback />}>
        <MorningBrief />
      </Suspense>
    </div>
  );
}
