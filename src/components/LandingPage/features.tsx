"use client";

import { Link } from "@/components/intl-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Brain,
  Calendar,
  Inbox,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import TitleBlock from "../title-block";

const features = [
  {
    icon: Inbox,
    title: "Unified Inbox",
    description:
      "Bring all your messages from Gmail, Outlook, Slack, WhatsApp, and more into one intelligent dashboard. Never miss an important message again.",
  },
  {
    icon: Brain,
    title: "AI-Powered Prioritization",
    description:
      "Let AI automatically sort and prioritize your messages based on urgency, importance, and context. Focus on what matters most.",
  },
  {
    icon: MessageSquare,
    title: "Smart Reply Drafting",
    description:
      "AI drafts perfect replies in your tone and style. Review, edit, or send automatically when confidence thresholds are met.",
  },
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
      "Search across all channels instantly. Find any conversation, contact, or message with semantic search powered by AI.",
  },
  {
    icon: Sparkles,
    title: "Context-Aware Intelligence",
    description:
      "Get summaries, action items, and follow-up reminders. Aiva understands context across channels and conversations.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-level encryption, workspace isolation, and complete audit trails. Your data is secure and compliant.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="py-16 lg:py-24 max-w-7xl mx-auto px-6 space-y-12"
    >
      <TitleBlock
        icon={<Sparkles size={16} />}
        section="Features"
        title="Everything You Need to Master Communication"
        subtitle="Aiva combines the power of AI with seamless integrations to transform how you manage messages across all channels."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="border-2 hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base mt-2">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pt-8">
        <Button size="lg" variant="default" asChild>
          <Link href="/sign-up">
            Start Free Trial
          </Link>
        </Button>
      </div>
    </section>
  );
}
