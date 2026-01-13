"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
  Inbox, 
  Brain, 
  MessageSquare, 
  Calendar, 
  ListTodo,
  Check,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { CHANNEL_LOGOS } from "@/constants/channel-logos";

// Features to showcase
const features = [
  {
    id: "unified",
    icon: Inbox,
    title: "Unified Inbox",
    description: "All your channels in one place",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "priority",
    icon: Brain,
    title: "AI Priority Engine",
    description: "Know what matters instantly",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "drafts",
    icon: MessageSquare,
    title: "Smart Drafts",
    description: "Reply faster, sound like you",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "scheduling",
    icon: Calendar,
    title: "Scheduling Agent",
    description: "End calendar back-and-forth",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

// Sample messages for the demo
const demoMessages = [
  { from: "Sarah Chen", subject: "Q4 Budget Review", priority: "urgent", channel: "gmail" },
  { from: "Mike Johnson", subject: "Can we meet this week?", priority: "scheduling", channel: "slack" },
  { from: "Acme Corp", subject: "RE: Project proposal", priority: "reply", channel: "gmail" },
  { from: "Team Updates", subject: "Weekly standup notes", priority: "fyi", channel: "teams" },
];

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-600 border-red-200" },
  reply: { label: "Needs reply", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  scheduling: { label: "Scheduling", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  fyi: { label: "FYI", color: "bg-slate-500/10 text-slate-600 border-slate-200" },
};

export function AuthFeatureShowcase() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeMessage, setActiveMessage] = useState(0);
  const [confidenceValue, setConfidenceValue] = useState(92);

  // Rotate through features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Rotate through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMessage((prev) => (prev + 1) % demoMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Animate confidence
  useEffect(() => {
    const interval = setInterval(() => {
      setConfidenceValue((prev) => {
        const newValue = prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3);
        return Math.max(85, Math.min(98, newValue));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI-Powered</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Your AI executive assistant
        </h2>
        <p className="text-muted-foreground">
          Never miss what matters again
        </p>
      </div>

      {/* Animated inbox demo */}
      <div className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
        {/* Mini inbox header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {["gmail", "slack", "teams"].map((channel) => (
                <div key={channel} className="w-6 h-6 rounded-full bg-background border flex items-center justify-center">
                  <Image
                    src={CHANNEL_LOGOS[channel as keyof typeof CHANNEL_LOGOS]}
                    alt={channel}
                    width={14}
                    height={14}
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
            <span className="text-sm font-medium">Priority Inbox</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {demoMessages.length} new
          </Badge>
        </div>

        {/* Messages */}
        <div className="p-3 space-y-2">
          {demoMessages.map((msg, index) => {
            const priority = priorityConfig[msg.priority];
            const isActive = index === activeMessage;
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all duration-500",
                  isActive 
                    ? "bg-primary/5 border-primary/30 shadow-sm" 
                    : "bg-background/50 border-transparent"
                )}
              >
                <Image
                  src={CHANNEL_LOGOS[msg.channel as keyof typeof CHANNEL_LOGOS]}
                  alt={msg.channel}
                  width={20}
                  height={20}
                  className="object-contain flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{msg.from}</p>
                  <p className="text-xs text-muted-foreground truncate">{msg.subject}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", priority.color)}>
                  {priority.label}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* AI suggestion panel */}
        <div className="px-4 py-3 border-t bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">Aiva Suggestion</span>
          </div>
          <div className="p-2 rounded-lg bg-background border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <span className={cn(
                "text-xs font-bold",
                confidenceValue >= 90 ? "text-green-600" : "text-amber-600"
              )}>
                {confidenceValue}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  confidenceValue >= 90 ? "bg-green-500" : "bg-amber-500"
                )}
                style={{ width: `${confidenceValue}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isActive = index === activeFeature;
          return (
            <div
              key={feature.id}
              className={cn(
                "p-3 rounded-xl border transition-all duration-500",
                isActive 
                  ? "bg-primary/5 border-primary/30 shadow-sm" 
                  : "bg-card/50 border-transparent hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                feature.bgColor
              )}>
                <Icon className={cn("w-4 h-4", feature.color)} />
              </div>
              <p className="text-sm font-medium">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          );
        })}
      </div>

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          <span>Enterprise security</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="w-3.5 h-3.5" />
          <span>SOC 2 compliant</span>
        </div>
      </div>
    </div>
  );
}
