"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  MessageSquare, 
  Check,
  Clock,
  AlertCircle,
  Calendar,
  ListTodo,
  MailOpen,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { CHANNEL_LOGOS } from "@/constants/channel-logos";

// Channel icons for sidebar
const channels = [
  { name: "Gmail", logo: CHANNEL_LOGOS.gmail, unread: 12 },
  { name: "Slack", logo: CHANNEL_LOGOS.slack, unread: 5 },
  { name: "WhatsApp", logo: CHANNEL_LOGOS.whatsapp, unread: 3 },
  { name: "Teams", logo: CHANNEL_LOGOS.teams, unread: 2 },
];

// Priority types
const priorityConfig = {
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-600 border-red-200" },
  reply: { label: "Needs reply", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  scheduling: { label: "Scheduling", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  task: { label: "Task", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  fyi: { label: "FYI", color: "bg-slate-500/10 text-slate-600 border-slate-200" },
};

// Sample messages
const messages = [
  {
    id: 1,
    from: "Sarah Chen",
    subject: "Q4 Budget Review - Need Approval Today",
    channel: "gmail",
    priority: "urgent",
    time: "2m ago",
    confidence: 98,
  },
  {
    id: 2,
    from: "Mike Johnson",
    subject: "Can we schedule a call this week?",
    channel: "slack",
    priority: "scheduling",
    time: "15m ago",
    confidence: 94,
  },
  {
    id: 3,
    from: "Client: Acme Corp",
    subject: "RE: Project proposal questions",
    channel: "gmail",
    priority: "reply",
    time: "1h ago",
    confidence: 87,
  },
  {
    id: 4,
    from: "Team Updates",
    subject: "Weekly standup notes",
    channel: "teams",
    priority: "fyi",
    time: "2h ago",
    confidence: 92,
  },
];

// Draft suggestions
const draftOptions = [
  { id: 1, label: "Friendly", preview: "Hi Sarah! Thanks for sending this over. I've reviewed the Q4 budget and everything looks good..." },
  { id: 2, label: "Professional", preview: "Dear Sarah, Thank you for the budget review. I have approved the Q4 figures as submitted..." },
  { id: 3, label: "Brief", preview: "Sarah - Budget approved. Let me know if you need anything else." },
];

// Extracted tasks
const extractedTasks = [
  { id: 1, task: "Review Q4 budget proposal", due: "Today", done: true },
  { id: 2, task: "Schedule call with Mike", due: "This week", done: false },
  { id: 3, task: "Reply to Acme Corp proposal", due: "Tomorrow", done: false },
];

export function HeroUIDemo() {
  const [activeMessage, setActiveMessage] = useState(0);
  const [selectedDraft, setSelectedDraft] = useState(0);
  const [confidenceValue, setConfidenceValue] = useState(92);

  // Animate through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMessage((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Animate confidence meter
  useEffect(() => {
    const interval = setInterval(() => {
      setConfidenceValue((prev) => {
        const newValue = prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3);
        return Math.max(85, Math.min(98, newValue));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentMessage = messages[activeMessage];
  const priority = priorityConfig[currentMessage.priority as keyof typeof priorityConfig];

  return (
    <div className="grid lg:grid-cols-[240px_1fr_280px] h-[480px] lg:h-[520px] overflow-hidden">
      {/* Left Sidebar - Channels */}
      <div className="hidden lg:flex flex-col border-r bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-6 px-2">
          <Image
            src="/logos/aiva-mark.svg"
            alt="Aiva"
            width={24}
            height={24}
            className="dark:invert"
          />
          <span className="font-semibold">Channels</span>
        </div>
        
        <div className="space-y-1">
          {channels.map((channel, index) => (
            <div
              key={channel.name}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
                index === 0 ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
              )}
            >
              <Image
                src={channel.logo}
                alt={channel.name}
                width={20}
                height={20}
                className="object-contain"
              />
              <span className="flex-1 text-sm font-medium">{channel.name}</span>
              {channel.unread > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                  {channel.unread}
                </Badge>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Calendar</span>
          </div>
        </div>
      </div>

      {/* Center - Message List */}
      <div className="flex flex-col border-r overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <h3 className="font-semibold text-sm">Priority Inbox</h3>
          <Badge variant="outline" className="text-xs">
            {messages.length} messages
          </Badge>
        </div>
        
        <div className="flex-1 overflow-auto">
          {messages.map((message, index) => {
            const msgPriority = priorityConfig[message.priority as keyof typeof priorityConfig];
            const isActive = index === activeMessage;
            
            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-all duration-300",
                  isActive && "bg-primary/5 border-l-2 border-l-primary"
                )}
                onClick={() => setActiveMessage(index)}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Image
                    src={CHANNEL_LOGOS[message.channel as keyof typeof CHANNEL_LOGOS]}
                    alt={message.channel}
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{message.from}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{message.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{message.subject}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", msgPriority.color)}>
                      {msgPriority.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {message.confidence}% confident
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel - AI Suggestions */}
      <div className="hidden lg:flex flex-col bg-muted/20 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-background">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Aiva Suggestions</span>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Confidence meter */}
          <div className="p-3 rounded-lg border bg-background">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">Auto-send confidence</span>
              <span className={cn(
                "text-xs font-bold",
                confidenceValue >= 90 ? "text-green-600" : "text-amber-600"
              )}>
                {confidenceValue}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  confidenceValue >= 90 ? "bg-green-500" : "bg-amber-500"
                )}
                style={{ width: `${confidenceValue}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {confidenceValue >= 90 ? "Safe to auto-send" : "Review recommended"}
            </p>
          </div>

          {/* Draft options */}
          <div>
            <span className="text-xs font-medium text-muted-foreground mb-2 block">Draft replies</span>
            <div className="space-y-2">
              {draftOptions.map((draft, index) => (
                <div
                  key={draft.id}
                  className={cn(
                    "p-2.5 rounded-lg border cursor-pointer transition-all duration-200",
                    selectedDraft === index
                      ? "border-primary bg-primary/5"
                      : "bg-background hover:border-primary/50"
                  )}
                  onClick={() => setSelectedDraft(index)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {draft.label}
                    </Badge>
                    {selectedDraft === index && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {draft.preview}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Extracted tasks */}
          <div>
            <span className="text-xs font-medium text-muted-foreground mb-2 block">Extracted tasks</span>
            <div className="space-y-1.5">
              {extractedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background border"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                    task.done ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {task.done && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[11px] truncate",
                      task.done && "line-through text-muted-foreground"
                    )}>
                      {task.task}
                    </p>
                    <span className="text-[10px] text-muted-foreground">{task.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="p-4 border-t bg-background">
          <Button size="sm" className="w-full gap-2">
            <Check className="w-3.5 h-3.5" />
            Approve & Send
          </Button>
        </div>
      </div>
    </div>
  );
}
