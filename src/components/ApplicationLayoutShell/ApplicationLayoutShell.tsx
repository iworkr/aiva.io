import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FloatingAssistant } from "@/components/assistant/FloatingAssistant";

export async function ApplicationLayoutShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <SidebarProvider className={cn("h-full flex min-h-0")}>
      {sidebar}
      <SidebarInset className={cn("overflow-hidden flex-1 flex flex-col min-h-0")}>
        {children}
      </SidebarInset>
      {/* Global AI Assistant Bubble */}
      <FloatingAssistant />
    </SidebarProvider>
  );
}
