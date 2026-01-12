"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

// FAQ items per the brief
const faqItems = [
  {
    question: "Is my data secure?",
    answer: "Encryption in transit + at rest. Data isolation with workspace-level security. Clear access controls with role-based permissions. We never store your passwords — only secure OAuth tokens. Full audit trails for enterprise customers.",
  },
  {
    question: "Does Aiva send messages automatically?",
    answer: "Only if you enable auto-send — and only above your confidence threshold. By default, Aiva drafts replies for your review. You control exactly when and how messages are sent, with granular rules for different message types and senders.",
  },
  {
    question: "Can I control the tone of drafts?",
    answer: "Yes. Choose tone presets (friendly, professional, brief), edit drafts before sending, and let Aiva learn your style over time. You can also create custom AI prompts to match your brand voice.",
  },
  {
    question: "Can I review drafts before sending?",
    answer: "Always. Approval mode is the default unless you choose otherwise. You can review every draft, make edits, and approve before sending. Auto-send is entirely opt-in with configurable confidence thresholds.",
  },
  {
    question: "Does it work with teams?",
    answer: "Absolutely. Team plans include shared inboxes, message assignments, team visibility, and collaboration features. Avoid double-replies with real-time sync across your team. Each workspace is completely isolated.",
  },
  {
    question: "What channels are supported?",
    answer: "Gmail, Outlook, Slack, Microsoft Teams, WhatsApp, and Google Calendar — with more coming soon. Connect any combination of channels and manage them all from one unified inbox.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20 lg:py-28 px-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">FAQ</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about Aiva.
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border rounded-lg px-6 data-[state=open]:bg-muted/30"
            >
              <AccordionTrigger className="text-left hover:no-underline py-4">
                <span className="font-medium">{item.question}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-muted-foreground leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        </div>
      </div>
    </section>
  );
}
