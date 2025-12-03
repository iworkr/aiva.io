/**
 * Contact Detail Dialog
 * View contact details and manage linked communication channels
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Phone,
  Building,
  Briefcase,
  Star,
  Edit,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { ChannelLogo } from './ChannelLogo';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import {
  linkChannelToContactAction,
  deleteContactChannelAction,
  toggleContactFavoriteAction,
} from '@/data/user/contacts';
import { cn } from '@/lib/utils';

interface ContactDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  workspaceId: string;
  userId: string;
  onEdit: () => void;
  onUpdate: () => void;
}

export function ContactDetailDialog({
  open,
  onOpenChange,
  contact,
  workspaceId,
  userId,
  onEdit,
  onUpdate,
}: ContactDetailDialogProps) {
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ type: '', id: '', displayName: '' });

  // Toggle favorite
  const { execute: toggleFavorite } = useAction(toggleContactFavoriteAction, {
    onSuccess: () => {
      toast.success('Favorite updated');
      onUpdate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to toggle favorite');
    },
  });

  // Link channel
  const { execute: linkChannel, status: linkStatus } = useAction(linkChannelToContactAction, {
    onSuccess: () => {
      toast.success('Channel linked successfully');
      setShowAddChannel(false);
      setNewChannel({ type: '', id: '', displayName: '' });
      onUpdate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to link channel');
    },
  });

  // Delete channel
  const { execute: deleteChannel } = useAction(deleteContactChannelAction, {
    onSuccess: () => {
      toast.success('Channel removed');
      onUpdate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to remove channel');
    },
  });

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

  const handleAddChannel = () => {
    if (!newChannel.type || !newChannel.id) {
      toast.error('Please fill in channel type and ID');
      return;
    }
    linkChannel({
      workspaceId,
      contactId: contact.id,
      channelType: newChannel.type,
      channelId: newChannel.id,
      channelDisplayName: newChannel.displayName || newChannel.id,
    });
  };

  const contactColor = getContactColor(contact.full_name || 'A');
  const displayTitle = contact.job_title || '';
  const displayLocation = contact.company || contact.location || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
        {/* Minimal Header */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Compact Avatar */}
              {contact.avatar_url ? (
                <Image
                  src={contact.avatar_url}
                  alt={contact.full_name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div
                  className={cn(
                    'h-14 w-14 rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0',
                    contactColor
                  )}
                >
                  {contact.full_name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name and Title */}
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold truncate">
                  {contact.full_name}
                </DialogTitle>
                {(displayTitle || displayLocation) && (
                  <p className="text-sm text-muted-foreground truncate">
                    {displayTitle && displayLocation
                      ? `${displayTitle} · ${displayLocation}`
                      : displayTitle || displayLocation}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleFavorite({ id: contact.id, workspaceId })}
                className="h-8 w-8"
                aria-label={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    contact.is_favorite
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-muted-foreground'
                  )}
                  aria-hidden="true"
                />
              </Button>
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 gap-1.5" aria-label="Edit contact">
                <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Button>
            </div>
          </div>

          {/* Channel Icons Row - Inline small */}
          {contact.contact_channels && contact.contact_channels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {contact.contact_channels.slice(0, 6).map((channel: any) => (
                <div
                  key={channel.id}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                  title={`${channel.channel_type}: ${channel.channel_display_name || channel.channel_id}`}
                >
                  <ChannelLogo channelType={channel.channel_type} size={18} />
                </div>
              ))}
              {contact.contact_channels.length > 6 && (
                <span className="text-xs text-muted-foreground">
                  +{contact.contact_channels.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="px-6 py-5 space-y-5">

          {/* Bio - Full Text */}
          {contact.bio && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">About</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {contact.bio}
              </p>
            </div>
          )}

          {/* Contact Information */}
          {(contact.email || contact.phone || contact.company || contact.job_title) && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Details</p>
              <div className="space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2.5">
                    <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{contact.company}</span>
                  </div>
                )}
                {contact.job_title && (
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{contact.job_title}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Communication Channels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Channels</p>
              <button
                onClick={() => setShowAddChannel(!showAddChannel)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>

            {/* Add Channel Form */}
            {showAddChannel && (
              <div className="rounded-lg bg-muted/30 p-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="channelType" className="text-xs">Type</Label>
                    <Input
                      id="channelType"
                      placeholder="instagram, whatsapp..."
                      value={newChannel.type}
                      onChange={(e) =>
                        setNewChannel({ ...newChannel, type: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="channelId" className="text-xs">ID</Label>
                    <Input
                      id="channelId"
                      placeholder="@username"
                      value={newChannel.id}
                      onChange={(e) =>
                        setNewChannel({ ...newChannel, id: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddChannel}
                    disabled={linkStatus === 'executing'}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    {linkStatus === 'executing' && (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    )}
                    Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowAddChannel(false);
                      setNewChannel({ type: '', id: '', displayName: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Channels List */}
            {contact.contact_channels && contact.contact_channels.length > 0 ? (
              <div className="space-y-1">
                {contact.contact_channels.map((channel: any) => (
                  <div
                    key={channel.id}
                    className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <ChannelLogo channelType={channel.channel_type} size={16} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm capitalize truncate">
                          {channel.channel_display_name || channel.channel_id}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remove ${channel.channel_type} channel?`)) {
                          deleteChannel({ id: channel.id, workspaceId });
                        }
                      }}
                      aria-label={`Remove ${channel.channel_type} channel`}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No channels linked
              </p>
            )}
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {contact.notes}
              </p>
            </div>
          )}

          {/* Activity Summary */}
          {contact.interaction_count > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Activity</p>
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{contact.interaction_count}</span> interaction{contact.interaction_count !== 1 ? 's' : ''}
                {contact.last_interaction_at && (
                  <span> · Last {new Date(contact.last_interaction_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
            Added {new Date(contact.created_at).toLocaleDateString()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

