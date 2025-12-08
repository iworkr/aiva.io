"use client";

import { Link } from "@/components/intl-link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { AvatarCirclesDemo } from "./AvatarCirclesDemo";
import { AITriageVignette } from "@/components/marketing-ui/vignettes/AITriageVignette";

export default function HeroSection() {
  const t = useTranslations("HomePage");
  return (
    <section className="py-14 lg:py-28 text-left px-6 lg:text-center max-w-5xl mx-auto">
      <div className="flex flex-col gap-12 w-full">
        <div className="space-y-5 flex flex-col lg:items-center flex-1">
          <Link href={"#features"} aria-label="Learn about AI-Powered Communication Assistant features">
            <div className="flex items-center gap-2 py-1.5 px-4 w-fit rounded-full border border-border dark:border-primary/30 bg-secondary hover:bg-secondary/80 transition-colors">
              <Sparkles size={16} aria-hidden="true" className="text-primary" />
              <span className="text-sm font-medium lg:text-base">
                🚀 New: AI-Powered Communication Assistant
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </div>
          </Link>
          <h1 className="font-semibold text-3xl lg:text-6xl leading-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground leading-loose lg:text-xl lg:leading-relaxed max-w-4xl">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:justify-center pt-8">
            {/* Primary CTA - Maximum contrast with solid background */}
            <Button 
              className="w-full sm:w-auto sm:min-w-44 text-base h-10 px-6 font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:bg-primary/90 transition-all duration-200" 
              size="default" 
              variant="default" 
              asChild
            >
              <Link href={"/sign-up"}>
                Start Free Trial
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
            {/* Secondary CTA - High contrast outline */}
            <Button
              className="w-full sm:w-auto sm:min-w-44 text-base h-10 px-6 font-medium border-2 border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-all duration-200"
              variant="outline"
              size="default"
              asChild
            >
              <Link href={"#features"}>
                See How It Works
                <ChevronRight size={18} className="ml-2" />
              </Link>
            </Button>
          </div>
          <div className="pt-4 flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0"></div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0"></div>
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0"></div>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center pt-2">
          <AvatarCirclesDemo />
        </div>
        
        {/* Interactive AI Triage Demo */}
        <div className="relative w-full max-w-4xl mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 blur-3xl opacity-30 rounded-3xl" />
          <div className="relative rounded-2xl border-2 border-border bg-card/50 backdrop-blur-sm shadow-2xl p-6 lg:p-8">
            <AITriageVignette 
              autoPlay={true} 
              loop={true} 
              compact={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
