/**
 * ChannelSidebar Component
 * Left sidebar for filtering inbox by channel
 */

'use client';

import { ConnectChannelDialog } from '@/components/channels/ConnectChannelDialog';
import { getUserChannelConnections } from '@/data/user/channels';
import { getIntegrationById } from '@/lib/integrations/config';
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
import { useEffect, useState } from 'react';
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

// Provider display names
const getProviderName = (provider: string) => {
  const names: Record<string, string> = {
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
  return names[provider.toLowerCase()] || provider;
};

export function ChannelSidebar({
  workspaceId,
  userId,
  selectedChannel,
  onChannelSelect,
  messageCounts = {},
}: ChannelSidebarProps) {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  const fetchChannels = async () => {
    try {
      const data = await getUserChannelConnections(workspaceId, userId);
      setChannels(data || []);
    } catch (error) {
      toast.error('Failed to load channels');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [workspaceId, userId]);

  const handleChannelConnected = () => {
    // Refresh channels list after connecting
    fetchChannels();
    toast.success('Channel connected successfully!');
  };

  if (loading) {
    return (
      <div className="w-20 flex flex-col items-center py-4 border-r space-y-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="w-20 flex flex-col items-center py-4 border-r bg-muted/30">
        {/* All Inboxes */}
        <button
          onClick={() => onChannelSelect(null)}
          className={cn(
            'relative mb-4 flex items-center justify-center w-14 h-14 rounded-2xl transition-all',
            selectedChannel === null
              ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/60'
              : 'bg-background hover:bg-muted text-muted-foreground border border-border/60'
          )}
          title="All inboxes"
        >
          <InboxIcon className="h-6 w-6" />
          {selectedChannel === null && (
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-primary-foreground" />
          )}
        </button>

        {/* Channel Icons + Add Channel (tiles in a single list) */}
        <div className="flex flex-col gap-3 flex-1">
          {channels.map((channel) => {
            const Icon = getProviderIcon(channel.provider);
            const isSelected = selectedChannel === channel.id;
            const unreadCount = messageCounts[channel.id] || 0;

            // Build a helpful tooltip including provider + account name/email
            const providerName = getProviderName(channel.provider);
            const accountLabel =
              channel.provider_account_name || channel.provider_account_id || '';
            const tooltip =
              accountLabel && accountLabel !== providerName
                ? `${providerName} – ${accountLabel}`
                : providerName;

            const integration = getIntegrationById(channel.provider);

            return (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={cn(
                  'relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all',
                  isSelected
                    ? 'bg-background text-foreground shadow-lg ring-2 ring-primary'
                    : 'bg-background/80 hover:bg-muted text-muted-foreground border border-border/60'
                )}
                title={tooltip}
              >
                {integration?.logoUrl ? (
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full h-8 w-8',
                      isSelected ? 'bg-white' : 'bg-muted'
                    )}
                  >
                    <Image
                      src={integration.logoUrl}
                      alt={providerName}
                      width={20}
                      height={20}
                      className="object-contain"
                      loading="lazy"
                      unoptimized={integration.logoUrl?.startsWith('http')}
                    />
                  </div>
                ) : (
                  <Icon className="h-6 w-6" />
                )}
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </button>
            );
          })}
          {/* Add Channel Tile (appears as last tile under connections) */}
          <button
            onClick={() => setConnectDialogOpen(true)}
            className={cn(
              'relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all border-2 border-dashed',
              'bg-primary/5 hover:bg-primary/10 text-primary border-primary/40 hover:border-primary/60'
            )}
            title="Connect new channel"
          >
            <Plus className="h-6 w-6" />
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

