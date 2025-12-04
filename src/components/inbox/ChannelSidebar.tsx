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

  return (
    <>
      <div className="w-24 flex flex-col items-center py-4 border-r bg-muted/30">
        {/* All Inboxes */}
        <button
          onClick={() => onChannelSelect(null)}
          className={cn(
            'relative mb-4 flex flex-col items-center justify-center w-full px-2 py-2 rounded-xl transition-all group',
            selectedChannel === null
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-transparent hover:bg-muted text-muted-foreground'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl mb-1 transition-all',
            selectedChannel === null 
              ? 'bg-primary-foreground/10' 
              : 'bg-muted group-hover:bg-muted-foreground/10'
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
                  'relative flex flex-col items-center justify-center w-full px-2 py-2 rounded-xl transition-all group',
                  isSelected
                    ? 'bg-muted text-foreground shadow-md ring-2 ring-primary/50'
                    : 'bg-transparent hover:bg-muted/60 text-muted-foreground'
                )}
                title={tooltip}
              >
                <div className={cn(
                  'flex items-center justify-center w-11 h-11 rounded-xl mb-1 transition-all',
                  isSelected ? 'bg-background shadow-sm' : 'bg-muted/50 group-hover:bg-muted'
                )}>
                  {integration?.logoUrl ? (
                    <Image
                      src={integration.logoUrl}
                      alt={providerName}
                      width={22}
                      height={22}
                      className="object-contain"
                      loading="lazy"
                      unoptimized={integration.logoUrl?.startsWith('http')}
                    />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium truncate max-w-full',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {providerName}
                </span>
                {unreadCount > 0 && (
                  <div className="absolute top-1 right-2 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary rounded-r" />
                )}
              </button>
            );
          })}
          {/* Add Channel Tile (appears as last tile under connections) */}
          <button
            onClick={() => setConnectDialogOpen(true)}
            className={cn(
              'relative flex flex-col items-center justify-center w-full px-2 py-2 rounded-xl transition-all group',
              'bg-transparent hover:bg-primary/5 text-primary'
            )}
            title="Connect new channel"
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-xl border-2 border-dashed border-primary/40 group-hover:border-primary/60 mb-1 transition-all">
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

