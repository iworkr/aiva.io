import { WorkspaceBilling } from "@/components/workspaces/settings/billing/WorkspaceBilling";
import {
  getCachedDefaultWorkspace,
  getCachedSoloWorkspace,
} from "@/rsc-data/user/workspaces";
import { redirect } from "next/navigation";

export default async function WorkspaceSettingsBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let workspaceSlug: string;
  try {
    const workspace = await getCachedSoloWorkspace();
    workspaceSlug = workspace.slug;
  } catch {
    const defaultResponse = await getCachedDefaultWorkspace();
    if (!defaultResponse?.workspace) {
      redirect("/onboarding");
    }
    workspaceSlug = defaultResponse.workspace.slug;
  }

  const resolved = await searchParams;
  const subscriptionRequired =
    resolved?.error === "subscription_required" || resolved?.from === "connect_channel";

  return (
    <WorkspaceBilling
      workspaceSlug={workspaceSlug}
      subscriptionRequiredMessage={subscriptionRequired}
    />
  );
}
