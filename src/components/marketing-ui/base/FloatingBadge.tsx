/**
 * FloatingBadge - Marketing UI Component
 * Animated pill/chip with glow effect
 */

'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FloatingBadgeProps {
  label: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  glow?: boolean;
  className?: string;
  animate?: boolean;
  animationDelay?: number;
}

const variantStyles = {
  primary: {
    bg: 'bg-primary/10 dark:bg-primary/20',
    text: 'text-primary',
    glow: 'shadow-primary/20',
    border: 'border-primary/20',
  },
  success: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    glow: 'shadow-green-500/20',
    border: 'border-green-500/20',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    glow: 'shadow-amber-500/20',
    border: 'border-amber-500/20',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-500/20',
  },
  muted: {
    bg: 'bg-secondary',
    text: 'text-secondary-foreground',
    glow: 'shadow-secondary/20',
    border: 'border-border',
  },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export function FloatingBadge({
  label,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  pulse = false,
  glow = false,
  className,
  animate = false,
  animationDelay = 0,
}: FloatingBadgeProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        'transition-all duration-300',
        styles.bg,
        styles.text,
        styles.border,
        sizeStyles[size],
        glow && `shadow-lg ${styles.glow}`,
        pulse && 'animate-pulse',
        animate && 'animate-in fade-in zoom-in-95 duration-300',
        className
      )}
      style={{ animationDelay: animate ? `${animationDelay}ms` : undefined }}
    >
      {Icon && <Icon className={iconSizes[size]} />}
      <span>{label}</span>
      {pulse && (
        <span className={cn('relative flex h-2 w-2', size === 'sm' && 'h-1.5 w-1.5')}>
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              variant === 'success' && 'bg-green-400',
              variant === 'primary' && 'bg-primary',
              variant === 'warning' && 'bg-amber-400',
              variant === 'info' && 'bg-blue-400',
              variant === 'muted' && 'bg-muted-foreground'
            )}
          />
          <span
            className={cn(
              'relative inline-flex rounded-full h-full w-full',
              variant === 'success' && 'bg-green-500',
              variant === 'primary' && 'bg-primary',
              variant === 'warning' && 'bg-amber-500',
              variant === 'info' && 'bg-blue-500',
              variant === 'muted' && 'bg-muted-foreground'
            )}
          />
        </span>
      )}
    </div>
  );
}

export default FloatingBadge;

