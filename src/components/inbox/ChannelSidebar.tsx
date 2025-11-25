/**
 * ChannelSidebar Component
 * Left sidebar for filtering inbox by channel
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getUserChannelConnections } from '@/data/user/channels';
import { 
  Mail, 
  MessageSquare, 
  Calendar,
  Inbox as InboxIcon,
  Loader2,
  Linkedin,
  Instagram,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConnectChannelDialog } from '@/components/channels/ConnectChannelDialog';

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
      <div className="w-20 flex flex-col items-center py-4 border-r">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
            'mb-4 flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all',
            selectedChannel === null
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-background hover:bg-muted text-muted-foreground'
          )}
          title="All inboxes"
        >
          <InboxIcon className="h-6 w-6" />
          {selectedChannel === null && (
            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </button>

        {/* Channel Icons */}
        <div className="flex flex-col gap-3 flex-1">
          {channels.map((channel) => {
            const Icon = getProviderIcon(channel.provider);
            const isSelected = selectedChannel === channel.id;
            const unreadCount = messageCounts[channel.id] || 0;

            return (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-background hover:bg-muted text-muted-foreground'
                )}
                title={getProviderName(channel.provider)}
              >
                <Icon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Add Channel Button - Always at bottom */}
        <button
          onClick={() => setConnectDialogOpen(true)}
          className={cn(
            'mt-auto flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all',
            'bg-primary/10 hover:bg-primary/20 text-primary border-2 border-dashed border-primary/30 hover:border-primary/50'
          )}
          title="Connect new channel"
        >
          <Plus className="h-6 w-6" />
        </button>
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

