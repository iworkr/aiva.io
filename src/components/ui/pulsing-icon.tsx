/**
 * PulsingIcon Component
 * Animated app icons for AI status displays
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface PulsingIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "muted";
  size?: "sm" | "md" | "lg";
  isPulsing?: boolean;
  pulseDelay?: number;
}

const PulsingIcon = React.forwardRef<HTMLDivElement, PulsingIconProps>(
  ({ 
    className, 
    icon: Icon, 
    variant = "default", 
    size = "md", 
    isPulsing = true,
    pulseDelay = 0,
    ...props 
  }, ref) => {
    const sizeClasses = {
      sm: { container: "p-1", icon: "h-3 w-3" },
      md: { container: "p-1.5", icon: "h-4 w-4" },
      lg: { container: "p-2", icon: "h-5 w-5" },
    };

    const variantClasses = {
      default: "bg-primary/10 text-primary",
      success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      muted: "bg-muted text-muted-foreground",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md transition-all",
          sizeClasses[size].container,
          variantClasses[variant],
          isPulsing && "animate-pulse",
          className
        )}
        style={isPulsing ? { animationDelay: `${pulseDelay}ms` } : undefined}
        {...props}
      >
        <Icon className={sizeClasses[size].icon} />
      </div>
    );
  }
);

PulsingIcon.displayName = "PulsingIcon";

/**
 * PulsingIconGroup - Row of pulsing app icons
 */
interface PulsingIconGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  icons: LucideIcon[];
  variant?: PulsingIconProps["variant"];
  size?: PulsingIconProps["size"];
  isPulsing?: boolean;
  staggerDelay?: number;
}

const PulsingIconGroup = React.forwardRef<HTMLDivElement, PulsingIconGroupProps>(
  ({ 
    className, 
    icons, 
    variant = "default", 
    size = "md", 
    isPulsing = true,
    staggerDelay = 150,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-1", className)}
        {...props}
      >
        {icons.map((Icon, index) => (
          <PulsingIcon
            key={index}
            icon={Icon}
            variant={variant}
            size={size}
            isPulsing={isPulsing}
            pulseDelay={index * staggerDelay}
          />
        ))}
      </div>
    );
  }
);

PulsingIconGroup.displayName = "PulsingIconGroup";

export { PulsingIcon, PulsingIconGroup };

