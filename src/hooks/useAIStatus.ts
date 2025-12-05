/**
 * useAIStatus Hook
 * Subscribe to AI status updates via Supabase Realtime
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabaseUserClientComponent } from "@/supabase-clients/user/supabaseUserClientComponent";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type AIStatusType = 
  | "idle"
  | "searching"
  | "summarizing"
  | "classifying"
  | "drafting"
  | "found";

export interface AIStatusEvent {
  type: AIStatusType;
  message: string;
  detail?: string;
  progress?: number;
  foundResource?: {
    type: "email" | "file" | "contact";
    title: string;
    preview?: string;
  };
  apps?: string[];
  timestamp: number;
}

export interface UseAIStatusReturn {
  status: AIStatusType;
  message: string;
  detail?: string;
  progress?: number;
  foundResource?: AIStatusEvent["foundResource"];
  apps?: string[];
  isActive: boolean;
  history: AIStatusEvent[];
  broadcast: (event: Omit<AIStatusEvent, "timestamp">) => void;
  clear: () => void;
}

const STATUS_MESSAGES: Record<AIStatusType, string> = {
  idle: "",
  searching: "Searching across your apps...",
  summarizing: "Summarizing this conversation...",
  classifying: "Analyzing message content...",
  drafting: "Drafting a reply for you...",
  found: "Found something helpful!",
};

export function useAIStatus(workspaceId: string): UseAIStatusReturn {
  const [status, setStatus] = useState<AIStatusType>("idle");
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<string>();
  const [progress, setProgress] = useState<number>();
  const [foundResource, setFoundResource] = useState<AIStatusEvent["foundResource"]>();
  const [apps, setApps] = useState<string[]>();
  const [history, setHistory] = useState<AIStatusEvent[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-clear status after inactivity
  const scheduleAutoClear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setStatus("idle");
      setMessage("");
      setDetail(undefined);
      setProgress(undefined);
      setApps(undefined);
    }, 5000); // Clear after 5 seconds of no updates
  }, []);

  const handleStatusEvent = useCallback((event: AIStatusEvent) => {
    setStatus(event.type);
    setMessage(event.message || STATUS_MESSAGES[event.type]);
    setDetail(event.detail);
    setProgress(event.progress);
    setFoundResource(event.foundResource);
    setApps(event.apps);
    setHistory(prev => [...prev.slice(-9), event]); // Keep last 10 events

    if (event.type !== "idle") {
      scheduleAutoClear();
    }
  }, [scheduleAutoClear]);

  // Broadcast a status event (for local updates before server confirms)
  const broadcast = useCallback((event: Omit<AIStatusEvent, "timestamp">) => {
    const fullEvent: AIStatusEvent = {
      ...event,
      timestamp: Date.now(),
    };
    
    // Update local state immediately
    handleStatusEvent(fullEvent);

    // Broadcast to other clients via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "ai-status",
        payload: fullEvent,
      });
    }
  }, [handleStatusEvent]);

  const clear = useCallback(() => {
    setStatus("idle");
    setMessage("");
    setDetail(undefined);
    setProgress(undefined);
    setFoundResource(undefined);
    setApps(undefined);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    const supabase = supabaseUserClientComponent;
    const channelName = `ai-status:${workspaceId}`;

    // Subscribe to AI status channel
    const channel = supabase.channel(channelName)
      .on("broadcast", { event: "ai-status" }, ({ payload }) => {
        handleStatusEvent(payload as AIStatusEvent);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [workspaceId, handleStatusEvent]);

  return {
    status,
    message,
    detail,
    progress,
    foundResource,
    apps,
    isActive: status !== "idle",
    history,
    broadcast,
    clear,
  };
}

