/**
 * PageTitleNavbar Component
 * Shows page title and description in the navbar based on current route
 */

"use client";

import { usePathname } from "next/navigation";
import { T } from "@/components/ui/Typography";

const pageConfig: Record<string, { title: string; description: string }> = {
  "/home": {
    title: "Dashboard",
    description: "Your unified AI communication hub",
  },
  "/inbox": {
    title: "Inbox",
    description: "All your messages in one place",
  },
  "/calendar": {
    title: "Calendar",
    description: "View and manage your events",
  },
  "/contacts": {
    title: "Contacts",
    description: "Manage your contacts",
  },
  "/channels": {
    title: "Channels",
    description: "Connect and manage your communication channels",
  },
  "/settings": {
    title: "Settings",
    description: "Manage your workspace settings and preferences",
  },
  "/settings/billing": {
    title: "Billing",
    description: "Manage your subscription and billing",
  },
  "/settings/members": {
    title: "Members",
    description: "Manage workspace members and permissions",
  },
  "/projects": {
    title: "Projects",
    description: "View and manage your projects",
  },
};

// Match patterns for dynamic routes
const routePatterns: Array<{ pattern: RegExp; config: { title: string; description: string } }> = [
  {
    pattern: /\/inbox\/[^/]+$/,
    config: {
      title: "Message",
      description: "View message details and AI insights",
    },
  },
];

export function PageTitleNavbar() {
  const pathname = usePathname();
  
  // First check route patterns for dynamic routes
  for (const { pattern, config } of routePatterns) {
    if (pattern.test(pathname)) {
      return (
        <div className="flex flex-col">
          <T.P className="text-lg font-semibold">{config.title}</T.P>
          <T.Small className="text-muted-foreground">{config.description}</T.Small>
        </div>
      );
    }
  }
  
  // Extract the route after the locale and workspace path
  // Pathname format: /[locale]/.../inbox or /[locale]/.../workspace/[slug]/inbox
  const routeMatch = pathname.match(/\/(home|inbox|calendar|contacts|channels|settings|projects)(\/.*)?$/);
  const baseRoute = routeMatch ? routeMatch[1] : null;
  
  // Handle nested routes like /settings/billing
  let route = baseRoute || "/home";
  if (baseRoute === "settings" && pathname.includes("/settings/billing")) {
    route = "/settings/billing";
  } else if (baseRoute === "settings" && pathname.includes("/settings/members")) {
    route = "/settings/members";
  } else if (baseRoute) {
    route = `/${baseRoute}`;
  }

  const config = pageConfig[route] || pageConfig["/home"];

  return (
    <div className="flex flex-col">
      <T.P className="text-lg font-semibold">{config.title}</T.P>
      <T.Small className="text-muted-foreground">{config.description}</T.Small>
    </div>
  );
}

