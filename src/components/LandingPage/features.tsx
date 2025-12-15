"use client";

import { Link } from "@/components/intl-link";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, MessageSquare, Calendar, Inbox, Zap, Search, Shield, ArrowRight } from "lucide-react";
import TitleBlock from "../title-block";
import { AITriageVignette } from "@/components/marketing-ui/vignettes/AITriageVignette";
import { InboxZeroVignette } from "@/components/marketing-ui/vignettes/InboxZeroVignette";
import { AutoReplyVignette } from "@/components/marketing-ui/vignettes/AutoReplyVignette";
import { cn } from "@/lib/utils";

// Main feature sections with vignettes
const featureSections = [
  {
    id: "triage",
    icon: Brain,
    title: "AI-Powered Prioritization",
    description:
      "Let AI automatically sort and prioritize your messages based on urgency, importance, and context. Aiva analyzes every incoming message and suggests the right priority, category, and action—so you focus on what matters most.",
    highlights: [
      "Smart priority detection",
      "Automatic categorization",
      "Action suggestions",
    ],
    vignette: AITriageVignette,
    reverse: false,
  },
  {
    id: "inbox-zero",
    icon: Inbox,
    title: "Achieve Inbox Zero",
    description:
      "Transform your overflowing inbox into a calm, organized space. Aiva automatically handles routine messages, archives what's done, and shows you only what needs your attention. Wake up to inbox zero every day.",
    highlights: [
      "Automatic message handling",
      "Smart archiving",
      "Only see what matters",
    ],
    vignette: InboxZeroVignette,
    reverse: true,
  },
  {
    id: "auto-reply",
    icon: MessageSquare,
    title: "Smart Auto-Reply",
    description:
      "AI drafts perfect replies in your tone and style. Review, edit, or let Aiva send automatically when confidence thresholds are met. Your communication, accelerated.",
    highlights: [
      "Learns your writing style",
      "Confidence-based sending",
      "Human review when needed",
    ],
    vignette: AutoReplyVignette,
    reverse: false,
  },
];

// Additional feature cards
const additionalFeatures = [
  {
    icon: Calendar,
    title: "Intelligent Scheduling",
    description:
      "Automatically detect scheduling requests and manage your calendar. Aiva finds the perfect time slots and sends confirmations.",
  },
  {
    icon: Zap,
    title: "Task Extraction",
    description:
      "Automatically extract action items and tasks from messages. Never forget a follow-up or miss a deadline.",
  },
  {
    icon: Search,
    title: "Universal Search",
    description:
      "Search across all channels instantly. Find any conversation, contact, or message with semantic search.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-level encryption, workspace isolation, and complete audit trails. Your data is secure and compliant.",
  },
];

function FeatureSection({
  feature,
  index,
}: {
  feature: (typeof featureSections)[0];
  index: number;
}) {
  const Icon = feature.icon;
  const Vignette = feature.vignette;

  return (
    <div
      className={cn(
        "grid lg:grid-cols-2 gap-8 lg:gap-16 items-center",
        feature.reverse && "lg:direction-rtl"
      )}
    >
      {/* Text content */}
      <div className={cn("space-y-6", feature.reverse && "lg:direction-ltr lg:order-2")}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Feature {index + 1}
          </span>
        </div>

        <h3 className="text-2xl lg:text-3xl font-bold tracking-tight">
          {feature.title}
        </h3>

        <p className="text-lg text-muted-foreground leading-relaxed">
          {feature.description}
        </p>

        <ul className="space-y-3">
          {feature.highlights.map((highlight, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span className="text-muted-foreground">{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Vignette */}
      <div className={cn("relative", feature.reverse && "lg:direction-ltr lg:order-1")}>
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-2xl opacity-30 rounded-3xl" />
        <div className="relative">
          <Vignette autoPlay={true} loop={true} compact={false} />
        </div>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section
      id="features"
      className="py-20 lg:py-32 max-w-7xl mx-auto px-6 space-y-24"
    >
      <TitleBlock
        icon={<Sparkles size={16} />}
        section="Features"
        title="Everything You Need to Master Communication"
        subtitle="Aiva combines the power of AI with seamless integrations to transform how you manage messages across all channels."
      />

      {/* Main feature sections with vignettes */}
      <div className="space-y-32">
        {featureSections.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} />
        ))}
      </div>

      {/* Additional features grid */}
      <div className="pt-16 border-t">
        <h3 className="text-xl font-semibold text-center mb-8">
          And much more...
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {additionalFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 rounded-xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 pt-8">
        <Button size="lg" variant="default" className="gap-2" asChild>
          <Link href="/sign-up">
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          No credit card required • 14-day free trial
        </p>
      </div>
    </section>
  );
}
