/**
 * Client-side wrapper for sidebar footer user nav with prefetching
 */

'use client';

import { Link } from "./intl-link";
import { usePrefetch } from "@/hooks/usePrefetch";
import {
  BadgeCheck,
  LogOut,
  Zap,
  HelpCircle,
  Settings,
} from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuGroup,
} from "./ui/dropdown-menu";

interface SidebarFooterUserNavClientProps {
  userEmail: string | null | undefined;
  fullName?: string | null;
  showLogout?: boolean;
}

export function SidebarFooterUserNavClient({ 
  userEmail, 
  fullName,
  showLogout = false
}: SidebarFooterUserNavClientProps) {
  const { onMouseEnter } = usePrefetch();

  if (showLogout) {
    return (
      <DropdownMenuItem asChild>
        <Link 
          href="/logout"
          onMouseEnter={onMouseEnter('/logout')}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem asChild>
        <Link 
          href="/user/settings"
          onMouseEnter={onMouseEnter('/user/settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link 
          href="/channels"
          onMouseEnter={onMouseEnter('/channels')}
        >
          <Zap className="mr-2 h-4 w-4" />
          <span>Connected Channels</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link 
          href="/feedback"
          onMouseEnter={onMouseEnter('/feedback')}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help & Support</span>
        </Link>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

