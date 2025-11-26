/**
 * InboxView Component (Performance Optimized)
 * Redesigned unified inbox with channel sidebar
 * Features: Debounced search, localStorage caching, optimistic updates
 */

'use client';

import { useState, useEffect, useCallback, useTransition, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageList } from './MessageList';
import { ChannelSidebar } from './ChannelSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, Inbox as InboxIcon, Plus } from 'lucide-react';
import {
  getMessagesAction,
  syncWorkspaceConnectionsAction,
} from '@/data/user/messages';
import { getUserChannelConnections } from '@/data/user/channels';
import { ConnectChannelDialog } from '@/components/channels/ConnectChannelDialog';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDebouncedValue } from '@/hooks/usePrefetch';
import { allIntegrations } from '@/lib/integrations/config';
import { IntegrationAvatars } from '@/components/integrations/IntegrationAvatars';

type MessagePriority = 'high' | 'medium' | 'low' | 'noise';
type MessageCategory = 'sales_lead' | 'client_support' | 'internal' | 'social' | 'marketing' | 'personal' | 'other';

interface InboxViewProps {
  workspaceId: string;
  userId: string;
  filters?: {
    priority?: MessagePriority;
    category?: MessageCategory;
    channel?: string;
    status?: string;
  };
}

export const InboxView = memo(function InboxView({ workspaceId, userId, filters }: InboxViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useLocalStorage<string | null>(
    `inbox-selected-channel-${workspaceId}`,
    filters?.channel || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [hasChannels, setHasChannels] = useState<boolean | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Debounce search for better performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Fetch messages
  const { execute: fetchMessages, status: fetchStatus } = useAction(getMessagesAction, {
    onSuccess: ({ data }) => {
      if (data && data.messages) {
        const messagesArray = Array.isArray(data.messages) ? data.messages : [];
        setMessages(messagesArray);
        
        // Calculate message counts per channel
        const counts: Record<string, number> = {};
        messagesArray.forEach((msg: any) => {
          const channelId = msg.channel_connection_id || msg.channel_connection?.id;
          if (!msg.is_read && channelId) {
            counts[channelId] = (counts[channelId] || 0) + 1;
          }
        });
        setMessageCounts(counts);
      } else {
        setMessages([]);
        setMessageCounts({});
      }
      setLoading(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to load messages');
      setLoading(false);
      setMessages([]);
      setMessageCounts({});
    },
  });

  // Sync all workspace connections (server action)
  const { execute: syncWorkspaceConnections, status: syncStatus } = useAction(
    syncWorkspaceConnectionsAction,
    {
      onSuccess: ({ data }) => {
        if (data) {
          toast.success(
            `Synced ${data.totalNewMessages ?? 0} new message(s) from ${
              data.totalConnections ?? 0
            } channel(s)`
          );
        }
        // Refresh messages after sync
        fetchMessages({
          workspaceId,
          channelConnectionId: selectedChannel || undefined,
          priority: filters?.priority,
          category: filters?.category,
          isRead: filters?.status === 'unread' ? false : undefined,
          limit: 100,
          offset: 0,
        });
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to sync channels');
        console.error('syncWorkspaceConnectionsAction error', error);
      },
      onSettled: () => {
        setSyncing(false);
      },
    }
  );

  // Check if user has any channels connected
  useEffect(() => {
    const checkChannels = async () => {
      try {
        const channels = await getUserChannelConnections(workspaceId, userId);
        setHasChannels(channels && channels.length > 0);
      } catch (error) {
        console.error('Failed to check channels:', error);
        setHasChannels(false);
      }
    };

    checkChannels();
  }, [workspaceId, userId]);

  // Load messages on mount and when filters / channel change
  useEffect(() => {
    // Only fetch messages if user has channels
    if (hasChannels === false) {
      setLoading(false);
      setMessages([]);
      return;
    }

    if (hasChannels === null) {
      // Still checking for channels
      return;
    }

    setLoading(true);

    // Update URL query params only when they actually change,
    // to avoid an infinite loop of rerenders + POST /en/inbox calls.
    const params = new URLSearchParams();

    if (selectedChannel) {
      params.set('channel', selectedChannel);
    }
    if (filters?.priority) {
      params.set('priority', filters.priority);
    }
    if (filters?.category) {
      params.set('category', filters.category);
    }
    if (filters?.status === 'unread') {
      params.set('status', 'unread');
    }

    const newQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (newQuery !== currentQuery) {
      router.replace(`?${newQuery}`);
    }

    fetchMessages({
      workspaceId,
      channelConnectionId: selectedChannel || undefined,
      priority: filters?.priority,
      category: filters?.category,
      isRead: filters?.status === 'unread' ? false : undefined,
      limit: 100,
      offset: 0,
    });
  }, [
    workspaceId,
    selectedChannel,
    filters?.priority,
    filters?.category,
    filters?.status,
    hasChannels,
    searchParams,
    router,
  ]);

  // Sync all channels
  const handleSync = () => {
    setSyncing(true);
    syncWorkspaceConnections({
      workspaceId,
      maxMessagesPerConnection: 50,
      autoClassify: true,
    });
  };

  // Filter messages by search query (memoized with debounced search)
  const filteredMessages = useCallback(() => {
    if (!debouncedSearchQuery) return messages;
    const query = debouncedSearchQuery.toLowerCase();
    return messages.filter((msg) => 
      msg.subject?.toLowerCase().includes(query) ||
      msg.sender_name?.toLowerCase().includes(query) ||
      msg.sender_email?.toLowerCase().includes(query) ||
      msg.body?.toLowerCase().includes(query) ||
      msg.snippet?.toLowerCase().includes(query)
    );
  }, [messages, debouncedSearchQuery])();

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Channel Filters */}
      <ChannelSidebar
        workspaceId={workspaceId}
        userId={userId}
        selectedChannel={selectedChannel}
        onChannelSelect={setSelectedChannel}
        messageCounts={messageCounts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Search Bar */}
        <div className="border-b bg-background px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Start typing to ask or search Aiva"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || syncStatus === 'executing'}
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  (syncing || syncStatus === 'executing') && 'animate-spin'
                )}
              />
            </Button>
        </div>
      </div>

        {/* Message List */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
            </div>
          </div>
          ) : hasChannels === false ? (
          // No channels connected - Show connect prompt
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md px-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Plus className="h-10 w-10 text-primary" />
                </div>
              <h3 className="text-2xl font-semibold mb-3">Connect Your First Channel</h3>
              <p className="text-muted-foreground mb-6">
                  Get started by connecting your email or messaging accounts. 
                  We'll sync your messages and help you manage them with AI.
              </p>
              <Button
                  size="lg"
                  onClick={() => setConnectDialogOpen(true)}
                  className="gap-2"
              >
                  <Plus className="h-5 w-5" />
                  Connect Channel
              </Button>
                <div className="mt-6 flex flex-col items-center gap-3">
                  <IntegrationAvatars integrations={allIntegrations} max={7} />
                  <p className="text-sm text-muted-foreground">
                    Available integrations
                  </p>
                </div>
            </div>
          </div>
          ) : filteredMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <InboxIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No messages</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'No messages match your search'
                    : selectedChannel
                    ? 'No messages in this channel'
                    : 'Your inbox is empty. Click sync to fetch new messages.'}
              </p>
                {!searchQuery && (
              <Button
                  className="mt-4"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing || syncStatus === 'executing'}
                >
                  <RefreshCw
                    className={cn(
                      'mr-2 h-4 w-4',
                      (syncing || syncStatus === 'executing') && 'animate-spin'
                    )}
                  />
                  Sync Messages
                </Button>
                )}
            </div>
          </div>
        ) : (
          <MessageList
              messages={filteredMessages}
            workspaceId={workspaceId}
            onMessageUpdate={() => {
              // Refresh messages after update
              fetchMessages({
                workspaceId,
                  channelConnectionId: selectedChannel || undefined,
                  priority: filters?.priority,
                  category: filters?.category,
                  isRead: filters?.status === 'unread' ? false : undefined,
                  limit: 100,
                  offset: 0,
              });
            }}
          />
        )}
        </div>
      </div>

      {/* Connect Channel Dialog */}
      <ConnectChannelDialog
        workspaceId={workspaceId}
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onConnected={() => {
          setConnectDialogOpen(false);
          // Refresh channels check
          getUserChannelConnections(workspaceId, userId).then((channels) => {
            setHasChannels(channels && channels.length > 0);
            if (channels && channels.length > 0) {
              toast.success('Channel connected! Syncing messages...');
              handleSync();
            }
          });
        }}
      />
    </div>
  );
});
