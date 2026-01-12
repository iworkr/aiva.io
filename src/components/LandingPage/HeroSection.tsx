"use client";

import { Link } from "@/components/intl-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Shield, CheckCircle, Users } from "lucide-react";
import { HeroUIDemo } from "./HeroUIDemo";

export default function HeroSection() {
  return (
    <section className="py-16 lg:py-24 px-6 w-full">
      <div className="max-w-7xl mx-auto">
      <div className="flex flex-col gap-12 lg:gap-16 w-full">
        {/* Text content */}
        <div className="space-y-6 flex flex-col lg:items-center lg:text-center flex-1 max-w-4xl mx-auto">
          <h1 className="font-bold text-4xl lg:text-6xl xl:text-7xl leading-[1.1] tracking-tight">
            Your AI executive assistant for every inbox.
          </h1>
          
          <p className="text-muted-foreground text-lg lg:text-xl leading-relaxed max-w-3xl">
            Connect Gmail, Outlook, Slack, Teams, WhatsApp, and your calendar. 
            Aiva prioritizes what matters, drafts replies in your tone, schedules meetings, 
            and extracts tasks — so nothing important slips through.
          </p>

          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:justify-center pt-4">
            <Button
              className="w-full sm:w-auto min-w-44 text-base h-12 px-8 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
              size="lg"
              variant="default"
              asChild
            >
              <Link href="/sign-up">
                Start Free
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
            <Button
              className="w-full sm:w-auto min-w-44 text-base h-12 px-8 font-medium gap-2"
              variant="outline"
              size="lg"
              asChild
            >
              <Link href="#demo">
                <Play size={16} />
                Watch 2-minute tour
              </Link>
            </Button>
          </div>

          {/* Helper text */}
          <p className="text-sm text-muted-foreground">
            No credit card required · Takes ~3 minutes to connect
          </p>

          {/* Trust chips */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Badge variant="secondary" className="px-3 py-1.5 gap-2 font-normal">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Encrypted by design
            </Badge>
            <Badge variant="secondary" className="px-3 py-1.5 gap-2 font-normal">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              You approve auto-send
            </Badge>
            <Badge variant="secondary" className="px-3 py-1.5 gap-2 font-normal">
              <Users className="w-3.5 h-3.5 text-primary" />
              Works for teams
            </Badge>
          </div>
        </div>

        {/* Hero UI Demo */}
        <div className="relative w-full max-w-6xl mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 blur-3xl opacity-40 rounded-3xl" />
          <div className="relative rounded-2xl border bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden">
            <HeroUIDemo />
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
