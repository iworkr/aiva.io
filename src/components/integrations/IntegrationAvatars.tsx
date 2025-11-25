/**
 * IntegrationAvatars Component
 * Displays integration logos in an overlapping circular avatar style
 * Similar to user avatar groups
 */

'use client';

import { useState } from 'react';
import { IntegrationIcon } from './IntegrationLogo';
import type { Integration } from '@/lib/integrations/config';
import { cn } from '@/lib/utils';

interface IntegrationAvatarsProps {
  integrations: Integration[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCount?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizes = {
  sm: 16,
  md: 24,
  lg: 32,
};

export function IntegrationAvatars({
  integrations,
  max = 6,
  size = 'md',
  className,
  showCount = true,
}: IntegrationAvatarsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const displayIntegrations = integrations.slice(0, max);
  const remaining = integrations.length - max;
  const hasMore = remaining > 0;
  const maxZIndex = integrations.length + 10;

  return (
    <div className={cn('flex items-center -space-x-3', className)}>
      {displayIntegrations.map((integration, index) => {
        const isHovered = hoveredId === integration.id;
        const baseZIndex = integrations.length - index;
        
        return (
          <div
            key={integration.id}
            className={cn(
              'relative rounded-full bg-white dark:bg-gray-900 border-2 border-white dark:border-gray-900 flex items-center justify-center shadow-md transition-all duration-200',
              sizeClasses[size],
              isHovered && 'scale-110'
            )}
            style={{ zIndex: isHovered ? maxZIndex : baseZIndex }}
            title={integration.name}
            onMouseEnter={() => setHoveredId(integration.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <IntegrationIcon integration={integration} size={iconSizes[size]} />
          </div>
        );
      })}
      {hasMore && showCount && (
        <div
          className={cn(
            'relative rounded-full bg-gray-900 dark:bg-gray-800 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-semibold text-white shadow-md',
            sizeClasses[size]
          )}
          title={`${remaining} more integration${remaining !== 1 ? 's' : ''}`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

