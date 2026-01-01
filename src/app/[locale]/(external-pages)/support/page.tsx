import { Metadata } from "next";
import { Mail, MessageSquare, Clock, BookOpen, ExternalLink, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support - Aiva",
  description: "Get help with Aiva. Contact our support team or browse resources.",
};

const supportChannels = [
  {
    title: "Email Support",
    description: "Send us an email and we'll respond within 24 hours",
    icon: Mail,
    action: "support@tryaiva.io",
    actionType: "email",
    availability: "24-48 hour response",
  },
  {
    title: "Help Center",
    description: "Browse guides, tutorials, and documentation",
    icon: BookOpen,
    action: "/docs",
    actionType: "link",
    availability: "Self-service",
  },
  {
    title: "FAQ",
    description: "Find answers to common questions",
    icon: HelpCircle,
    action: "/faq",
    actionType: "link",
    availability: "Self-service",
  },
];

const commonIssues = [
  {
    title: "Connecting Gmail or Outlook",
    description: "Learn how to connect your email accounts securely",
    link: "/docs#connect-email",
  },
  {
    title: "AI Draft Quality",
    description: "Tips for improving AI-generated responses",
    link: "/docs#ai-drafts",
  },
  {
    title: "Billing & Subscriptions",
    description: "Manage your subscription and billing through Shopify",
    link: "/docs#billing",
  },
  {
    title: "Calendar Integration",
    description: "Set up calendar sync for scheduling features",
    link: "/docs#calendar",
  },
];

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge variant="secondary" className="mb-4">
          Support
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          How can we help?
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          We're here to help you get the most out of Aiva. Choose how you'd like to reach us.
        </p>
      </div>

      {/* Support Channels */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {supportChannels.map((channel) => {
          const Icon = channel.icon;
          return (
            <Card key={channel.title} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <CardTitle>{channel.title}</CardTitle>
                <CardDescription>{channel.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                  <Clock className="w-4 h-4" />
                  {channel.availability}
                </div>
                {channel.actionType === "email" ? (
                  <Button asChild className="w-full">
                    <a href={`mailto:${channel.action}`}>
                      <Mail className="w-4 h-4 mr-2" />
                      {channel.action}
                    </a>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <Link href={channel.action}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Browse
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Common Issues */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Common Topics</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {commonIssues.map((issue) => (
            <Link key={issue.title} href={issue.link}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {issue.title}
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Contact Form Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Need more help?</CardTitle>
          <CardDescription className="text-base">
            Our support team is here to assist you with any questions
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div className="text-left">
              <h4 className="font-semibold mb-2">General Support</h4>
              <a 
                href="mailto:support@tryaiva.io" 
                className="text-primary hover:underline flex items-center gap-1"
              >
                <Mail className="w-4 h-4" />
                support@tryaiva.io
              </a>
            </div>
            <div className="text-left">
              <h4 className="font-semibold mb-2">Enterprise & Sales</h4>
              <a 
                href="mailto:sales@tryaiva.io" 
                className="text-primary hover:underline flex items-center gap-1"
              >
                <Mail className="w-4 h-4" />
                sales@tryaiva.io
              </a>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <h4 className="font-semibold mb-2">Response Times</h4>
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Basic:</span> 24-48 hours
              </div>
              <div>
                <span className="font-medium text-foreground">Pro:</span> 12-24 hours
              </div>
              <div>
                <span className="font-medium text-foreground">Enterprise:</span> 4 hours
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shopify Support Note */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          For billing issues, manage your subscription directly in the{" "}
          <span className="font-medium">Shopify Admin → Apps → Aiva</span>
        </p>
      </div>
    </div>
  );
}
