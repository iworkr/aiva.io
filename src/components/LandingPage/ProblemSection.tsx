"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, DollarSign, Users, Frown } from "lucide-react";
import Image from "next/image";
import { CHANNEL_LOGOS } from "@/constants/channel-logos";

// Problem outcomes
const problems = [
  { icon: DollarSign, label: "Missed revenue", color: "text-red-500" },
  { icon: Users, label: "Frustrated clients", color: "text-amber-500" },
  { icon: Clock, label: "Late decisions", color: "text-orange-500" },
  { icon: Frown, label: "Constant inbox anxiety", color: "text-purple-500" },
];

// Floating message cards for the visual
const floatingMessages = [
  { channel: "gmail", label: "Urgent: Contract review", status: "missed", offset: { x: 10, y: 20 } },
  { channel: "slack", label: "Can we talk?", status: "unread", offset: { x: 60, y: 35 } },
  { channel: "whatsapp", label: "Following up...", status: "overdue", offset: { x: 25, y: 60 } },
  { channel: "teams", label: "Meeting request", status: "pending", offset: { x: 70, y: 15 } },
  { channel: "outlook", label: "RE: Proposal", status: "buried", offset: { x: 40, y: 75 } },
];

export default function ProblemSection() {
  return (
    <section className="py-20 lg:py-28 px-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Visual - Channel Storm */}
          <div className="relative h-[400px] lg:h-[450px] order-2 lg:order-1">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-amber-500/5 to-orange-500/5 rounded-3xl" />
            
            {/* Floating message cards */}
            {floatingMessages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "absolute flex items-center gap-2 px-3 py-2 rounded-lg border bg-background/95 shadow-lg",
                  "animate-float transition-all duration-500",
                  msg.status === "missed" && "border-red-300 bg-red-50/80 dark:bg-red-950/30",
                  msg.status === "overdue" && "border-amber-300 bg-amber-50/80 dark:bg-amber-950/30",
                  msg.status === "unread" && "border-blue-300 bg-blue-50/80 dark:bg-blue-950/30",
                  msg.status === "pending" && "border-purple-300 bg-purple-50/80 dark:bg-purple-950/30",
                  msg.status === "buried" && "border-slate-300 bg-slate-50/80 dark:bg-slate-950/30"
                )}
                style={{
                  left: `${msg.offset.x}%`,
                  top: `${msg.offset.y}%`,
                  animationDelay: `${index * 0.5}s`,
                }}
              >
                <Image
                  src={CHANNEL_LOGOS[msg.channel as keyof typeof CHANNEL_LOGOS]}
                  alt={msg.channel}
                  width={20}
                  height={20}
                  className="object-contain flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{msg.label}</p>
                  <p className={cn(
                    "text-[10px] capitalize",
                    msg.status === "missed" && "text-red-600",
                    msg.status === "overdue" && "text-amber-600",
                    msg.status === "unread" && "text-blue-600",
                    msg.status === "pending" && "text-purple-600",
                    msg.status === "buried" && "text-slate-600"
                  )}>
                    {msg.status === "missed" ? "⚠ Missed lead" : 
                     msg.status === "overdue" ? "⏰ Overdue follow-up" :
                     msg.status === "unread" ? "📬 Unread" :
                     msg.status === "pending" ? "⏳ Pending" : "📥 Buried"}
                  </p>
                </div>
              </div>
            ))}

            {/* Center warning icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-500/70" />
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="space-y-6 order-1 lg:order-2">
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
              Modern communication is scattered — and expensive.
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              Messages live everywhere. Urgent requests get buried. Scheduling threads never end. 
              Follow-ups slip. Teams double-reply — or miss the moment entirely.
            </p>

            {/* Problem outcomes */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {problems.map((problem, index) => {
                const Icon = problem.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center bg-background",
                      problem.color
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">{problem.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating animation styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(1deg);
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
