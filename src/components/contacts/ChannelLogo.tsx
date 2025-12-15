/**
 * Channel Logo Component
 * Displays proper brand logos for communication channels
 * Uses centralized CDN URLs from constants
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Mail, MessageCircle, Instagram, Linkedin, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHANNEL_LOGOS, getChannelLogo } from '@/constants/channel-logos';

interface ChannelLogoProps {
  channelType: string;
  size?: number;
  className?: string;
}

// Fallback icons for channels without logos
const getFallbackIcon = (channelType: string) => {
  const normalized = channelType.toLowerCase();
  if (normalized.includes('gmail') || normalized.includes('email') || normalized.includes('outlook')) {
    return Mail;
  }
  if (normalized.includes('instagram')) {
    return Instagram;
  }
  if (normalized.includes('linkedin')) {
    return Linkedin;
  }
  if (normalized.includes('calendar')) {
    return Calendar;
  }
  return MessageCircle;
};

export function ChannelLogo({ channelType, size = 16, className }: ChannelLogoProps) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = getChannelLogo(channelType);
  const FallbackIcon = getFallbackIcon(channelType);

  if (!logoUrl || imageError) {
    return <FallbackIcon className={cn('h-4 w-4', className)} style={{ width: size, height: size }} />;
  }

  return (
    <Image
      src={logoUrl}
      alt={`${channelType} logo`}
      width={size}
      height={size}
      className={cn('object-contain', className)}
      onError={() => setImageError(true)}
      unoptimized // For external CDN URLs
    />
  );
}

