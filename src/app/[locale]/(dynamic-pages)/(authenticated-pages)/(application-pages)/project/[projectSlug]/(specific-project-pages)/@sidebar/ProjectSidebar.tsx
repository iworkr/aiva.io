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
import { getSlimProjectBySlug } from "@/data/user/projects";
import { getWorkspaceById } from "@/data/user/workspaces";
import { getCachedProjectBySlug } from "@/rsc-data/user/projects";
import { getCachedSlimWorkspaces } from "@/rsc-data/user/workspaces";
import { projectSlugParamSchema } from "@/utils/zod-schemas/params";
import { notFound } from "next/navigation";
import { ProjectSidebarGroup } from "./ProjectSidebarGroup";

export async function ProjectSidebar(props: { params: Promise<unknown> }) {
  try {
    const params = await props.params;
    const { projectSlug } = projectSlugParamSchema.parse(params);
    const project = await getSlimProjectBySlug(projectSlug);
    const [slimWorkspaces, fullProject] = await Promise.all([
      getCachedSlimWorkspaces(),
      getCachedProjectBySlug(project.slug),
    ]);
    const workspaceId = fullProject.workspace_id;
    const workspace = await getWorkspaceById(workspaceId);

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
          <ProjectSidebarGroup project={fullProject} workspace={workspace} />
          <SidebarWorkspaceNav workspace={workspace} withLinkLabelPrefix />
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
    console.log("error in ProjectSidebar", e);
    return notFound();
  }
}
