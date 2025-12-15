/**
 * AIBubble Component
 * Narration bubble with glow effect for AI status messages
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export interface AIBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "working" | "subtle";
  showIcon?: boolean;
  showGlow?: boolean;
}

const AIBubble = React.forwardRef<HTMLDivElement, AIBubbleProps>(
  ({ className, variant = "default", showIcon = true, showGlow = true, children, ...props }, ref) => {
    const variantClasses = {
      default: "bg-primary/10 text-primary border-primary/20",
      success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      working: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      subtle: "bg-muted/50 text-muted-foreground border-border/50",
    };

    const glowColors = {
      default: "from-primary/20 to-accent/20",
      success: "from-emerald-500/20 to-emerald-400/20",
      working: "from-amber-500/20 to-amber-400/20",
      subtle: "from-muted/20 to-muted/20",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {/* Glow effect */}
        {showGlow && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full bg-gradient-to-r blur-md -z-10 opacity-50",
              glowColors[variant]
            )}
            aria-hidden="true" 
          />
        )}
        
        {/* Icon */}
        {showIcon && (
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
        )}
        
        {/* Content */}
        <span>{children}</span>
      </div>
    );
  }
);

AIBubble.displayName = "AIBubble";

/**
 * AIBubbleTyping - Shows animated typing indicator
 */
const AIBubbleTyping = React.forwardRef<
  HTMLDivElement,
  Omit<AIBubbleProps, "children">
>(({ className, ...props }, ref) => (
  <AIBubble ref={ref} variant="working" className={className} {...props}>
    <span className="flex items-center gap-1">
      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
    </span>
  </AIBubble>
));
AIBubbleTyping.displayName = "AIBubbleTyping";

export { AIBubble, AIBubbleTyping };

