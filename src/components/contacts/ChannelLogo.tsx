/**
 * Channel Logo Component
 * Displays proper brand logos for communication channels
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Mail, MessageCircle, Instagram, Linkedin, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChannelLogoProps {
  channelType: string;
  size?: number;
  className?: string;
}

// Channel logo URLs from CDN
const channelLogos: Record<string, string> = {
  gmail: 'https://static.cdnlogo.com/logos/g/24/gmail-icon.svg',
  email: 'https://static.cdnlogo.com/logos/g/24/gmail-icon.svg',
  outlook: 'https://static.cdnlogo.com/logos/o/82/outlook.svg',
  slack: 'https://static.cdnlogo.com/logos/s/40/slack-new.svg',
  teams: 'https://static.cdnlogo.com/logos/m/77/microsoft-teams-1.svg',
  whatsapp: 'https://static.cdnlogo.com/logos/w/35/whatsapp-icon.svg',
  instagram: 'https://static.cdnlogo.com/logos/i/59/instagram.svg',
  linkedin: 'https://cdn.cdnlogo.com/logos/l/66/linkedin-icon.svg',
  twitter: 'https://static.cdnlogo.com/logos/x/9/x.svg',
  facebook: 'https://cdn.cdnlogo.com/logos/f/25/facebook-messenger.svg',
  telegram: 'https://cdn.cdnlogo.com/logos/t/39/telegram.svg',
  sms: 'https://static.cdnlogo.com/logos/w/35/whatsapp-icon.svg',
  phone: 'https://static.cdnlogo.com/logos/w/35/whatsapp-icon.svg',
};

// Fallback icons for channels without logos
const getFallbackIcon = (channelType: string) => {
  const normalized = channelType.toLowerCase();
  switch (normalized) {
    case 'gmail':
    case 'email':
    case 'outlook':
      return Mail;
    case 'instagram':
      return Instagram;
    case 'whatsapp':
    case 'phone':
    case 'sms':
      return MessageCircle;
    case 'linkedin':
      return Linkedin;
    default:
      return MessageCircle;
  }
};

export function ChannelLogo({ channelType, size = 16, className }: ChannelLogoProps) {
  const [imageError, setImageError] = useState(false);
  const normalized = channelType.toLowerCase();
  const logoUrl = channelLogos[normalized];
  const FallbackIcon = getFallbackIcon(channelType);

  if (!logoUrl || imageError) {
    return <FallbackIcon className={cn('h-4 w-4', className)} />;
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

