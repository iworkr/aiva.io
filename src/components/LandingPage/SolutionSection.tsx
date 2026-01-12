"use client";

import { cn } from "@/lib/utils";
import { Inbox, Brain, Zap } from "lucide-react";

// Three pillars of Aiva
const pillars = [
  {
    icon: Inbox,
    title: "Unified Inbox",
    description: "One place for every channel — with shared team visibility.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Brain,
    title: "AI Priority Engine",
    description: "Every message labeled with intent + urgency + confidence.",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  {
    icon: Zap,
    title: "Actions on autopilot",
    description: "Drafts, scheduling, and tasks — with controls you decide.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
  },
];

export default function SolutionSection() {
  return (
    <section className="py-20 lg:py-28 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            A command center for communication.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Not another inbox. Aiva unifies channels and turns conversations into clear next steps.
          </p>
        </div>

        {/* Three pillars */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div
                key={index}
                className="group relative p-6 lg:p-8 rounded-2xl border bg-background hover:shadow-lg transition-all duration-300"
              >
                {/* Background gradient */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  pillar.gradient
                )} />
                
                <div className="relative space-y-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center bg-muted group-hover:bg-background/80 transition-colors",
                  )}>
                    <Icon className={cn("w-7 h-7", pillar.iconColor)} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-semibold">{pillar.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
