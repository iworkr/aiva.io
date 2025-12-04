/**
 * ChannelSidebar Component
 * Left sidebar for filtering inbox by channel
 * Uses stale-while-revalidate caching for instant load
 */

'use client';

import { ConnectChannelDialog } from '@/components/channels/ConnectChannelDialog';
import { getUserChannelConnections } from '@/data/user/channels';
import { getIntegrationById } from '@/lib/integrations/config';
import { useCachedData } from '@/hooks/useCachedData';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Inbox as InboxIcon,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface ChannelSidebarProps {
  workspaceId: string;
  userId: string;
  selectedChannel: string | null;
  onChannelSelect: (channelId: string | null) => void;
  messageCounts?: Record<string, number>;
}

// Provider icon mapping
const getProviderIcon = (provider: string) => {
  const icons: Record<string, any> = {
    gmail: Mail,
    outlook: Mail,
    slack: MessageSquare,
    teams: MessageSquare,
    whatsapp: MessageSquare,
    instagram: Instagram,
    linkedin: Linkedin,
    facebook_messenger: MessageSquare,
    google_calendar: Calendar,
    outlook_calendar: Calendar,
  };
  return icons[provider.toLowerCase()] || Mail;
};

// Provider display names - shortened for sidebar, full for tooltips
const getProviderName = (provider: string, short = false) => {
  if (short) {
    // Shortened names for sidebar display
    const shortNames: Record<string, string> = {
      gmail: 'Gmail',
      outlook: 'Outlook',
      slack: 'Slack',
      teams: 'Teams',
      whatsapp: 'WhatsApp',
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      facebook_messenger: 'Messenger',
      google_calendar: 'Calendar',
      outlook_calendar: 'Calendar',
    };
    return shortNames[provider.toLowerCase()] || provider;
  }
  // Full names for tooltips
  const fullNames: Record<string, string> = {
    gmail: 'Gmail',
    outlook: 'Outlook',
    slack: 'Slack',
    teams: 'Microsoft Teams',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    facebook_messenger: 'Facebook Messenger',
    google_calendar: 'Google Calendar',
    outlook_calendar: 'Outlook Calendar',
  };
  return fullNames[provider.toLowerCase()] || provider;
};

export function ChannelSidebar({
  workspaceId,
  userId,
  selectedChannel,
  onChannelSelect,
  messageCounts = {},
}: ChannelSidebarProps) {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  // Use cached data hook for instant load with background refresh
  const {
    data: channels,
    isLoading: loading,
    isRefreshing,
    refresh: refreshChannels,
  } = useCachedData<any[]>(
    `channels-${workspaceId}`,
    useCallback(async () => {
      const data = await getUserChannelConnections(workspaceId, userId);
      return data || [];
    }, [workspaceId, userId]),
    {
      ttl: 5 * 60 * 1000, // 5 minutes cache
      deps: [workspaceId, userId],
    }
  );

  const handleChannelConnected = useCallback(() => {
    // Refresh channels list after connecting
    refreshChannels();
    toast.success('Channel connected successfully!');
  }, [refreshChannels]);

  // Only show skeleton on first load when no cached data exists
  if (loading && !channels) {
    return (
      <div className="w-24 flex flex-col items-center py-4 border-r space-y-3 px-2">
        <div className="flex flex-col items-center w-full py-2">
          <Skeleton className="h-11 w-11 rounded-xl mb-1" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
        <div className="flex flex-col items-center w-full py-2">
          <Skeleton className="h-11 w-11 rounded-xl mb-1" />
          <Skeleton className="h-3 w-10 rounded" />
        </div>
        <div className="flex flex-col items-center w-full py-2">
          <Skeleton className="h-11 w-11 rounded-xl mb-1" />
          <Skeleton className="h-3 w-6 rounded" />
        </div>
      </div>
    );
  }
  
  // Default to empty array if channels is null
  const channelsList = channels || [];

  return (
    <>
      <div className="w-24 flex flex-col items-center py-4 border-r bg-muted/30">
        {/* All Inboxes */}
        <button
          onClick={() => onChannelSelect(null)}
          className={cn(
            'relative mb-4 flex flex-col items-center justify-center w-full px-2 py-2 rounded-xl transition-all group',
            selectedChannel === null
              ? 'text-primary-foreground'
              : 'text-muted-foreground'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl mb-1 transition-all',
            selectedChannel === null 
              ? 'bg-primary shadow-md ring-2 ring-primary' 
              : 'bg-muted/50 group-hover:bg-muted'
          )}>
            <InboxIcon className="h-5 w-5" />
          </div>
          <span className={cn(
            'text-[10px] font-medium truncate max-w-full',
            selectedChannel === null ? 'text-primary-foreground' : 'text-muted-foreground'
          )}>
            All
          </span>
          {selectedChannel === null && (
            <div className="absolute top-1 right-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-primary" />
          )}
        </button>

        {/* Channel Icons + Add Channel (tiles in a single list) */}
        <div className="flex flex-col gap-2 flex-1 w-full">
          {channelsList.map((channel) => {
            const Icon = getProviderIcon(channel.provider);
            const isSelected = selectedChannel === channel.id;
            const unreadCount = messageCounts[channel.id] || 0;

            // Build a helpful tooltip including provider + account name/email (use full name)
            const providerFullName = getProviderName(channel.provider, false);
            const providerShortName = getProviderName(channel.provider, true);
            const accountLabel =
              channel.provider_account_name || channel.provider_account_id || '';
            const tooltip =
              accountLabel && accountLabel !== providerFullName
                ? `${providerFullName} – ${accountLabel}`
                : providerFullName;

            const integration = getIntegrationById(channel.provider);

            return (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center w-full px-2 py-2 rounded-xl transition-all group',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}
                title={tooltip}
              >
                {/* Icon container - ring/selection applied here only */}
                <div className={cn(
                  'relative flex items-center justify-center w-11 h-11 rounded-xl mb-1 transition-all',
                  isSelected 
                    ? 'bg-background shadow-md ring-2 ring-primary' 
                    : 'bg-muted/50 group-hover:bg-muted'
                )}>
                  {integration?.logoUrl ? (
                    <Image
                      src={integration.logoUrl}
                      alt={providerFullName}
                      width={22}
                      height={22}
                      className="object-contain"
                      loading="lazy"
                      unoptimized={integration.logoUrl?.startsWith('http')}
                    />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                  {/* Notification badge - overlaps icon button corner, always visible */}
                  {unreadCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium truncate max-w-full',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {providerShortName}
                </span>
              </button>
            );
          })}
          {/* Add Channel Tile (appears as last tile under connections) */}
          <button
            onClick={() => setConnectDialogOpen(true)}
            className="relative flex flex-col items-center justify-center w-full px-2 py-2 rounded-xl transition-all group text-primary"
            title="Connect new channel"
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-xl border-2 border-dashed border-primary/30 group-hover:border-primary group-hover:bg-primary/10 mb-1 transition-all">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium">Add</span>
          </button>
        </div>
      </div>

      {/* Connect Channel Dialog */}
      <ConnectChannelDialog
        workspaceId={workspaceId}
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onConnected={handleChannelConnected}
      />
    </>
  );
}

