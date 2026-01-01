import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HelpCircle, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ - Aiva",
  description: "Frequently asked questions about Aiva AI inbox assistant",
};

const faqCategories = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is Aiva?",
        a: "Aiva is an AI-powered inbox assistant that unifies all your customer communications (email, Slack, etc.) in one dashboard. It uses AI to classify messages, draft replies, and help you respond faster while leveraging your Shopify store data for context.",
      },
      {
        q: "How do I connect my email accounts?",
        a: "After installing Aiva from the Shopify App Store, go to Settings → Channels and click 'Connect' next to Gmail or Outlook. You'll be redirected to sign in with your email provider. We use secure OAuth authentication—we never see or store your password.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes! All plans include a 7-day free trial. You can explore all features before being charged. No credit card is required to start—billing is handled through your Shopify account.",
      },
      {
        q: "How long does setup take?",
        a: "Most users are up and running in under 5 minutes. Install the app, connect your email, and Aiva will automatically sync your recent messages and start classifying them.",
      },
    ],
  },
  {
    category: "AI Features",
    questions: [
      {
        q: "How does AI classification work?",
        a: "Aiva analyzes each incoming message to determine its priority (urgent, high, medium, low), category (customer inquiry, sales lead, support request, etc.), and sentiment (positive, neutral, negative). This helps you focus on what matters most.",
      },
      {
        q: "Can I customize AI responses?",
        a: "Yes! Professional and Enterprise plans include custom AI prompts. You can set your preferred tone, add business-specific context, and create templates that reflect your brand voice.",
      },
      {
        q: "Does Aiva send emails automatically?",
        a: "Only if you enable auto-responses. By default, Aiva drafts replies for your review. Professional plans can enable auto-send for routine messages, with confidence thresholds and audit logs to ensure quality.",
      },
      {
        q: "How does Aiva use my Shopify data?",
        a: "When you connect Aiva to your Shopify store, it accesses your orders, products, and customer data to provide context for AI replies. For example, if a customer asks about their order, Aiva can reference their order status in the draft reply.",
      },
    ],
  },
  {
    category: "Billing & Plans",
    questions: [
      {
        q: "How is billing handled?",
        a: "All billing goes through Shopify. Charges appear on your regular Shopify invoice. You can manage your subscription from your Shopify admin under Apps → Aiva → Billing.",
      },
      {
        q: "Can I change plans?",
        a: "Yes, you can upgrade or downgrade at any time. When upgrading, you get immediate access to new features. When downgrading, changes take effect at the end of your billing cycle.",
      },
      {
        q: "What happens when I cancel?",
        a: "Your subscription remains active until the end of your billing period. After that, you'll lose access to premium features but can still view your message history. You can reactivate anytime.",
      },
      {
        q: "Do you offer annual discounts?",
        a: "Yes! Annual billing saves you 17% compared to monthly. Choose annual billing when subscribing or contact support to switch your existing subscription.",
      },
    ],
  },
  {
    category: "Privacy & Security",
    questions: [
      {
        q: "Is my email data secure?",
        a: "Absolutely. We use industry-standard encryption (TLS 1.3 in transit, AES-256 at rest), OAuth authentication (we never store passwords), and row-level database security. Your data is isolated and only accessible to you.",
      },
      {
        q: "Does Aiva read all my emails?",
        a: "Aiva only accesses emails from the accounts you connect. We process messages to provide AI features but don't use your data to train external AI models or share it with third parties.",
      },
      {
        q: "Can I disconnect my accounts?",
        a: "Yes, you can disconnect any channel at any time from Settings → Channels. When you disconnect, we stop syncing new messages. You can also request full data deletion from your account settings.",
      },
      {
        q: "Are you GDPR compliant?",
        a: "Yes. We support data export, deletion, and portability rights. Our infrastructure is designed with privacy by default, and we maintain documentation of our data processing activities.",
      },
    ],
  },
  {
    category: "Integrations",
    questions: [
      {
        q: "Which email providers are supported?",
        a: "We currently support Gmail (Google Workspace) and Outlook (Microsoft 365). Both personal and business accounts are supported.",
      },
      {
        q: "Do you integrate with Slack?",
        a: "Yes! You can connect Slack to see direct messages and channel mentions in your unified inbox. This is great for managing both customer and team communications.",
      },
      {
        q: "Can I connect multiple email accounts?",
        a: "Yes, depending on your plan. Basic allows up to 3 channels, Professional offers unlimited channels, and Enterprise includes all integrations plus custom options.",
      },
      {
        q: "Do you support calendar integration?",
        a: "Yes! Connect Google Calendar or Outlook Calendar to enable scheduling features. Aiva can detect scheduling requests in emails and help create calendar events automatically.",
      },
    ],
  },
  {
    category: "Troubleshooting",
    questions: [
      {
        q: "Why aren't my emails syncing?",
        a: "First, check that your account is connected in Settings → Channels. If connected, try clicking 'Sync' to force a refresh. If issues persist, disconnect and reconnect the account, or contact support.",
      },
      {
        q: "AI drafts don't match my tone. What can I do?",
        a: "Upgrade to Professional to access custom AI prompts where you can specify your preferred tone, add context about your business, and create templates. You can also edit any draft before sending.",
      },
      {
        q: "The app is loading slowly. What should I do?",
        a: "Try refreshing the page or clearing your browser cache. If you have a large inbox, initial sync may take a few minutes. For persistent issues, contact support with details about your browser and setup.",
      },
      {
        q: "How do I contact support?",
        a: "Email us at support@tryaiva.io. Basic plan users receive responses within 24-48 hours. Professional gets priority support (12-24 hours), and Enterprise includes dedicated support with 4-hour response times.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge variant="secondary" className="mb-4">
          FAQ
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about Aiva
        </p>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-8">
        {faqCategories.map((category) => (
          <div key={category.category}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              {category.category}
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {category.questions.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`${category.category}-${index}`}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>

      {/* Still have questions */}
      <Card className="mt-16 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6 text-center">
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? Our support team is happy to help.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button asChild>
              <a href="mailto:support@tryaiva.io">
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/support">
                View All Support Options
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
