/**
 * AIStatusProvider
 * Context provider for AI status state across the application
 */

"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAIStatus, UseAIStatusReturn, AIStatusEvent } from "@/hooks/useAIStatus";

interface AIStatusContextValue extends UseAIStatusReturn {
  workspaceId: string;
}

const AIStatusContext = createContext<AIStatusContextValue | null>(null);

interface AIStatusProviderProps {
  workspaceId: string;
  children: ReactNode;
}

export function AIStatusProvider({ workspaceId, children }: AIStatusProviderProps) {
  const aiStatus = useAIStatus(workspaceId);

  return (
    <AIStatusContext.Provider value={{ ...aiStatus, workspaceId }}>
      {children}
    </AIStatusContext.Provider>
  );
}

export function useAIStatusContext(): AIStatusContextValue {
  const context = useContext(AIStatusContext);
  if (!context) {
    throw new Error("useAIStatusContext must be used within an AIStatusProvider");
  }
  return context;
}

/**
 * Helper function to broadcast AI status from server actions
 * This creates a Supabase client and broadcasts the event
 */
export async function broadcastAIStatus(
  workspaceId: string,
  event: Omit<AIStatusEvent, "timestamp">
): Promise<void> {
  // Dynamic import to avoid issues in server context
  const { createSupabaseUserServerActionClient } = await import(
    "@/supabase-clients/user/createSupabaseUserServerActionClient"
  );
  
  const supabase = await createSupabaseUserServerActionClient();
  const channelName = `ai-status:${workspaceId}`;

  const fullEvent: AIStatusEvent = {
    ...event,
    timestamp: Date.now(),
  };

  await supabase.channel(channelName).send({
    type: "broadcast",
    event: "ai-status",
    payload: fullEvent,
  });
}

