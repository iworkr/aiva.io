/**
 * ConfidenceMeter Component
 * Animated confidence score display with visual indicator
 */

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceMeterProps {
  score: number; // 0 to 1
  previousScore?: number;
  isAnimating?: boolean;
  showLabel?: boolean;
  showTrend?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "bar" | "circle" | "badge";
  className?: string;
}

function getConfidenceLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 0.85) {
    return {
      label: "High confidence",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500",
    };
  } else if (score >= 0.7) {
    return {
      label: "Good confidence",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500",
    };
  } else if (score >= 0.5) {
    return {
      label: "Moderate confidence",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500",
    };
  }
  return {
    label: "Low confidence",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500",
  };
}

export function ConfidenceMeter({
  score,
  previousScore,
  isAnimating = false,
  showLabel = true,
  showTrend = true,
  size = "md",
  variant = "bar",
  className,
}: ConfidenceMeterProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const { label, color, bgColor } = getConfidenceLevel(score);

  // Animate score counting up
  useEffect(() => {
    if (isAnimating) {
      setDisplayScore(0);
      const duration = 1500; // 1.5 seconds
      const steps = 60;
      const increment = score / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += increment;
        if (current >= score) {
          setDisplayScore(score);
          clearInterval(interval);
        } else {
          setDisplayScore(current);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    } else {
      setDisplayScore(score);
    }
  }, [score, isAnimating]);

  const percentage = Math.round(displayScore * 100);
  const trend = previousScore !== undefined ? score - previousScore : 0;

  const sizeClasses = {
    sm: { text: "text-xs", bar: "h-1", circle: "w-8 h-8" },
    md: { text: "text-sm", bar: "h-1.5", circle: "w-12 h-12" },
    lg: { text: "text-base", bar: "h-2", circle: "w-16 h-16" },
  };

  // Badge variant
  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium",
                sizeClasses[size].text,
                score >= 0.85 && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                score >= 0.7 && score < 0.85 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                score >= 0.5 && score < 0.7 && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                score < 0.5 && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                className
              )}
            >
              {percentage}%
              {showTrend && trend !== 0 && (
                trend > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )
              )}
            </motion.span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Circle variant
  if (variant === "circle") {
    const radius = size === "sm" ? 14 : size === "md" ? 20 : 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - displayScore);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("relative inline-flex items-center justify-center", sizeClasses[size].circle, className)}>
              <svg className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  className="stroke-muted fill-none"
                  strokeWidth={size === "sm" ? 2 : 3}
                />
                {/* Progress circle */}
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  className={cn("fill-none", bgColor.replace("bg-", "stroke-"))}
                  strokeWidth={size === "sm" ? 2 : 3}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: isAnimating ? 1.5 : 0.5, ease: "easeOut" }}
                />
              </svg>
              <span className={cn("absolute font-semibold", sizeClasses[size].text, color)}>
                {percentage}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Bar variant (default)
  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={cn("font-medium", sizeClasses[size].text, color)}>
            {percentage}% confidence
          </span>
          {showTrend && trend !== 0 && (
            <span className={cn("flex items-center gap-0.5", sizeClasses[size].text, trend > 0 ? "text-emerald-500" : "text-red-500")}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(Math.round(trend * 100))}%
            </span>
          )}
        </div>
      )}
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", sizeClasses[size].bar)}>
        <motion.div
          className={cn("h-full rounded-full", bgColor)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: isAnimating ? 1.5 : 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/**
 * Animated confidence score that grows in real-time
 */
interface AnimatedConfidenceProps {
  targetScore: number;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

export function AnimatedConfidence({
  targetScore,
  duration = 2000,
  onComplete,
  className,
}: AnimatedConfidenceProps) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    const steps = 60;
    const increment = targetScore / steps;
    let current = 0;
    const stepDuration = duration / steps;

    const interval = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setScore(targetScore);
        clearInterval(interval);
        onComplete?.();
      } else {
        setScore(current);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [targetScore, duration, onComplete]);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ConfidenceMeter score={score} variant="circle" size="lg" showLabel={false} />
      <div>
        <div className="text-2xl font-bold">{Math.round(score * 100)}%</div>
        <div className="text-sm text-muted-foreground">
          {getConfidenceLevel(score).label}
        </div>
      </div>
    </div>
  );
}

