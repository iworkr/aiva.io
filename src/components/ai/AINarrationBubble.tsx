/**
 * AINarrationBubble Component
 * Animated bubble showing AI status with various animation states
 */

"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Search,
  FileText,
  Sparkles,
  PenLine,
  CheckCircle2,
  Mail,
  MessageSquare,
  Calendar,
  FileIcon,
  User,
  Loader2,
} from "lucide-react";
import type { AIStatusType, AIStatusEvent } from "@/hooks/useAIStatus";

interface AINarrationBubbleProps {
  status: AIStatusType;
  message: string;
  detail?: string;
  progress?: number;
  foundResource?: AIStatusEvent["foundResource"];
  apps?: string[];
  className?: string;
  variant?: "inline" | "floating" | "minimal";
}

const statusConfig: Record<AIStatusType, { icon: React.ElementType; color: string }> = {
  idle: { icon: Sparkles, color: "text-muted-foreground" },
  searching: { icon: Search, color: "text-primary" },
  summarizing: { icon: FileText, color: "text-primary" },
  classifying: { icon: Sparkles, color: "text-primary" },
  drafting: { icon: PenLine, color: "text-primary" },
  found: { icon: CheckCircle2, color: "text-green-500" },
};

const appIcons: Record<string, React.ElementType> = {
  gmail: Mail,
  outlook: Mail,
  slack: MessageSquare,
  teams: MessageSquare,
  calendar: Calendar,
  drive: FileIcon,
  default: FileIcon,
};

function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = React.useState("");
  
  React.useEffect(() => {
    setDisplayText("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={className}>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
      />
    </span>
  );
}

function PulsingAppIcons({ apps }: { apps: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {apps.slice(0, 6).map((app, index) => {
        const IconComponent = appIcons[app.toLowerCase()] || appIcons.default;
        return (
          <motion.div
            key={app}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              scale: { delay: index * 0.1, duration: 0.2 },
              opacity: { 
                delay: index * 0.1 + 0.2,
                duration: 1.5, 
                repeat: Infinity,
                repeatType: "reverse",
              },
            }}
            className="p-1 rounded-md bg-muted/50"
          >
            <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
        );
      })}
    </div>
  );
}

function FoundResourceCard({ resource }: { resource: AIStatusEvent["foundResource"] }) {
  if (!resource) return null;

  const icons = {
    email: Mail,
    file: FileIcon,
    contact: User,
  };
  const IconComponent = icons[resource.type] || FileIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20"
    >
      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <IconComponent className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{resource.title}</p>
          {resource.preview && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {resource.preview}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AINarrationBubble({
  status,
  message,
  detail,
  progress,
  foundResource,
  apps,
  className,
  variant = "inline",
}: AINarrationBubbleProps) {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  if (status === "idle") {
    return null;
  }

  const isFloating = variant === "floating";
  const isMinimal = variant === "minimal";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: isFloating ? 20 : 5, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: isFloating ? -10 : -5, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "overflow-hidden",
          isFloating && [
            "fixed bottom-6 right-6 z-50",
            "bg-card/95 backdrop-blur-sm",
            "rounded-xl border shadow-lg",
            "p-4 max-w-sm",
          ],
          !isFloating && !isMinimal && [
            "bg-muted/30 rounded-lg p-3",
            "border border-border/50",
          ],
          isMinimal && "inline-flex items-center gap-2",
          className
        )}
      >
        {/* Glow effect for floating variant */}
        {isFloating && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 blur-xl -z-10" />
        )}

        <div className={cn("flex items-start gap-3", isMinimal && "items-center gap-2")}>
          {/* Status Icon with animation */}
          <motion.div
            animate={status === "searching" || status === "summarizing" || status === "classifying" || status === "drafting"
              ? { rotate: 360 }
              : {}
            }
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className={cn(
              "flex-shrink-0 p-1.5 rounded-md",
              status === "found" ? "bg-green-500/10" : "bg-primary/10"
            )}
          >
            {(status === "searching" || status === "summarizing" || status === "classifying" || status === "drafting") ? (
              <Loader2 className={cn("h-4 w-4 animate-spin", config.color)} />
            ) : (
              <IconComponent className={cn("h-4 w-4", config.color)} />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            {/* Main message with typewriter effect */}
            <div className={cn(
              "text-sm font-medium",
              isMinimal && "text-muted-foreground"
            )}>
              {status === "summarizing" || status === "drafting" ? (
                <TypewriterText text={message} />
              ) : (
                message
              )}
            </div>

            {/* Detail text */}
            {detail && !isMinimal && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground mt-1"
              >
                {detail}
              </motion.p>
            )}

            {/* Progress bar */}
            {typeof progress === "number" && !isMinimal && (
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            )}

            {/* Pulsing app icons for search */}
            {status === "searching" && apps && apps.length > 0 && !isMinimal && (
              <div className="mt-2">
                <PulsingAppIcons apps={apps} />
              </div>
            )}

            {/* Found resource card */}
            {status === "found" && foundResource && !isMinimal && (
              <FoundResourceCard resource={foundResource} />
            )}
          </div>
        </div>

        {/* Floating variant close hint */}
        {isFloating && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-[10px] text-muted-foreground/50 mt-2 text-center"
          >
            Auto-dismisses in a few seconds
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Floating AI Status Bubble - Shows in corner of screen
 */
export function FloatingAIStatus({
  status,
  message,
  detail,
  progress,
  foundResource,
  apps,
}: Omit<AINarrationBubbleProps, "variant" | "className">) {
  return (
    <AINarrationBubble
      status={status}
      message={message}
      detail={detail}
      progress={progress}
      foundResource={foundResource}
      apps={apps}
      variant="floating"
    />
  );
}

/**
 * Inline AI Status - Shows within content flow
 */
export function InlineAIStatus({
  status,
  message,
  detail,
  progress,
  foundResource,
  apps,
  className,
}: Omit<AINarrationBubbleProps, "variant">) {
  return (
    <AINarrationBubble
      status={status}
      message={message}
      detail={detail}
      progress={progress}
      foundResource={foundResource}
      apps={apps}
      variant="inline"
      className={className}
    />
  );
}

/**
 * Minimal AI Status - Just icon and text, inline
 */
export function MinimalAIStatus({
  status,
  message,
  className,
}: Pick<AINarrationBubbleProps, "status" | "message" | "className">) {
  return (
    <AINarrationBubble
      status={status}
      message={message}
      variant="minimal"
      className={className}
    />
  );
}

