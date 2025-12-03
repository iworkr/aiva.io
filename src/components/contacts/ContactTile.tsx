/**
 * Minimal Contact Tile Component
 * Clean, compact contact card with subtle hover states
 * Supports grid and list variants
 */

'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Star, Trash2, Edit, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelLogo } from './ChannelLogo';

interface ContactTileProps {
  contact: any;
  variant?: 'grid' | 'list';
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

// Generate a subtle color based on contact name for avatar
const getContactColor = (name: string) => {
  const colors = [
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export const ContactTile = memo(function ContactTile({
  contact,
  variant = 'grid',
  onClick,
  onToggleFavorite,
  onEdit,
  onDelete,
}: ContactTileProps) {
  const contactColor = getContactColor(contact.full_name || 'A');
  const displaySubtitle = contact.job_title || contact.company || '';

  // List view - full-width row with more details
  if (variant === 'list') {
    return (
      <div
        onClick={onClick}
        className="group relative rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/30 last:border-b-0"
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {contact.avatar_url ? (
            <Image
              src={contact.avatar_url}
              alt={contact.full_name}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
                contactColor
              )}
            >
              {contact.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name and Title */}
          <div className="w-40 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium text-foreground truncate">
                {contact.full_name}
              </h3>
              {contact.is_favorite && (
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            {displaySubtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {displaySubtitle}
              </p>
            )}
          </div>

          {/* Email */}
          {contact.email && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground w-48 flex-shrink-0">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}

          {/* Phone */}
          {contact.phone && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground w-32 flex-shrink-0">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{contact.phone}</span>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Channel Icons */}
          {contact.contact_channels && contact.contact_channels.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {contact.contact_channels.slice(0, 4).map((channel: any) => (
                <div
                  key={channel.id}
                  className="opacity-50 group-hover:opacity-80 transition-opacity"
                  title={`${channel.channel_type}: ${channel.channel_display_name || channel.channel_id}`}
                >
                  <ChannelLogo channelType={channel.channel_type} size={14} />
                </div>
              ))}
              {contact.contact_channels.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{contact.contact_channels.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleFavorite}
              className="p-1.5 rounded hover:bg-background/80 transition-colors"
              aria-label={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={cn(
                  'h-3.5 w-3.5',
                  contact.is_favorite
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'text-muted-foreground hover:text-yellow-500'
                )}
              />
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded hover:bg-background/80 transition-colors"
                aria-label="Edit contact"
              >
                <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded hover:bg-background/80 transition-colors"
                aria-label="Delete contact"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid view - compact card (default)
  return (
    <div
      onClick={onClick}
      className="group relative rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Compact Avatar */}
        {contact.avatar_url ? (
          <Image
            src={contact.avatar_url}
            alt={contact.full_name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
              contactColor
            )}
          >
            {contact.full_name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name and Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground truncate">
              {contact.full_name}
            </h3>
            {contact.is_favorite && (
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
            )}
          </div>
          {(displaySubtitle || contact.email) && (
            <p className="text-xs text-muted-foreground truncate">
              {displaySubtitle || contact.email}
            </p>
          )}
        </div>

        {/* Channel Icons - Inline small */}
        {contact.contact_channels && contact.contact_channels.length > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {contact.contact_channels.slice(0, 3).map((channel: any) => (
              <div
                key={channel.id}
                className="opacity-50 group-hover:opacity-80 transition-opacity"
                title={`${channel.channel_type}: ${channel.channel_display_name || channel.channel_id}`}
              >
                <ChannelLogo channelType={channel.channel_type} size={14} />
              </div>
            ))}
            {contact.contact_channels.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{contact.contact_channels.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover Actions - Positioned absolute */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
        <button
          onClick={onToggleFavorite}
          className="p-1.5 rounded hover:bg-background/80 transition-colors"
          aria-label={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={cn(
              'h-3.5 w-3.5',
              contact.is_favorite
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-muted-foreground hover:text-yellow-500'
            )}
          />
        </button>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-background/80 transition-colors"
            aria-label="Edit contact"
          >
            <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-background/80 transition-colors"
            aria-label="Delete contact"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        )}
      </div>
    </div>
  );
});

