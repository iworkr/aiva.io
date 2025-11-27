/**
 * Modern Contact Tile Component
 * Displays contact information in a modern card format with profile picture glow,
 * large name, title/location, and colorful channel icons
 */

'use client';

import React from 'react';
import { Star, X, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChannelLogo } from './ChannelLogo';

interface ContactTileProps {
  contact: any;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

// Channel icon colors matching the reference design
const channelColors: Record<string, { bg: string; icon: string }> = {
  gmail: { bg: 'bg-red-500', icon: 'text-white' },
  email: { bg: 'bg-red-500', icon: 'text-white' },
  outlook: { bg: 'bg-blue-500', icon: 'text-white' },
  instagram: { bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500', icon: 'text-white' },
  slack: { bg: 'bg-[#4A154B]', icon: 'text-white' },
  whatsapp: { bg: 'bg-green-500', icon: 'text-white' },
  phone: { bg: 'bg-green-500', icon: 'text-white' },
  sms: { bg: 'bg-green-500', icon: 'text-white' },
  linkedin: { bg: 'bg-[#0077B5]', icon: 'text-white' },
  teams: { bg: 'bg-[#6264A7]', icon: 'text-white' },
  default: { bg: 'bg-muted', icon: 'text-muted-foreground' },
};

// ChannelLogo component is used instead of getChannelIcon

const getChannelColor = (channelType: string) => {
  const normalized = channelType.toLowerCase();
  return channelColors[normalized] || channelColors.default;
};

// Generate a color based on contact name for profile picture glow
const getContactColor = (name: string) => {
  const colors = [
    'from-green-400 to-green-600',
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-orange-400 to-orange-600',
    'from-cyan-400 to-cyan-600',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function ContactTile({
  contact,
  onClick,
  onToggleFavorite,
  onEdit,
  onDelete,
}: ContactTileProps) {
  const contactColor = getContactColor(contact.full_name || 'A');
  const displayTitle = contact.job_title || '';
  const displayLocation = contact.company || contact.location || '';

  return (
    <div
      onClick={onClick}
      className="group relative bg-card border border-border rounded-xl p-6 hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-lg"
    >
      {/* Favorite Star - Top Right */}
      <button
        onClick={onToggleFavorite}
        className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Star
          className={cn(
            'h-5 w-5 transition-colors',
            contact.is_favorite
              ? 'fill-yellow-500 text-yellow-500 opacity-100'
              : 'text-muted-foreground hover:text-yellow-500'
          )}
        />
      </button>

      {/* Profile Picture with Glow */}
      <div className="flex items-start gap-4 mb-4">
        {contact.avatar_url ? (
          <div className={cn('relative')}>
            <div
              className={cn(
                'absolute inset-0 rounded-full blur-xl opacity-60 bg-gradient-to-br',
                contactColor
              )}
            />
            <img
              src={contact.avatar_url}
              alt={contact.full_name}
              className="relative h-16 w-16 rounded-full object-cover ring-2 ring-background"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : (
          <div className="relative">
            <div
              className={cn(
                'absolute inset-0 rounded-full blur-xl opacity-60 bg-gradient-to-br',
                contactColor
              )}
            />
            <div
              className={cn(
                'relative h-16 w-16 rounded-full bg-gradient-to-br flex items-center justify-center text-2xl font-bold text-white ring-2 ring-background',
                contactColor
              )}
            >
              {contact.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Name and Title */}
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-xl font-bold text-foreground mb-1 truncate">
            {contact.full_name}
          </h3>
          {(displayTitle || displayLocation) && (
            <p className="text-sm text-muted-foreground truncate">
              {displayTitle && displayLocation
                ? `${displayTitle} - ${displayLocation}`
                : displayTitle || displayLocation}
            </p>
          )}
        </div>
      </div>

      {/* Channel Icons Row */}
      {contact.contact_channels && contact.contact_channels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {contact.contact_channels.slice(0, 6).map((channel: any) => {
            const colors = getChannelColor(channel.channel_type);
            return (
              <div
                key={channel.id}
                className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110',
                  colors.bg,
                  colors.icon
                )}
                title={`${channel.channel_type}: ${channel.channel_display_name || channel.channel_id}`}
              >
                <ChannelLogo channelType={channel.channel_type} size={16} className="text-white" />
              </div>
            );
          })}
          {contact.contact_channels.length > 6 && (
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
              +{contact.contact_channels.length - 6}
            </div>
          )}
        </div>
      )}

      {/* Bio Preview */}
      {contact.bio && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {contact.bio}
        </p>
      )}

      {/* Action Buttons - Bottom Right */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

