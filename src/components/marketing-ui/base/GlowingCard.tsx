/**
 * GlowingCard - Marketing UI Component
 * Card wrapper with soft ambient glow - no hard edges or cutoffs
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

export function GlowingCard({
  children,
  className,
  glowColor = 'primary',
  glowIntensity = 'medium',
  hoverEffect = true,
  animate = false,
  animationDelay = 0,
}: GlowingCardProps) {
  // Color configurations with soft radial gradients
  const glowStyles = {
    primary: {
      background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
      hoverBackground: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
    },
    success: {
      background: 'radial-gradient(ellipse at center, hsl(142 76% 36% / 0.15) 0%, transparent 70%)',
      hoverBackground: 'radial-gradient(ellipse at center, hsl(142 76% 36% / 0.25) 0%, transparent 70%)',
    },
    warning: {
      background: 'radial-gradient(ellipse at center, hsl(38 92% 50% / 0.15) 0%, transparent 70%)',
      hoverBackground: 'radial-gradient(ellipse at center, hsl(38 92% 50% / 0.25) 0%, transparent 70%)',
    },
    info: {
      background: 'radial-gradient(ellipse at center, hsl(217 91% 60% / 0.15) 0%, transparent 70%)',
      hoverBackground: 'radial-gradient(ellipse at center, hsl(217 91% 60% / 0.25) 0%, transparent 70%)',
    },
  };

  // Blur amounts for different intensities
  const blurAmounts = {
    subtle: 'blur-xl',
    medium: 'blur-2xl',
    strong: 'blur-3xl',
  };

  // Scale amounts for glow spread
  const scaleAmounts = {
    subtle: 'scale-100',
    medium: 'scale-105',
    strong: 'scale-110',
  };

  const colors = glowStyles[glowColor];
  const blur = blurAmounts[glowIntensity];
  const scale = scaleAmounts[glowIntensity];

  return (
    <div
      className={cn(
        'relative w-fit h-fit', // Constrain to content size
        animate && 'animate-in fade-in slide-in-from-bottom-2 duration-500',
        className
      )}
      style={{ animationDelay: animate ? `${animationDelay}ms` : undefined }}
    >
      {/* Soft glow layer - uses radial gradient for natural falloff */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl transition-all duration-700 pointer-events-none',
          blur,
          scale,
          hoverEffect ? 'opacity-0 group-hover:opacity-100' : 'opacity-60'
        )}
        style={{
          background: hoverEffect ? colors.hoverBackground : colors.background,
        }}
      />

      {/* Static subtle glow always visible */}
      {!hoverEffect && (
        <div
          className={cn(
            'absolute inset-0 rounded-2xl pointer-events-none',
            'blur-xl opacity-40'
          )}
          style={{
            background: colors.background,
          }}
        />
      )}

      {/* Content card */}
      <div
        className={cn(
          'relative rounded-xl border bg-card/95 backdrop-blur-sm',
          'transition-all duration-300',
          hoverEffect && 'group-hover:border-primary/20 group-hover:shadow-lg'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default GlowingCard;
