/**
 * InboxView Component (Performance Optimized)
 * Redesigned unified inbox with channel sidebar
 * Features: Debounced search, localStorage caching, optimistic updates
 */

'use client';

import { LazyConnectChannelDialog } from '@/components/lazy/LazyDialogs';
import { IntegrationAvatars } from '@/components/integrations/IntegrationAvatars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUserChannelConnections } from '@/data/user/channels';
import {
  getMessagesAction,
  getNewMessagesAction,
  syncWorkspaceConnectionsAction,
} from '@/data/user/messages';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDebouncedValue } from '@/hooks/usePrefetch';
import { allIntegrations } from '@/lib/integrations/config';
import { cn } from '@/lib/utils';
import { Inbox as InboxIcon, Plus, RefreshCw, Search } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useState, useTransition, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { ChannelSidebar } from './ChannelSidebar';
import { MessageList } from './MessageList';
import { InboxSkeleton } from './InboxSkeleton';
import type { MessagePriority, MessageCategory } from '@/utils/zod-schemas/aiva-schemas';

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
  const cacheKeyRef = useRef<string>('');
  const lastFetchRef = useRef<number>(0);
  const fetchingRef = useRef<boolean>(false);
  const lastSyncTimestampRef = useRef<string>(new Date().toISOString());

  // Debounce search for better performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Create cache key
  const cacheKey = useMemo(
    () => `inbox-cache-${workspaceId}-${selectedChannel || 'all'}-${filters?.priority || 'all'}-${filters?.category || 'all'}-${filters?.status || 'all'}`,
    [workspaceId, selectedChannel, filters?.priority, filters?.category, filters?.status]
  );

  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only use cache if it's less than 30 seconds old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 1000) {
          setMessages(parsed.messages || []);
          setMessageCounts(parsed.messageCounts || {});
          setLoading(false);
          // Still fetch in background to update
        }
      }
    } catch (error) {
      console.error('Failed to load from cache:', error);
    }
  }, [cacheKey]);

  // Fetch messages with better caching
  const { execute: fetchMessages, status: fetchStatus } = useAction(getMessagesAction, {
    onSuccess: ({ data }) => {
      if (data && data.messages) {
        const messagesArray = Array.isArray(data.messages) ? data.messages : [];
        
        // Batch update to prevent individual UI refreshes
        startTransition(() => {
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

          // Cache the result
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                messages: messagesArray,
                messageCounts: counts,
                timestamp: Date.now(),
              })
            );
          } catch (error) {
            console.error('Failed to cache messages:', error);
          }
          
          // Update last sync timestamp based on newest message
          if (messagesArray.length > 0) {
            const newestMessage = messagesArray[0];
            const newestTimestamp = newestMessage.created_at || newestMessage.timestamp;
            if (newestTimestamp) {
              lastSyncTimestampRef.current = new Date(newestTimestamp).toISOString();
            }
          }
        });
      } else {
        setMessages([]);
        setMessageCounts({});
      }
      setLoading(false);
      lastFetchRef.current = Date.now();
      fetchingRef.current = false;
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to load messages');
      setLoading(false);
      setMessages([]);
      setMessageCounts({});
      fetchingRef.current = false;
    },
  });

  // Fetch only new messages (for seamless background sync)
  const { execute: fetchNewMessages } = useAction(getNewMessagesAction, {
    onSuccess: ({ data }) => {
      if (data?.messages && data.messages.length > 0) {
        // Seamlessly merge new messages at the top
        startTransition(() => {
          setMessages((prevMessages) => {
            // Create a map of existing message IDs for quick lookup
            const existingIds = new Set(prevMessages.map((msg) => msg.id));
            
            // Filter out duplicates and merge new messages at the top
            const newMessages = data.messages.filter((msg) => !existingIds.has(msg.id));
            
            if (newMessages.length > 0) {
              // Merge: new messages first, then existing messages
              // Sort by timestamp descending to maintain order
              const merged = [...newMessages, ...prevMessages].sort((a, b) => {
                const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
                const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
                return timeB - timeA;
              });
              
              // Update message counts for unread messages
              const newCounts = { ...messageCounts };
              newMessages.forEach((msg) => {
                if (!msg.is_read && msg.channel_connection_id) {
                  const channelId = msg.channel_connection_id;
                  newCounts[channelId] = (newCounts[channelId] || 0) + 1;
                }
              });
              setMessageCounts(newCounts);
              
              // Update cache silently
              try {
                const cacheData = {
                  messages: merged,
                  messageCounts: newCounts,
                  timestamp: Date.now(),
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
              } catch (error) {
                console.error('Failed to update cache:', error);
              }
              
              // Show subtle notification only if there are new messages
              if (newMessages.length > 0) {
                toast.success(`${newMessages.length} new message${newMessages.length > 1 ? 's' : ''}`, {
                  duration: 2000,
                });
              }
              
              return merged;
            }
            
            return prevMessages;
          });
        });
      }
    },
    onError: ({ error }) => {
      // Silently fail - don't disrupt user experience
      console.error('Failed to fetch new messages:', error);
    },
  });

  // Sync all workspace connections (server action) - seamless background sync
  const { execute: syncWorkspaceConnections, status: syncStatus } = useAction(
    syncWorkspaceConnectionsAction,
    {
      onSuccess: ({ data }) => {
        if (data && data.totalNewMessages && data.totalNewMessages > 0) {
          // Store timestamp before sync to fetch only new messages
          const syncStartTime = lastSyncTimestampRef.current;
          
          // Fetch only new messages created after the sync started
          // Use a small delay to ensure all messages are committed to DB
          setTimeout(() => {
            fetchNewMessages({
              workspaceId,
              channelConnectionId: selectedChannel || undefined,
              priority: filters?.priority,
              category: filters?.category,
              isRead: filters?.status === 'unread' ? false : undefined,
              afterTimestamp: syncStartTime,
              limit: 100,
            });
          }, 500);
          
          // Update sync timestamp for next sync
          lastSyncTimestampRef.current = new Date().toISOString();
        }
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

    // Check if we need to fetch (avoid duplicate fetches)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;
    const cacheKeyChanged = cacheKeyRef.current !== cacheKey;
    
    // Only fetch if:
    // 1. Not already fetching
    // 2. Cache key changed (different filters/channel) OR it's been more than 30 seconds
    if (!fetchingRef.current && (cacheKeyChanged || timeSinceLastFetch > 30 * 1000)) {
      cacheKeyRef.current = cacheKey;
      fetchingRef.current = true;
      setLoading(true);
      fetchMessages({
        workspaceId,
        channelConnectionId: selectedChannel || undefined,
        priority: filters?.priority,
        category: filters?.category,
        isRead: filters?.status === 'unread' ? false : undefined,
        limit: 100,
        offset: 0,
      });
    }
  }, [
    workspaceId,
    selectedChannel,
    filters?.priority,
    filters?.category,
    filters?.status,
    hasChannels,
    searchParams,
    router,
    cacheKey,
    fetchMessages,
  ]);

  // Sync all channels - seamless background sync
  const handleSync = () => {
    // Store timestamp before sync to fetch only new messages
    lastSyncTimestampRef.current = new Date().toISOString();
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
            <InboxSkeleton />
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
                // Invalidate cache and refresh messages after update
                try {
                  localStorage.removeItem(cacheKey);
                } catch (error) {
                  console.error('Failed to clear cache:', error);
                }
                fetchingRef.current = false;
                lastFetchRef.current = 0; // Force refresh
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

      {/* Connect Channel Dialog - Lazy Loaded */}
      <LazyConnectChannelDialog
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
