/**
 * Contact Detail Dialog
 * View contact details and manage linked communication channels
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserCircle,
  Mail,
  Phone,
  Building,
  Briefcase,
  Star,
  Edit,
  Trash2,
  Plus,
  Instagram,
  MessageCircle,
  Linkedin,
  Twitter,
  Facebook,
  X,
  Loader2,
  Slack,
} from 'lucide-react';
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

  const getChannelIcon = (channelType: string) => {
    const normalized = channelType.toLowerCase();
    switch (normalized) {
      case 'gmail':
      case 'email':
      case 'outlook':
        return <Mail className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'slack':
        return <Slack className="h-4 w-4" />;
      case 'whatsapp':
      case 'phone':
      case 'sms':
        return <MessageCircle className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'twitter':
        return <Twitter className="h-4 w-4" />;
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Modern Header with Profile Picture Glow */}
        <div className="relative bg-gradient-to-b from-background to-background/95 border-b border-border px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              {/* Profile Picture with Glow */}
              {contact.avatar_url ? (
                <div className="relative">
                  <div
                    className={cn(
                      'absolute inset-0 rounded-full blur-2xl opacity-50 bg-gradient-to-br',
                      contactColor
                    )}
                  />
                  <img
                    src={contact.avatar_url}
                    alt={contact.full_name}
                    className="relative h-24 w-24 rounded-full object-cover ring-4 ring-background"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div
                    className={cn(
                      'absolute inset-0 rounded-full blur-2xl opacity-50 bg-gradient-to-br',
                      contactColor
                    )}
                  />
                  <div
                    className={cn(
                      'relative h-24 w-24 rounded-full bg-gradient-to-br flex items-center justify-center text-3xl font-bold text-white ring-4 ring-background',
                      contactColor
                    )}
                  >
                    {contact.full_name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}

              {/* Name and Title */}
              <div className="flex-1 pt-2">
                <DialogTitle className="text-3xl font-bold mb-2">
                  {contact.full_name}
                </DialogTitle>
                {(displayTitle || displayLocation) && (
                  <p className="text-base text-muted-foreground">
                    {displayTitle && displayLocation
                      ? `${displayTitle} - ${displayLocation}`
                      : displayTitle || displayLocation}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleFavorite({ id: contact.id, workspaceId })}
              >
                <Star
                  className={cn(
                    'h-5 w-5',
                    contact.is_favorite
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-muted-foreground'
                  )}
                />
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Channel Icons Row */}
          {contact.contact_channels && contact.contact_channels.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-6">
              {contact.contact_channels.map((channel: any) => {
                const colors = getChannelColor(channel.channel_type);
                return (
                  <div
                    key={channel.id}
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer',
                      colors.bg,
                      colors.icon
                    )}
                    title={`${channel.channel_type}: ${channel.channel_display_name || channel.channel_id}`}
                  >
                    {getChannelIcon(channel.channel_type)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="px-8 py-6 space-y-6">

          {/* Bio - Full Text */}
          {contact.bio && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Biography
              </h3>
              <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                {contact.bio}
              </p>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{contact.email}</p>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm">{contact.phone}</p>
                  </div>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-sm">{contact.company}</p>
                  </div>
                </div>
              )}
              {contact.job_title && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Job Title</p>
                    <p className="text-sm">{contact.job_title}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Communication Channels */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Communication Channels
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddChannel(!showAddChannel)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </div>

            {/* Add Channel Form */}
            {showAddChannel && (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="channelType">Channel Type</Label>
                    <Input
                      id="channelType"
                      placeholder="e.g., instagram, whatsapp"
                      value={newChannel.type}
                      onChange={(e) =>
                        setNewChannel({ ...newChannel, type: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="channelId">Channel ID</Label>
                    <Input
                      id="channelId"
                      placeholder="e.g., @username or email"
                      value={newChannel.id}
                      onChange={(e) =>
                        setNewChannel({ ...newChannel, id: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="channelDisplayName">Display Name (Optional)</Label>
                  <Input
                    id="channelDisplayName"
                    placeholder="e.g., Personal Instagram"
                    value={newChannel.displayName}
                    onChange={(e) =>
                      setNewChannel({ ...newChannel, displayName: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddChannel}
                    disabled={linkStatus === 'executing'}
                    className="flex-1"
                  >
                    {linkStatus === 'executing' && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Link Channel
                  </Button>
                  <Button
                    variant="outline"
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
              <div className="space-y-2">
                {contact.contact_channels.map((channel: any) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getChannelIcon(channel.channel_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize">{channel.channel_type}</p>
                          {channel.is_primary && (
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {channel.channel_display_name || channel.channel_id}
                        </p>
                        {channel.message_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {channel.message_count} messages
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (
                          confirm(
                            `Remove ${channel.channel_type} channel from this contact?`
                          )
                        ) {
                          deleteChannel({ id: channel.id, workspaceId });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                No communication channels linked yet
              </div>
            )}
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag: string, idx: number) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {contact.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
            {contact.interaction_count > 0 && (
              <p>Total interactions: {contact.interaction_count}</p>
            )}
            {contact.last_interaction_at && (
              <p>
                Last interaction:{' '}
                {new Date(contact.last_interaction_at).toLocaleDateString()}
              </p>
            )}
            <p>Added: {new Date(contact.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

