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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  BellOff,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { ChannelLogo } from './ChannelLogo';

// Available channel integrations
const AVAILABLE_CHANNELS = [
  { type: 'gmail', label: 'Gmail', placeholder: 'email@gmail.com' },
  { type: 'outlook', label: 'Outlook', placeholder: 'email@outlook.com' },
  { type: 'slack', label: 'Slack', placeholder: '@username or email' },
  { type: 'instagram', label: 'Instagram', placeholder: '@username' },
  { type: 'whatsapp', label: 'WhatsApp', placeholder: '+1234567890' },
  { type: 'telegram', label: 'Telegram', placeholder: '@username' },
  { type: 'linkedin', label: 'LinkedIn', placeholder: 'profile URL or username' },
  { type: 'twitter', label: 'X (Twitter)', placeholder: '@handle' },
  { type: 'facebook', label: 'Facebook', placeholder: 'profile URL or username' },
  { type: 'teams', label: 'Microsoft Teams', placeholder: 'email@company.com' },
] as const;
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import {
  linkChannelToContactAction,
  deleteContactChannelAction,
  toggleContactFavoriteAction,
  toggleContactUnsubscribeAction,
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
  const [showUnsubscribeConfirm, setShowUnsubscribeConfirm] = useState(false);
  const [showResubscribeConfirm, setShowResubscribeConfirm] = useState(false);

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

  // Toggle unsubscribe - no onUpdate call to avoid full page refresh
  // ContactsView uses optimistic updates to reflect the change immediately
  const { execute: toggleUnsubscribe, status: unsubscribeStatus } = useAction(toggleContactUnsubscribeAction, {
    onSuccess: ({ data }) => {
      if (data?.isUnsubscribed) {
        toast.success('Unsubscribed from this contact');
      } else {
        toast.success('Resubscribed to this contact');
      }
      // Don't call onUpdate() - parent handles optimistic update
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to toggle unsubscribe');
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

  // Sanitize contact name - remove leading/trailing quotes
  const sanitizeContactName = (name: string): string => {
    if (!name) return '';
    return name.replace(/^["'"'"']+|["'"'"']+$/g, '').trim();
  };

  // Get the first letter for avatar display - finds first alphanumeric char
  const getContactInitial = (name: string): string => {
    const sanitized = sanitizeContactName(name);
    if (!sanitized) return '?';
    const match = sanitized.match(/[a-zA-Z0-9]/);
    return match ? match[0].toUpperCase() : sanitized.charAt(0).toUpperCase();
  };

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
    const initial = getContactInitial(name);
    const index = initial.charCodeAt(0) % colors.length;
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

  // Sanitized display values
  const displayName = sanitizeContactName(contact.full_name || '');
  const contactInitial = getContactInitial(contact.full_name || 'A');
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
                  alt={displayName || contact.full_name}
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
                  {contactInitial}
                </div>
              )}

              {/* Name and Title */}
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold truncate">
                  {displayName || contact.full_name}
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
                  title={`${channel.channel_type}: ${channel.channel_display_name ? `${channel.channel_display_name} (${channel.channel_id})` : channel.channel_id}`}
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
              <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                {/* Channel Type Selection */}
                <div>
                  <Label className="text-xs mb-1.5 block">Select Channel</Label>
                  <Select
                    value={newChannel.type}
                    onValueChange={(value) => setNewChannel({ ...newChannel, type: value, id: '' })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choose a channel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_CHANNELS.map((channel) => (
                        <SelectItem key={channel.type} value={channel.type}>
                          <div className="flex items-center gap-2">
                            <ChannelLogo channelType={channel.type} size={16} />
                            <span>{channel.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Channel ID Input - Only show after type is selected */}
                {newChannel.type && (
                  <div>
                    <Label htmlFor="channelId" className="text-xs mb-1.5 block">
                      {AVAILABLE_CHANNELS.find(c => c.type === newChannel.type)?.label} ID
                    </Label>
                    <Input
                      id="channelId"
                      name={`channel-${newChannel.type}`}
                      placeholder={AVAILABLE_CHANNELS.find(c => c.type === newChannel.type)?.placeholder || '@username'}
                      value={newChannel.id}
                      onChange={(e) =>
                        setNewChannel({ ...newChannel, id: e.target.value })
                      }
                      className="h-9 text-sm"
                      autoFocus
                      autoComplete="on"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={handleAddChannel}
                    disabled={linkStatus === 'executing' || !newChannel.type || !newChannel.id}
                    size="sm"
                    className="h-8 text-xs flex-1"
                  >
                    {linkStatus === 'executing' ? (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1.5" />
                    )}
                    Link Channel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
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
                {contact.contact_channels.map((channel: any) => {
                  // Show display name with ID, or just ID if no display name
                  const hasDisplayName = channel.channel_display_name && 
                    channel.channel_display_name !== channel.channel_id;
                  
                  return (
                    <div
                      key={channel.id}
                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <ChannelLogo channelType={channel.channel_type} size={16} />
                        <div className="flex-1 min-w-0">
                          {hasDisplayName ? (
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-sm font-medium truncate">
                                {channel.channel_display_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {channel.channel_id}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm truncate">
                              {channel.channel_id}
                            </p>
                          )}
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
                  );
                })}
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

          {/* Unsubscribe Section */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Notifications</p>
            <div 
              className={cn(
                "rounded-lg border p-3 transition-colors",
                contact.is_unsubscribed 
                  ? "bg-muted/50 border-border" 
                  : "bg-background border-border/50"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {contact.is_unsubscribed ? (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Bell className="h-4 w-4 text-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {contact.is_unsubscribed ? 'Unsubscribed' : 'Subscribed'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contact.is_unsubscribed 
                        ? "Emails from this contact are hidden from your inbox" 
                        : 'Emails appear in your inbox'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={contact.is_unsubscribed ? 'outline' : 'destructive'}
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => {
                    if (contact.is_unsubscribed) {
                      // Resubscribing - show confirmation
                      setShowResubscribeConfirm(true);
                    } else {
                      // Unsubscribing - show confirmation
                      setShowUnsubscribeConfirm(true);
                    }
                  }}
                  disabled={unsubscribeStatus === 'executing'}
                >
                  {unsubscribeStatus === 'executing' && (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  )}
                  {contact.is_unsubscribed ? 'Resubscribe' : 'Unsubscribe'}
                </Button>
              </div>
              {contact.is_unsubscribed && contact.unsubscribed_at && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Unsubscribed on {new Date(contact.unsubscribed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Unsubscribe Confirmation Dialog */}
          <AlertDialog open={showUnsubscribeConfirm} onOpenChange={setShowUnsubscribeConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <AlertDialogTitle>Unsubscribe from {displayName || contact.full_name}?</AlertDialogTitle>
                    <AlertDialogDescription className="mt-1">
                      Emails from this contact will be automatically filtered out of your inbox. You can resubscribe anytime to see their messages again.
                    </AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    toggleUnsubscribe({ id: contact.id, workspaceId });
                    setShowUnsubscribeConfirm(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Unsubscribe
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Resubscribe Confirmation Dialog */}
          <AlertDialog open={showResubscribeConfirm} onOpenChange={setShowResubscribeConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <AlertDialogTitle>Resubscribe to {displayName || contact.full_name}?</AlertDialogTitle>
                    <AlertDialogDescription className="mt-1">
                      Emails from this contact will appear in your inbox again. You&apos;ll see all their messages as normal.
                    </AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    toggleUnsubscribe({ id: contact.id, workspaceId });
                    setShowResubscribeConfirm(false);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Resubscribe
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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

