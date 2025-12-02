"use client";

import { useSidebar } from "@/components/ui/sidebar";
import Image from "next/image";

/**
 * Sidebar Logo Component
 * Shows full logo when expanded, icon mark when collapsed
 */
export function SidebarLogo() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isCollapsed) {
    // Show icon mark when collapsed
    return (
      <div className="flex items-center justify-center px-1 py-1">
        {/* Dark theme: light mark on dark background */}
        <Image
          src="/logos/aiva-mark-light.svg"
          width={32}
          height={32}
          alt="Aiva"
          className="hidden dark:block"
        />
        {/* Light theme: dark mark on light background */}
        <Image
          src="/logos/aiva-mark-dark.svg"
          width={32}
          height={32}
          alt="Aiva"
          className="block dark:hidden"
        />
      </div>
    );
  }

  // Show full logo when expanded
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {/* Dark theme: light logo on dark background */}
      <Image
        src="/logos/aiva-logo-light.svg"
        width={120}
        height={32}
        alt="Aiva logo"
        className="hidden dark:block"
      />
      {/* Light theme: dark logo on light background */}
      <Image
        src="/logos/aiva-logo-dark.svg"
        width={120}
        height={32}
        alt="Aiva logo"
        className="block dark:hidden"
      />
    </div>
  );
}

