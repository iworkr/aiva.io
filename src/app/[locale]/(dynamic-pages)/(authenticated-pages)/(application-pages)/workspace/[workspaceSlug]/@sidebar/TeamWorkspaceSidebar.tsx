// OrganizationSidebar.tsx (Server Component)

import { SidebarAdminPanelNav } from "@/components/sidebar-admin-panel-nav";
import { SidebarFooterUserNav } from "@/components/sidebar-footer-user-nav";
import { SidebarWorkspaceNav } from "@/components/sidebar-workspace-nav";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  getCachedSlimWorkspaces,
  getCachedWorkspaceBySlug,
} from "@/rsc-data/user/workspaces";
import { workspaceSlugParamSchema } from "@/utils/zod-schemas/params";
import { notFound } from "next/navigation";

export async function TeamWorkspaceSidebar({
  params,
}: {
  params: Promise<unknown>;
}) {
  try {
    const { workspaceSlug } = workspaceSlugParamSchema.parse(await params);
    const [workspace, slimWorkspaces] = await Promise.all([
      getCachedWorkspaceBySlug(workspaceSlug),
      getCachedSlimWorkspaces(),
    ]);
    return (
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1">
            <Image
              src="/logos/aiva-logo-dark.svg"
              width={120}
              height={32}
              alt="Aiva logo"
              className="hidden dark:block"
            />
            <Image
              src="/logos/aiva-logo-light.svg"
              width={120}
              height={32}
              alt="Aiva logo"
              className="block dark:hidden"
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarWorkspaceNav workspace={workspace} />
          <SidebarAdminPanelNav />
          {/* Shopify Integration - External Link */}
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a
                    href="https://shopify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <img
                      src="https://static.cdnlogo.com/logos/s/88/shopify.svg"
                      alt="Shopify"
                      className="h-[15px] w-[15px]"
                    />
                    <span>Shopify Integration</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarFooterUserNav />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  } catch (e) {
    console.error("Error in TeamWorkspaceSidebar", e);
    return notFound();
  }
}
