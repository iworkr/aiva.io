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

  const getChannelIcon = (channelType: string) => {
    switch (channelType.toLowerCase()) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'whatsapp':
      case 'sms':
        return <MessageCircle className="h-4 w-4" />;
      case 'email':
      case 'gmail':
      case 'outlook':
        return <Mail className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={contact.full_name}
                  className="h-16 w-16 rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-semibold">
                  {contact.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <DialogTitle className="text-2xl">{contact.full_name}</DialogTitle>
                {contact.job_title && contact.company && (
                  <p className="text-sm text-muted-foreground">
                    {contact.job_title} at {contact.company}
                  </p>
                )}
              </div>
            </div>
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
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contact Information</h3>
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

          {/* Bio */}
          {contact.bio && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Bio</h3>
              <p className="text-sm text-muted-foreground">{contact.bio}</p>
            </div>
          )}

          {/* Communication Channels */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Communication Channels</h3>
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

