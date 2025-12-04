'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, Inbox, Mail, MessageSquare, LucideIcon } from 'lucide-react';
import { providerNames, getIntegrationById } from '@/lib/integrations/config';
import { getUserChannelConnections } from '@/data/user/channels';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Helper function to get provider display name
function getProviderDisplayName(provider: string): string {
  return providerNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

// Provider icon mapping
const providerIcons: Record<string, LucideIcon> = {
  gmail: Mail,
  outlook: Mail,
  slack: MessageSquare,
  teams: MessageSquare,
  whatsapp: MessageSquare,
  telegram: MessageSquare,
};

// Helper function to get channel icon based on provider
function getChannelIcon(provider: string): LucideIcon {
  return providerIcons[provider] || Inbox;
}

// Using a generic type to work with the database response type
type ChannelConnection = Awaited<ReturnType<typeof getUserChannelConnections>>[number];

interface SyncChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId: string;
  onSync: (channelIds: string[] | 'all') => void;
  syncing?: boolean;
}

export function SyncChannelDialog({
  open,
  onOpenChange,
  workspaceId,
  userId,
  onSync,
  syncing = false,
}: SyncChannelDialogProps) {
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [syncAll, setSyncAll] = useState(true);

  // Fetch channels when dialog opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      getUserChannelConnections(workspaceId, userId)
        .then((data) => {
          const activeChannels = (data || []).filter((c) => c.status === 'active');
          setChannels(activeChannels);
          // Select all by default
          setSelectedChannels(new Set(activeChannels.map((c) => c.id)));
          setSyncAll(true);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch channels:', error);
          setChannels([]);
          setLoading(false);
        });
    }
  }, [open, workspaceId, userId]);

  const handleSyncAllChange = (checked: boolean) => {
    setSyncAll(checked);
    if (checked) {
      setSelectedChannels(new Set(channels.map((c) => c.id)));
    }
  };

  const handleChannelToggle = (channelId: string) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channelId)) {
      newSelected.delete(channelId);
    } else {
      newSelected.add(channelId);
    }
    setSelectedChannels(newSelected);
    // Update syncAll based on whether all channels are selected
    setSyncAll(newSelected.size === channels.length);
  };

  const handleSync = () => {
    if (syncAll || selectedChannels.size === channels.length) {
      onSync('all');
    } else {
      onSync(Array.from(selectedChannels));
    }
  };

  const activeCount = selectedChannels.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Channels
          </DialogTitle>
          <DialogDescription>
            Select which channels to sync for new messages
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No connected channels</p>
            </div>
          ) : (
            <>
              {/* Sync All Option */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Checkbox
                  id="sync-all"
                  checked={syncAll}
                  onCheckedChange={handleSyncAllChange}
                />
                <Label
                  htmlFor="sync-all"
                  className="flex-1 cursor-pointer font-medium"
                >
                  Sync all channels
                </Label>
                <span className="text-sm text-muted-foreground">
                  {channels.length} {channels.length === 1 ? 'channel' : 'channels'}
                </span>
              </div>

              {/* Channel List */}
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {channels.map((channel) => {
                  const Icon = getChannelIcon(channel.provider);
                  const isSelected = selectedChannels.has(channel.id);
                  
                  return (
                    <div
                      key={channel.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                        isSelected 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-transparent hover:bg-muted/50'
                      )}
                      onClick={() => handleChannelToggle(channel.id)}
                    >
                      <Checkbox
                        id={`channel-${channel.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleChannelToggle(channel.id)}
                        className="pointer-events-none"
                      />
                      <div className={cn(
                        'flex items-center justify-center w-9 h-9 rounded-lg',
                        isSelected ? 'bg-primary/10' : 'bg-muted/50'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {getProviderDisplayName(channel.provider)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.provider_account_name || 'Connected'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={syncing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSync} 
            disabled={syncing || activeCount === 0}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            {syncing 
              ? 'Syncing...' 
              : syncAll 
                ? 'Sync All Channels' 
                : `Sync ${activeCount} Channel${activeCount !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

