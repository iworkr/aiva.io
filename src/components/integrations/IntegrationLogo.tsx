/**
 * IntegrationLogo Component
 * Displays integration logos with proper styling and fallbacks
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Integration } from '@/lib/integrations/config';

interface IntegrationLogoProps {
  integration: Integration;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBackground?: boolean;
}

const sizeMap = {
  sm: { container: 'h-8 w-8', image: 20 },
  md: { container: 'h-12 w-12', image: 24 },
  lg: { container: 'h-16 w-16', image: 32 },
  xl: { container: 'h-20 w-20', image: 40 },
};

export function IntegrationLogo({
  integration,
  size = 'md',
  className,
  showBackground = true,
}: IntegrationLogoProps) {
  const [imageError, setImageError] = useState(false);
  const { container, image } = sizeMap[size];

  // Fallback to icon or generic mail icon
  const FallbackIcon = integration.icon || Mail;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg',
        showBackground && integration.bgColor,
        container,
        className
      )}
    >
      {!imageError ? (
        <Image
          src={integration.logoUrl}
          alt={`${integration.name} logo`}
          width={image}
          height={image}
          className="object-contain"
          onError={() => setImageError(true)}
          unoptimized // For external CDN URLs
        />
      ) : (
        <FallbackIcon className={cn(integration.textColor, `h-${image / 4} w-${image / 4}`)} />
      )}
    </div>
  );
}

/**
 * IntegrationIcon - Simpler version without container
 */
interface IntegrationIconProps {
  integration: Integration;
  size?: number;
  className?: string;
}

export function IntegrationIcon({
  integration,
  size = 24,
  className,
}: IntegrationIconProps) {
  const [imageError, setImageError] = useState(false);
  const FallbackIcon = integration.icon || Mail;

  return !imageError ? (
    <Image
      src={integration.logoUrl}
      alt={`${integration.name} logo`}
      width={size}
      height={size}
      className={cn('object-contain', className)}
      onError={() => setImageError(true)}
      unoptimized // For external CDN URLs
    />
  ) : (
    <FallbackIcon className={cn(integration.textColor, className)} />
  );
}

