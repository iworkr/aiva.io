"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "@/components/intl-link";

// Pricing plans
const plans = [
  {
    id: "starter",
    name: "Starter",
    description: "For personal inbox control",
    monthlyPrice: 29,
    annualPrice: 290,
    features: [
      "Unified inbox (up to 3 channels)",
      "AI priority scoring",
      "Smart drafts",
      "Basic scheduling",
      "Task extraction",
      "Email support",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    id: "team",
    name: "Team",
    description: "For client work + collaboration",
    monthlyPrice: 79,
    annualPrice: 790,
    features: [
      "Everything in Starter",
      "Unlimited channels",
      "Team workspace",
      "Shared inboxes",
      "Auto-send with approval",
      "Advanced scheduling agent",
      "Custom AI prompts",
      "Priority support",
    ],
    cta: "Start Free",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "SSO, audit logs, API, advanced controls",
    monthlyPrice: null,
    annualPrice: null,
    features: [
      "Everything in Team",
      "Unlimited team members",
      "SSO & SAML",
      "Audit logs",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <section id="pricing" className="py-20 lg:py-28 px-6 w-full bg-muted/30">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            Simple pricing that scales with your workload.
          </h2>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center p-1 rounded-lg bg-muted border">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                billingPeriod === "monthly"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all relative",
                billingPeriod === "annual"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0 bg-green-500 hover:bg-green-500 border-0">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => {
            const price = billingPeriod === "monthly" ? plan.monthlyPrice : plan.annualPrice;
            const monthlyEquivalent = plan.annualPrice ? Math.round(plan.annualPrice / 12) : null;
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col",
                  plan.popular && "border-primary shadow-lg shadow-primary/10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary hover:bg-primary">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  
                  <div className="pt-4">
                    {price !== null ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">
                            ${billingPeriod === "annual" ? monthlyEquivalent : price}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        {billingPeriod === "annual" && plan.annualPrice && (
                          <p className="text-sm text-green-600 mt-1">
                            ${plan.annualPrice} billed annually
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">Custom</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <Button
                    className={cn(
                      "w-full mb-6",
                      plan.popular ? "" : "variant-outline"
                    )}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.id === "enterprise" ? "/contact" : "/sign-up"}>
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  <div className="border-t pt-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No credit card note */}
        <p className="text-center text-sm text-muted-foreground">
          No credit card required · 14-day free trial on all plans
        </p>
      </div>
    </section>
  );
}
