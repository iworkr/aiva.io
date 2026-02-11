import { WorkspaceBilling } from "@/components/workspaces/settings/billing/WorkspaceBilling";
import { workspaceSlugParamSchema } from "@/utils/zod-schemas/params";

export default async function WorkspaceSettingsBillingPage(props: {
  params: Promise<unknown>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const { workspaceSlug } = workspaceSlugParamSchema.parse(params);
  const resolved = await props.searchParams;
  const subscriptionRequired =
    resolved?.error === "subscription_required" || resolved?.from === "connect_channel";
  return (
    <WorkspaceBilling
      workspaceSlug={workspaceSlug}
      subscriptionRequiredMessage={subscriptionRequired}
    />
  );
}
