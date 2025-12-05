/**
 * FloatingCard Component
 * Soft shadow, gradient border card for AI-related UI elements
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloatingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glow" | "subtle";
  size?: "sm" | "md" | "lg";
}

const FloatingCard = React.forwardRef<HTMLDivElement, FloatingCardProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const sizeClasses = {
      sm: "p-3 rounded-lg",
      md: "p-4 rounded-xl",
      lg: "p-6 rounded-2xl",
    };

    const variantClasses = {
      default: [
        "bg-card/95 backdrop-blur-sm",
        "shadow-lg shadow-black/5 dark:shadow-black/20",
        "border border-border/50",
      ].join(" "),
      glow: [
        "bg-card/95 backdrop-blur-sm",
        "shadow-lg shadow-primary/10 dark:shadow-primary/20",
        "border border-primary/20",
        "relative overflow-hidden",
      ].join(" "),
      subtle: [
        "bg-muted/30",
        "border border-border/30",
      ].join(" "),
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {/* Gradient border effect for glow variant */}
        {variant === "glow" && (
          <div 
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 -z-10 blur-xl" 
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    );
  }
);

FloatingCard.displayName = "FloatingCard";

const FloatingCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-start justify-between gap-4 mb-3", className)}
    {...props}
  />
));
FloatingCardHeader.displayName = "FloatingCardHeader";

const FloatingCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold text-sm", className)}
    {...props}
  />
));
FloatingCardTitle.displayName = "FloatingCardTitle";

const FloatingCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm", className)} {...props} />
));
FloatingCardContent.displayName = "FloatingCardContent";

const FloatingCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2 mt-3 pt-3 border-t border-border/50", className)}
    {...props}
  />
));
FloatingCardFooter.displayName = "FloatingCardFooter";

export {
  FloatingCard,
  FloatingCardHeader,
  FloatingCardTitle,
  FloatingCardContent,
  FloatingCardFooter,
};

