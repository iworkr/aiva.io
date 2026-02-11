import { WorkspaceBilling } from "@/components/workspaces/settings/billing/WorkspaceBilling";
import { getCachedSoloWorkspace } from "@/rsc-data/user/workspaces";

export default async function WorkspaceSettingsBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const workspace = await getCachedSoloWorkspace();
  const resolved = await searchParams;
  const subscriptionRequired =
    resolved?.error === "subscription_required" || resolved?.from === "connect_channel";
  return (
    <WorkspaceBilling
      workspaceSlug={workspace.slug}
      subscriptionRequiredMessage={subscriptionRequired}
    />
  );
}
