"use client";

import { cn } from "@/lib/utils";
import { 
  Inbox, 
  Brain, 
  MessageSquare, 
  Shield, 
  Calendar, 
  ListTodo,
} from "lucide-react";

// 6 core features
const features = [
  {
    icon: Inbox,
    title: "True Unified Inbox",
    benefit: "Stop context-switching.",
    feature: "Gmail, Outlook, Slack, Teams, WhatsApp + Calendar in one place.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Brain,
    title: "AI Priority Engine",
    benefit: "Know what matters instantly.",
    feature: "Urgent / Needs reply / Scheduling / Task / FYI / Spam + confidence.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: MessageSquare,
    title: "Smart Drafts",
    benefit: "Reply faster without sounding robotic.",
    feature: "Multiple draft options, tone match, quick edits.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Auto-send Controls",
    benefit: "Automation without risk.",
    feature: "Auto-send only above your confidence threshold.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Calendar,
    title: "Scheduling Agent",
    benefit: "End calendar back-and-forth.",
    feature: "Detects booking intent → proposes times → confirms.",
    gradient: "from-rose-500 to-red-500",
  },
  {
    icon: ListTodo,
    title: "Task & Follow-up Extraction",
    benefit: "Turn conversations into a to-do list.",
    feature: "Auto-generated tasks + reminders from real messages.",
    gradient: "from-indigo-500 to-violet-500",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            Everything you need to stay ahead of your inbox.
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-2xl border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                {/* Icon with gradient background */}
                <div className="mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    feature.gradient
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold mb-2">
                  {feature.title}
                </h3>

                {/* Benefit - emphasized */}
                <p className="font-medium text-foreground mb-1">
                  {feature.benefit}
                </p>

                {/* Feature description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.feature}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
