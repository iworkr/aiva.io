"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CHANNEL_LOGOS, CHANNEL_NAMES } from "@/constants/channel-logos";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Check, Clock } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Integration configurations
const integrations = [
  { 
    key: "gmail", 
    logo: CHANNEL_LOGOS.gmail, 
    name: CHANNEL_NAMES.gmail,
    features: ["Read/send emails", "Labels & folders", "Drafts", "Real-time sync"],
    status: "available",
  },
  { 
    key: "outlook", 
    logo: CHANNEL_LOGOS.outlook, 
    name: CHANNEL_NAMES.outlook,
    features: ["Read/send emails", "Folders", "Drafts", "Calendar sync"],
    status: "available",
  },
  { 
    key: "slack", 
    logo: CHANNEL_LOGOS.slack, 
    name: CHANNEL_NAMES.slack,
    features: ["DMs & channels", "Threads", "Reactions", "Real-time sync"],
    status: "available",
  },
  { 
    key: "teams", 
    logo: CHANNEL_LOGOS.teams, 
    name: CHANNEL_NAMES.teams,
    features: ["Chat & channels", "Meeting scheduling", "Threads"],
    status: "available",
  },
  { 
    key: "whatsapp", 
    logo: CHANNEL_LOGOS.whatsapp, 
    name: CHANNEL_NAMES.whatsapp,
    features: ["Business messages", "Media support", "Read receipts"],
    status: "available",
  },
  { 
    key: "googleCalendar", 
    logo: CHANNEL_LOGOS.googleCalendar, 
    name: CHANNEL_NAMES.googleCalendar,
    features: ["Event sync", "Availability", "Meeting scheduling"],
    status: "available",
  },
];

// Coming soon
const comingSoon = [
  { name: "LinkedIn", logo: CHANNEL_LOGOS.linkedin },
  { name: "Telegram", logo: CHANNEL_LOGOS.telegram },
  { name: "Messenger", logo: CHANNEL_LOGOS.messenger },
];

export default function Integration() {
  return (
    <section id="integrations" className="py-20 lg:py-28 px-6 w-full">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            Works where your work already happens.
          </h2>
          <p className="text-lg text-muted-foreground">
            Connect in minutes. No migrations. No new habits.
          </p>
        </div>

        {/* Integration grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.key}
              className="group flex flex-col items-center p-6 rounded-2xl border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Image
                  src={integration.logo}
                  alt={integration.name}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <span className="font-medium text-sm text-center">{integration.name}</span>
              <Badge variant="outline" className="mt-2 text-[10px] text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                <Check className="w-3 h-3 mr-1" />
                Available
              </Badge>
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div className="flex flex-wrap justify-center items-center gap-4">
          <span className="text-sm text-muted-foreground">Coming soon:</span>
          {comingSoon.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border"
            >
              <Image
                src={integration.logo}
                alt={integration.name}
                width={16}
                height={16}
                className="object-contain opacity-50"
              />
              <span className="text-sm text-muted-foreground">{integration.name}</span>
              <Clock className="w-3 h-3 text-muted-foreground" />
            </div>
          ))}
        </div>

        {/* Feature accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="features">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                See supported features per channel
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 pt-4">
                  {integrations.map((integration) => (
                    <div
                      key={integration.key}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-background"
                    >
                      <Image
                        src={integration.logo}
                        alt={integration.name}
                        width={24}
                        height={24}
                        className="object-contain mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="font-medium mb-2">{integration.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {integration.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
}
