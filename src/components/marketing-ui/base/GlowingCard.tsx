/**
 * GlowingCard - Marketing UI Component
 * Card wrapper with beautiful ambient glow effect
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
  primary: 'bg-primary/30',
  success: 'bg-green-500/30',
  warning: 'bg-amber-500/30',
  info: 'bg-blue-500/30',
};

const glowIntensities = {
  subtle: 'blur-2xl opacity-40',
  medium: 'blur-3xl opacity-50',
  strong: 'blur-[40px] opacity-60',
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
        'relative',
        animate && 'animate-in fade-in slide-in-from-bottom-2 duration-500',
        className
      )}
      style={{ animationDelay: animate ? `${animationDelay}ms` : undefined }}
    >
      {/* Glow effect - positioned behind card with overflow visible */}
      <div
        className={cn(
          'absolute inset-4 rounded-3xl transition-all duration-700',
          glowColors[glowColor],
          glowIntensities[glowIntensity],
          hoverEffect ? 'group-hover:opacity-70 group-hover:inset-2' : ''
        )}
        style={{ zIndex: 0 }}
      />

      {/* Content card */}
      <div
        className={cn(
          'relative rounded-xl border bg-card/95 backdrop-blur-sm',
          'transition-all duration-300',
          hoverEffect && 'group-hover:border-primary/30 group-hover:shadow-xl'
        )}
        style={{ zIndex: 1 }}
      >
        {children}
      </div>
    </div>
  );
}

export default GlowingCard;
