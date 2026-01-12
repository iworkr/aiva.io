"use client";

import { CHANNEL_LOGOS, CHANNEL_NAMES } from "@/constants/channel-logos";
import Image from "next/image";
import { Marquee } from "../magicui/marquee";

// Integration logos to display
const integrationLogos = [
  { key: "gmail", logo: CHANNEL_LOGOS.gmail, name: CHANNEL_NAMES.gmail },
  { key: "outlook", logo: CHANNEL_LOGOS.outlook, name: CHANNEL_NAMES.outlook },
  { key: "slack", logo: CHANNEL_LOGOS.slack, name: CHANNEL_NAMES.slack },
  { key: "teams", logo: CHANNEL_LOGOS.teams, name: CHANNEL_NAMES.teams },
  { key: "whatsapp", logo: CHANNEL_LOGOS.whatsapp, name: CHANNEL_NAMES.whatsapp },
  { key: "googleCalendar", logo: CHANNEL_LOGOS.googleCalendar, name: CHANNEL_NAMES.googleCalendar },
];

// Metrics - can be updated with real data later
const metrics = [
  { value: "50K+", label: "messages handled weekly" },
  { value: "73%", label: "faster response time" },
  { value: "8hrs", label: "saved per teammate/week" },
];

export default function LogoCloud() {
  return (
    <section className="py-12 lg:py-16 border-y bg-muted/30">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        {/* Headline */}
        <p className="text-center text-muted-foreground font-medium">
          Built for teams who can't afford missed messages.
        </p>

        {/* Integration logos */}
        <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-10">
          {integrationLogos.map((integration) => (
            <div
              key={integration.key}
              className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <Image
                src={integration.logo}
                alt={integration.name}
                width={32}
                height={32}
                className="object-contain"
              />
              <span className="text-sm font-medium text-muted-foreground hidden sm:block">
                {integration.name}
              </span>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16 pt-4">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <p className="text-2xl lg:text-3xl font-bold text-foreground">
                {metric.value}
              </p>
              <p className="text-sm text-muted-foreground">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
