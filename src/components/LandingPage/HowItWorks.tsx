"use client";

import { cn } from "@/lib/utils";
import { Link2, Brain, Sparkles, ArrowRight } from "lucide-react";
import Image from "next/image";
import { CHANNEL_LOGOS } from "@/constants/channel-logos";

// 3 steps
const steps = [
  {
    number: "1",
    icon: Link2,
    title: "Connect your inboxes",
    description: "Link Gmail, Outlook, Slack, Teams, WhatsApp, and your calendar in just a few clicks. Secure OAuth — no passwords stored.",
    visual: "connect",
  },
  {
    number: "2",
    icon: Brain,
    title: "Aiva reads and learns",
    description: "Our AI analyzes urgency, intent, tone, and priorities. It learns your communication style and preferences over time.",
    visual: "learn",
  },
  {
    number: "3",
    icon: Sparkles,
    title: "Aiva acts",
    description: "Drafts replies, schedules meetings, extracts tasks, and organizes your inbox — all with your approval controls.",
    visual: "act",
  },
];

// Small channel icons for the connect visual
const channelIcons = ["gmail", "outlook", "slack", "teams", "whatsapp", "googleCalendar"];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 px-6 w-full bg-muted/30">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            Set it up once. Aiva works in the background.
          </h2>
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Connecting arrow (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 -right-3 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Step number and icon */}
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-background border-2 border-primary/20 flex items-center justify-center shadow-lg">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold pt-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed max-w-sm">
                    {step.description}
                  </p>

                  {/* Visual indicators */}
                  {step.visual === "connect" && (
                    <div className="flex items-center gap-2 pt-2">
                      {channelIcons.slice(0, 5).map((channel, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-background border flex items-center justify-center"
                        >
                          <Image
                            src={CHANNEL_LOGOS[channel as keyof typeof CHANNEL_LOGOS]}
                            alt={channel}
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                        </div>
                      ))}
                      <span className="text-xs text-muted-foreground">+more</span>
                    </div>
                  )}
                  
                  {step.visual === "learn" && (
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Urgent
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Reply
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Schedule
                      </div>
                    </div>
                  )}
                  
                  {step.visual === "act" && (
                    <div className="flex items-center gap-2 pt-2">
                      <div className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/50 text-green-600 text-xs">
                        ✓ Draft ready
                      </div>
                      <div className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 text-xs">
                        📅 Meeting set
                      </div>
                      <div className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 text-xs">
                        ☑ Task added
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
