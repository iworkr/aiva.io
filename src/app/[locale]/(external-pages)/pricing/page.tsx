"use client";

import { useState } from "react";
import { Check, Sparkles, Building2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const plans = [
  {
    name: "Basic",
    description: "Perfect for solo professionals getting started",
    monthlyPrice: 35,
    yearlyPrice: 29, // per month when billed annually
    icon: Zap,
    popular: false,
    features: [
      "Unified inbox (up to 3 channels)",
      "AI-powered message classification & prioritization",
      "Auto-organize emails by category & sentiment",
      "Deep history search & intelligent linking",
      "Calendar event extraction from messages",
      "Basic AI features (no drafts/auto-responses)",
      "Email & Slack integration",
      "1 workspace",
      "Up to 1,000 messages/month",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaLink: "/login",
  },
  {
    name: "Professional",
    description: "Best for growing teams and power users",
    monthlyPrice: 95,
    yearlyPrice: 79,
    icon: Sparkles,
    popular: true,
    features: [
      "Everything in Basic",
      "✨ AI-powered reply drafts & auto-responses",
      "✨ Multiple tone variations",
      "✨ Auto-send with confidence thresholds",
      "✨ Custom AI prompts",
      "Unlimited channels",
      "Intelligent scheduling assistant",
      "All integrations (Gmail, Outlook, Slack, WhatsApp, Teams)",
      "Team workspace (up to 5 members)",
      "Unlimited messages",
      "Priority support",
      "Advanced search & filters",
    ],
    cta: "Start Free Trial",
    ctaLink: "/login",
  },
  {
    name: "Enterprise",
    description: "For large organizations with advanced needs",
    monthlyPrice: 239,
    yearlyPrice: 199,
    icon: Building2,
    popular: false,
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Dedicated account manager",
      "Custom integrations",
      "Advanced security & compliance",
      "SSO & advanced permissions",
      "24/7 priority support",
      "Custom AI training",
      "API access",
      "Advanced analytics & reporting",
      "White-label options",
      "SLA guarantee",
    ],
    cta: "Start Free Trial",
    ctaLink: "/login",
  },
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("annual");

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full mb-6">
          <span className="text-sm font-medium">💰 Pricing</span>
          <span className="text-muted-foreground">→</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your needs. All plans include a 7-day free trial. No credit card required.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center bg-muted rounded-full p-1">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billingInterval === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("annual")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billingInterval === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <Badge variant="default" className="bg-green-500 hover:bg-green-500 text-white text-xs">
              Save 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const displayPrice = billingInterval === "annual" ? plan.yearlyPrice : plan.monthlyPrice;
          
          return (
            <Card 
              key={plan.name} 
              className={`relative flex flex-col ${
                plan.popular 
                  ? "border-primary/50 shadow-lg ring-1 ring-primary/20" 
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${displayPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button 
                  asChild 
                  className="w-full mb-6" 
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  <Link href={plan.ctaLink}>{plan.cta}</Link>
                </Button>

                {/* Divider */}
                <div className="border-t border-border my-4"></div>
                
                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Questions about pricing?</h2>
        <p className="text-muted-foreground mb-6">
          Check out our{" "}
          <Link href="/faq" className="text-primary hover:underline">
            frequently asked questions
          </Link>{" "}
          or{" "}
          <Link href="/support" className="text-primary hover:underline">
            contact our support team
          </Link>
          .
        </p>
      </div>

      {/* Trust badges */}
      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">Trusted by Shopify merchants worldwide</p>
        <div className="flex justify-center items-center gap-8 flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm">7-day free trial</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm">No credit card required</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm">Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm">Billed through Shopify</span>
          </div>
        </div>
      </div>
    </div>
  );
}
