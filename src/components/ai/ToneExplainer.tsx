/**
 * ToneExplainer Component
 * Expandable explanation of why a certain tone/phrasing was chosen
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  MessageSquare,
  Sparkles,
  User,
  History,
  Lightbulb,
  HelpCircle,
} from "lucide-react";

export type ToneType = 
  | "professional"
  | "friendly"
  | "formal"
  | "casual"
  | "empathetic"
  | "assertive"
  | "apologetic";

interface ToneReason {
  factor: string;
  description: string;
  weight: number; // 0-1, how much this factor contributed
}

interface ToneExplainerProps {
  tone: ToneType;
  toneReasons?: ToneReason[];
  previousInteractionCount?: number;
  senderName?: string;
  confidence?: number;
  className?: string;
}

const toneConfig: Record<ToneType, { label: string; color: string; icon: React.ElementType; description: string }> = {
  professional: {
    label: "Professional",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: MessageSquare,
    description: "Clear, respectful, and business-appropriate",
  },
  friendly: {
    label: "Friendly",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: User,
    description: "Warm, approachable, and personable",
  },
  formal: {
    label: "Formal",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    icon: MessageSquare,
    description: "Structured, official, and traditional",
  },
  casual: {
    label: "Casual",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: MessageSquare,
    description: "Relaxed, conversational, and easy-going",
  },
  empathetic: {
    label: "Empathetic",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    icon: User,
    description: "Understanding, compassionate, and supportive",
  },
  assertive: {
    label: "Assertive",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: MessageSquare,
    description: "Direct, confident, and clear",
  },
  apologetic: {
    label: "Apologetic",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    icon: User,
    description: "Acknowledging, understanding, and remedial",
  },
};

export function ToneExplainer({
  tone,
  toneReasons,
  previousInteractionCount,
  senderName,
  confidence,
  className,
}: ToneExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = toneConfig[tone] || toneConfig.professional;
  const IconComponent = config.icon;

  // Default reasons if none provided
  const defaultReasons: ToneReason[] = [
    { factor: "Sender relationship", description: "Based on your previous interactions", weight: 0.4 },
    { factor: "Message content", description: "Matched to the nature of the request", weight: 0.35 },
    { factor: "Context", description: "Appropriate for the conversation topic", weight: 0.25 },
  ];

  const reasons = toneReasons || defaultReasons;

  return (
    <div className={cn("rounded-lg border", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", config.color)}>
                <IconComponent className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                tone selected
              </span>
              {confidence && (
                <span className="text-xs text-muted-foreground">
                  • {Math.round(confidence * 100)}% match
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="px-3 pb-3 space-y-3"
              >
                {/* Tone description */}
                <p className="text-sm text-muted-foreground">
                  {config.description}
                </p>

                {/* Why this tone */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    Why this tone?
                  </div>
                  
                  <div className="space-y-2">
                    {reasons.map((reason, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {reason.factor}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(reason.weight * 100)}% weight
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {reason.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Previous interactions */}
                {previousInteractionCount !== undefined && previousInteractionCount > 0 && senderName && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Based on <span className="font-medium">{previousInteractionCount}</span> previous{" "}
                      {previousInteractionCount === 1 ? "interaction" : "interactions"} with{" "}
                      <span className="font-medium">{senderName}</span>
                    </span>
                  </div>
                )}

                {/* Help text */}
                <div className="flex items-start gap-2 text-[10px] text-muted-foreground/70">
                  <HelpCircle className="h-3 w-3 mt-0.5" />
                  <span>
                    Tone is automatically selected based on context. You can edit the reply to adjust the tone as needed.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Compact tone badge for display in tight spaces
 */
interface ToneBadgeProps {
  tone: ToneType;
  showIcon?: boolean;
  className?: string;
}

export function ToneBadge({ tone, showIcon = true, className }: ToneBadgeProps) {
  const config = toneConfig[tone] || toneConfig.professional;
  const IconComponent = config.icon;

  return (
    <Badge className={cn("text-xs", config.color, className)}>
      {showIcon && <IconComponent className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

/**
 * Inline tone indicator with hover explanation
 */
interface InlineToneIndicatorProps {
  tone: ToneType;
  senderName?: string;
  className?: string;
}

export function InlineToneIndicator({
  tone,
  senderName,
  className,
}: InlineToneIndicatorProps) {
  const config = toneConfig[tone] || toneConfig.professional;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Sparkles className="h-3 w-3" />
      <span>
        <span className={cn("font-medium", config.color.split(" ")[1])}>
          {config.label}
        </span>
        {senderName && (
          <span>
            {" "}tone based on your history with {senderName}
          </span>
        )}
      </span>
    </div>
  );
}

