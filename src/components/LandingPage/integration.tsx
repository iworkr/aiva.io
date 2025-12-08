"use client";

import { GitForkIcon } from "lucide-react";
import TitleBlock from "../title-block";
import React, { forwardRef, useRef, useState, useEffect } from "react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { cn } from "@/lib/utils";
import { CHANNEL_LOGOS, CHANNEL_NAMES } from "@/constants/channel-logos";
import Image from "next/image";

// Integration node component with logo
const IntegrationNode = forwardRef<
  HTMLDivElement,
  { 
    className?: string; 
    logo: string; 
    name: string;
    isActive?: boolean;
    isCenter?: boolean;
  }
>(({ className, logo, name, isActive, isCenter }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex items-center justify-center rounded-full border-2 bg-white dark:bg-gray-900 transition-all duration-500",
        isCenter 
          ? "size-20 border-primary shadow-lg shadow-primary/20" 
          : "size-14 border-border hover:border-primary/50",
        isActive && !isCenter && "border-primary/50 shadow-md shadow-primary/10 scale-110",
        className
      )}
    >
      <Image
        src={logo}
        alt={name}
        width={isCenter ? 48 : 32}
        height={isCenter ? 48 : 32}
        className="object-contain"
      />
    </div>
  );
});

IntegrationNode.displayName = "IntegrationNode";

// Aiva center node
const AivaNode = forwardRef<HTMLDivElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "z-10 flex items-center justify-center rounded-full size-20",
          "bg-gradient-to-br from-primary/90 to-primary",
          "border-2 border-primary shadow-lg shadow-primary/30",
          "animate-pulse-slow",
          className
        )}
      >
        <Image
          src="/logos/aiva-mark.svg"
          alt="Aiva"
          width={48}
          height={48}
          className="object-contain brightness-0 invert"
        />
      </div>
    );
  }
);

AivaNode.displayName = "AivaNode";

// Integration configs
const integrations = [
  { key: 'gmail', logo: CHANNEL_LOGOS.gmail, name: CHANNEL_NAMES.gmail },
  { key: 'outlook', logo: CHANNEL_LOGOS.outlook, name: CHANNEL_NAMES.outlook },
  { key: 'slack', logo: CHANNEL_LOGOS.slack, name: CHANNEL_NAMES.slack },
  { key: 'teams', logo: CHANNEL_LOGOS.teams, name: CHANNEL_NAMES.teams },
  { key: 'googleCalendar', logo: CHANNEL_LOGOS.googleCalendar, name: CHANNEL_NAMES.googleCalendar },
  { key: 'whatsapp', logo: CHANNEL_LOGOS.whatsapp, name: CHANNEL_NAMES.whatsapp },
];

export function IntegrationHubDemo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const integrationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Rotate active integration
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % integrations.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "relative flex h-[500px] w-full items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-background to-secondary/20 p-8",
        className
      )}
      ref={containerRef}
    >
      {/* Center Aiva node */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <AivaNode ref={centerRef} />
      </div>

      {/* Integration nodes in a circle */}
      {integrations.map((integration, index) => {
        const angle = (index * (360 / integrations.length) - 90) * (Math.PI / 180);
        const radius = 160;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <div
            key={integration.key}
            className="absolute"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <IntegrationNode
                ref={(el) => {
                  integrationRefs.current[index] = el;
                }}
                logo={integration.logo}
                name={integration.name}
                isActive={index === activeIndex}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-300",
                  index === activeIndex
                    ? "text-primary opacity-100"
                    : "text-muted-foreground opacity-60"
                )}
              >
                {integration.name}
              </span>
            </div>
          </div>
        );
      })}

      {/* Animated beams */}
      {integrations.map((_, index) => (
        <AnimatedBeam
          key={index}
          containerRef={containerRef}
          fromRef={{ current: integrationRefs.current[index] }}
          toRef={centerRef}
          duration={3}
          pathColor={index === activeIndex ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
          pathWidth={index === activeIndex ? 2 : 1}
          pathOpacity={index === activeIndex ? 0.6 : 0.2}
        />
      ))}

      {/* Active integration info */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center animate-in fade-in duration-300">
        <p className="text-sm text-muted-foreground">
          Connected to{" "}
          <span className="font-semibold text-foreground">
            {integrations[activeIndex].name}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function Integration() {
  return (
    <section className="py-20 lg:py-28 max-w-6xl flex flex-col justify-center items-center mx-auto space-y-12 overflow-hidden px-6">
      <TitleBlock
        icon={<GitForkIcon size={16} />}
        title="Connect All Your Communication Channels"
        section="Integrations"
        subtitle="Aiva integrates seamlessly with all your favorite communication platforms. One unified inbox, infinite possibilities."
      />

      <IntegrationHubDemo />

      {/* Integration badges */}
      <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
        {integrations.map((integration) => (
          <div
            key={integration.key}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border hover:border-primary/30 transition-colors"
          >
            <Image
              src={integration.logo}
              alt={integration.name}
              width={20}
              height={20}
              className="object-contain"
            />
            <span className="text-sm font-medium">{integration.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
