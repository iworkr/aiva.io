/**
 * InfoPill Component
 * Info surfacing pills for displaying contextual information
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const infoPillVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        accent: "bg-accent/10 text-accent-foreground",
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        default: "text-xs px-2.5 py-1",
        lg: "text-sm px-3 py-1.5",
      },
      interactive: {
        true: "cursor-pointer hover:opacity-80",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
);

export interface InfoPillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof infoPillVariants> {
  icon?: React.ReactNode;
}

const InfoPill = React.forwardRef<HTMLDivElement, InfoPillProps>(
  ({ className, variant, size, interactive, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(infoPillVariants({ variant, size, interactive, className }))}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </div>
    );
  }
);

InfoPill.displayName = "InfoPill";

/**
 * InfoPillGroup - Container for multiple info pills
 */
const InfoPillGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-wrap items-center gap-1.5", className)}
    {...props}
  />
));

InfoPillGroup.displayName = "InfoPillGroup";

export { InfoPill, InfoPillGroup, infoPillVariants };

