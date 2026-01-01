import { Metadata } from "next";
import { Check, Sparkles, Building2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing - Aiva",
  description: "Simple, transparent pricing for AI-powered inbox management",
};

const plans = [
  {
    name: "Basic",
    description: "Perfect for solo entrepreneurs",
    price: "$35",
    interval: "month",
    yearlyPrice: "$29",
    icon: Zap,
    popular: false,
    features: [
      "Unified inbox (up to 3 channels)",
      "AI-powered message classification",
      "Auto-organize by category & sentiment",
      "Deep history search",
      "Calendar event extraction",
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
    description: "For growing businesses",
    price: "$95",
    interval: "month",
    yearlyPrice: "$79",
    icon: Sparkles,
    popular: true,
    features: [
      "Everything in Basic",
      "✨ AI reply drafts & auto-responses",
      "✨ Multiple tone variations",
      "✨ Custom AI prompts",
      "Unlimited channels",
      "Intelligent scheduling assistant",
      "All integrations (Gmail, Outlook, Slack, WhatsApp)",
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
    description: "For large organizations",
    price: "$239",
    interval: "month",
    yearlyPrice: "$199",
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
      "White-label options",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    ctaLink: "/support",
  },
];

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge variant="secondary" className="mb-4">
          Pricing
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your needs. All plans include a 7-day free trial.
          Cancel anytime.
        </p>
      </div>

      {/* Billing Toggle Info */}
      <div className="text-center mb-12">
        <p className="text-muted-foreground">
          💰 Save 17% with annual billing
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card 
              key={plan.name} 
              className={`relative flex flex-col ${
                plan.popular 
                  ? "border-primary shadow-lg scale-105 z-10" 
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="text-center flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.interval}</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    or {plan.yearlyPrice}/month billed annually
                  </p>
                </div>
                
                <ul className="space-y-3 text-left">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  asChild 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  <Link href={plan.ctaLink}>{plan.cta}</Link>
                </Button>
              </CardFooter>
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
