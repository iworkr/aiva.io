'use client';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SlimWorkspace } from "@/types";
import { getWorkspaceSubPath } from "@/utils/workspaces";
import {
  Home,
  Inbox,
  Calendar,
  Settings,
  Users,
  UserCircle,
} from "lucide-react";
import { Link } from "./intl-link";
import { usePrefetch } from "@/hooks/usePrefetch";
import { memo } from "react";
import { usePathname } from "next/navigation";

export const SidebarWorkspaceNav = memo(function SidebarWorkspaceNav({
  workspace,
  withLinkLabelPrefix = false,
}: {
  workspace: SlimWorkspace;
  withLinkLabelPrefix?: boolean;
}) {
  const { onMouseEnter } = usePrefetch();
  const pathname = usePathname();
  
  let sidebarLinks = [
    { label: "Home", href: "/home", icon: <Home className="h-5 w-5" /> },
    {
      label: "Inbox",
      href: "/inbox",
      icon: <Inbox className="h-5 w-5" />,
    },
    {
      label: "Calendar",
      href: "/calendar",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: "Contacts",
      href: "/contacts",
      icon: <UserCircle className="h-5 w-5" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  if (workspace.membershipType === "team") {
    // pop the last item
    const lastItem = sidebarLinks.pop();
    sidebarLinks.push({
      label: "Members",
      href: "/settings/members",
      icon: <Users className="h-5 w-5" />,
    });
    if (lastItem) {
      sidebarLinks.push(lastItem);
    }
  }

  if (withLinkLabelPrefix) {
    sidebarLinks = sidebarLinks.map((link) => ({
      ...link,
      label: `Workspace ${link.label}`,
    }));
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {sidebarLinks.map((link) => {
          const href = getWorkspaceSubPath(workspace, link.href);
          const isActive = pathname === href || pathname?.startsWith(href + '/');
          return (
            <SidebarMenuItem key={link.label}>
              <SidebarMenuButton 
                asChild 
                isActive={isActive}
              >
                <Link 
                  href={href}
                  onMouseEnter={onMouseEnter(href)}
                  className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
});
