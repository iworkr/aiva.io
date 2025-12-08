/**
 * GlowingCard - Marketing UI Component
 * Card wrapper with ambient glow animation
 */

'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'primary' | 'success' | 'warning' | 'info';
  glowIntensity?: 'subtle' | 'medium' | 'strong';
  hoverEffect?: boolean;
  animate?: boolean;
  animationDelay?: number;
}

const glowColors = {
  primary: 'before:bg-primary/20 after:bg-primary/10',
  success: 'before:bg-green-500/20 after:bg-green-500/10',
  warning: 'before:bg-amber-500/20 after:bg-amber-500/10',
  info: 'before:bg-blue-500/20 after:bg-blue-500/10',
};

const glowIntensities = {
  subtle: 'before:blur-xl after:blur-2xl',
  medium: 'before:blur-2xl after:blur-3xl',
  strong: 'before:blur-3xl after:blur-[100px]',
};

export function GlowingCard({
  children,
  className,
  glowColor = 'primary',
  glowIntensity = 'medium',
  hoverEffect = true,
  animate = false,
  animationDelay = 0,
}: GlowingCardProps) {
  return (
    <div
      className={cn(
        'relative group',
        animate && 'animate-in fade-in slide-in-from-bottom-4 duration-500',
        className
      )}
      style={{ animationDelay: animate ? `${animationDelay}ms` : undefined }}
    >
      {/* Glow layers */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-700',
          'before:absolute before:inset-0 before:rounded-2xl',
          'after:absolute after:inset-0 after:rounded-2xl',
          glowColors[glowColor],
          glowIntensities[glowIntensity],
          hoverEffect && 'group-hover:opacity-100',
          !hoverEffect && 'opacity-50'
        )}
      />

      {/* Animated glow ring */}
      <div
        className={cn(
          'absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500',
          'bg-gradient-to-r from-transparent via-primary/20 to-transparent',
          hoverEffect && 'group-hover:opacity-100',
          !hoverEffect && 'opacity-30 animate-pulse'
        )}
      />

      {/* Content */}
      <div
        className={cn(
          'relative rounded-xl border bg-card/80 backdrop-blur-sm',
          'transition-all duration-300',
          hoverEffect && 'group-hover:border-primary/30 group-hover:shadow-lg'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default GlowingCard;

