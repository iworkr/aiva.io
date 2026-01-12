"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/intl-link";
import { ArrowRight, Play, Sparkles } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 lg:py-32 px-6 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-3xl lg:text-5xl xl:text-6xl font-bold tracking-tight">
          Nothing important slips through.
        </h2>
        
        {/* Subheadline */}
        <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Start free in minutes. Connect your channels. Let Aiva handle the chaos.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            size="lg"
            className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            asChild
          >
            <Link href="/sign-up">
              Start Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 px-8 text-base gap-2"
            asChild
          >
            <Link href="#demo">
              <Play className="w-4 h-4" />
              Watch 2-minute tour
            </Link>
          </Button>
        </div>

        {/* Microcopy */}
        <p className="text-sm text-muted-foreground">
          No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
