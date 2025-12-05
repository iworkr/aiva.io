/**
 * InboxView Component (Performance Optimized)
 * Redesigned unified inbox with channel sidebar
 * Features: Debounced search, localStorage caching, optimistic updates
 */

'use client';

import { IntegrationAvatars } from '@/components/integrations/IntegrationAvatars';
import { LazyConnectChannelDialog } from '@/components/lazy/LazyDialogs';
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
import type { MessageCategory, MessagePriority } from '@/utils/zod-schemas/aiva-schemas';
import { Inbox as InboxIcon, Plus, RefreshCw, Search } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ChannelSidebar } from './ChannelSidebar';
import { InboxHeaderFilters, type SortOption, type StatusFilter } from './InboxHeaderFilters';
import { InboxSkeleton } from './InboxSkeleton';
import { MessageList } from './MessageList';
import { SyncChannelDialog } from './SyncChannelDialog';
import { SyncProgressDialog } from '@/components/sync/SyncProgressDialog';
import { useSyncStatus } from '@/components/sync/SyncStatusProvider';

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
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Global sync status from context
  const { 
    dialogOpen: syncProgressDialogOpen, 
    setDialogOpen: setSyncProgressDialogOpen,
    startSync: contextStartSync,
    setWorkspaceId,
    isSyncing: contextIsSyncing,
  } = useSyncStatus();
  const cacheKeyRef = useRef<string>('');
  const lastFetchRef = useRef<number>(0);
  const fetchingRef = useRef<boolean>(false);
  const lastSyncTimestampRef = useRef<string>(new Date().toISOString());

  // Set workspaceId in global sync context
  useEffect(() => {
    setWorkspaceId(workspaceId);
  }, [workspaceId, setWorkspaceId]);

  // Debounce search for better performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Local status filter (All/Unread/Starred) with localStorage persistence
  const [statusFilter, setStatusFilter] = useLocalStorage<StatusFilter>(
    `inbox-status-filter-${workspaceId}`,
    (filters?.status as StatusFilter) || 'all'
  );

  // Sort option with localStorage persistence
  const [sortBy, setSortBy] = useLocalStorage<SortOption>(
    `inbox-sort-${workspaceId}`,
    'date_desc'
  );

  // Local priority and category filters
  const [priorityFilter, setPriorityFilter] = useState<MessagePriority | undefined>(filters?.priority);
  const [categoryFilter, setCategoryFilter] = useState<MessageCategory | undefined>(filters?.category);

  // Counts for filter badges
  const [unreadCount, setUnreadCount] = useState(0);
  const [starredCount, setStarredCount] = useState(0);

  // Pagination state
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const MESSAGES_PER_PAGE = 50;

  // Create cache key
  const cacheKey = useMemo(
    () =>
      `inbox-cache-${workspaceId}-${selectedChannel || 'all'}-${priorityFilter || 'all'
      }-${categoryFilter || 'all'}-${statusFilter || 'all'}-${sortBy}`,
    [workspaceId, selectedChannel, priorityFilter, categoryFilter, statusFilter, sortBy]
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
          // If offset is 0, replace messages; otherwise append for pagination
          if (currentOffset === 0) {
            setMessages(messagesArray);
          } else {
            setMessages((prev) => {
              // Merge and deduplicate
              const existingIds = new Set(prev.map((m) => m.id));
              const newMessages = messagesArray.filter((m) => !existingIds.has(m.id));
              return [...prev, ...newMessages];
            });
          }

          setHasMore(data.hasMore ?? false);
          setTotalMessages(data.total ?? messagesArray.length);

          // Update offset for next load
          if (currentOffset === 0) {
            setCurrentOffset(messagesArray.length);
          } else {
            setCurrentOffset((prev) => prev + messagesArray.length);
          }

          // Calculate message counts per channel
          const counts: Record<string, number> = {};
          let unread = 0;
          let starred = 0;
          messagesArray.forEach((msg: any) => {
            const channelId = msg.channel_connection_id || msg.channel_connection?.id;
            if (!msg.is_read) {
              unread++;
              if (channelId) {
                counts[channelId] = (counts[channelId] || 0) + 1;
              }
            }
            if (msg.is_starred) {
              starred++;
            }
          });
          setMessageCounts(counts);
          setUnreadCount(unread);
          setStarredCount(starred);

          // Cache the result (with size limit to prevent quota errors)
          try {
            // Only cache first 30 messages to stay under quota
            const messagesToCache = messagesArray.slice(0, 30).map((msg: any) => ({
              id: msg.id,
              subject: msg.subject,
              sender_name: msg.sender_name,
              sender_email: msg.sender_email,
              snippet: msg.snippet?.substring(0, 100),
              is_read: msg.is_read,
              is_starred: msg.is_starred,
              priority: msg.priority,
              category: msg.category,
              created_at: msg.created_at,
              channel_connection_id: msg.channel_connection_id,
              ai_summary_short: msg.ai_summary_short,
            }));
            
            // Clear old inbox caches first to free space
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('inbox-cache-') && key !== cacheKey) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                messages: messagesToCache,
                messageCounts: counts,
                timestamp: Date.now(),
              })
            );
          } catch (error) {
            // If still fails, clear all inbox caches and skip caching
            console.warn('Cache quota exceeded, clearing inbox caches');
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && key.startsWith('inbox-cache-')) {
                localStorage.removeItem(key);
              }
            }
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

  // Convert sortBy to orderBy and orderDirection
  const getSortParams = useCallback((sort: SortOption) => {
    switch (sort) {
      case 'date_desc':
        return { orderBy: 'timestamp' as const, orderDirection: 'desc' as const };
      case 'date_asc':
        return { orderBy: 'timestamp' as const, orderDirection: 'asc' as const };
      case 'priority':
        return { orderBy: 'priority' as const, orderDirection: 'desc' as const };
      case 'sender':
        return { orderBy: 'sender_email' as const, orderDirection: 'asc' as const };
      default:
        return { orderBy: 'timestamp' as const, orderDirection: 'desc' as const };
    }
  }, []);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(() => {
    if (!hasMore || fetchingRef.current) return;
    const nextOffset = currentOffset + MESSAGES_PER_PAGE;
    const { orderBy, orderDirection } = getSortParams(sortBy);
    setCurrentOffset(nextOffset);
    fetchMessages({
      workspaceId,
      channelConnectionId: selectedChannel || undefined,
      priority: priorityFilter as MessagePriority | undefined,
      category: categoryFilter as MessageCategory | undefined,
      isRead: statusFilter === 'unread' ? false : undefined,
      isStarred: statusFilter === 'starred' ? true : undefined,
      limit: MESSAGES_PER_PAGE,
      offset: nextOffset,
      orderBy,
      orderDirection,
    });
  }, [hasMore, currentOffset, fetchMessages, workspaceId, selectedChannel, priorityFilter, categoryFilter, statusFilter, sortBy, getSortParams]);

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
              priority: priorityFilter as MessagePriority | undefined,
              category: categoryFilter as MessageCategory | undefined,
              isRead: statusFilter === 'unread' ? false : undefined,
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
    if (priorityFilter) {
      params.set('priority', priorityFilter);
    }
    if (categoryFilter) {
      params.set('category', categoryFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    if (sortBy && sortBy !== 'date_desc') {
      params.set('sort', sortBy);
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
      const { orderBy, orderDirection } = getSortParams(sortBy);
      fetchMessages({
        workspaceId,
        channelConnectionId: selectedChannel || undefined,
        priority: priorityFilter as MessagePriority | undefined,
        category: categoryFilter as MessageCategory | undefined,
        isRead: statusFilter === 'unread' ? false : undefined,
        isStarred: statusFilter === 'starred' ? true : undefined,
        limit: MESSAGES_PER_PAGE,
        offset: currentOffset,
        orderBy,
        orderDirection,
      });
    }
  }, [
    workspaceId,
    selectedChannel,
    priorityFilter,
    categoryFilter,
    statusFilter,
    sortBy,
    hasChannels,
    searchParams,
    router,
    cacheKey,
    fetchMessages,
    getSortParams,
  ]);

  // Sync channels - shows dialog when in All Inboxes mode
  const handleSync = () => {
    if (selectedChannel === null) {
      // Show dialog to select which channels to sync
      setSyncDialogOpen(true);
    } else {
      // Sync just the selected channel
      performSync([selectedChannel]);
    }
  };

  // Perform sync with specific channel IDs or all
  const performSync = (channelIds: string[] | 'all') => {
    // Store timestamp before sync to fetch only new messages
    lastSyncTimestampRef.current = new Date().toISOString();
    setSyncing(true);
    setSyncDialogOpen(false);
    contextStartSync(); // Open progress dialog via global context

    // Note: syncWorkspaceConnectionsAction syncs all connections for the workspace
    // For channel-specific sync, we'd need a different action, but for now we sync all
    // and filter on the client side
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search messages by subject, sender, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search messages"
                aria-describedby="search-description"
              />
              <span id="search-description" className="sr-only">
                Search across message subjects, senders, and content. Results update as you type.
              </span>
            </div>
            {/* Search result count */}
            {debouncedSearchQuery && !loading && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || syncStatus === 'executing'}
              aria-label={syncing || syncStatus === 'executing' ? 'Syncing messages, please wait' : 'Sync messages from all connected channels'}
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  (syncing || syncStatus === 'executing') && 'animate-spin'
                )}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>

        {/* Header Filters */}
        <InboxHeaderFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          unreadCount={unreadCount}
          starredCount={starredCount}
        />

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
              <div className="text-center max-w-md px-6">
                <InboxIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  {searchQuery
                    ? `No messages found for "${searchQuery}"`
                    : 'No messages'}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Try a different search term or clear the search to see all messages.'
                    : selectedChannel
                      ? 'No messages in this channel. Try syncing to fetch new messages.'
                      : 'Your inbox is empty. Click sync to fetch new messages.'}
                </p>
                {searchQuery ? (
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                ) : (
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
              hasMore={hasMore}
              onLoadMore={loadMoreMessages}
              loadingMore={fetchStatus === 'executing' && currentOffset > 0}
              selectedChannel={selectedChannel}
              onMessageUpdate={() => {
                // Invalidate cache and refresh messages after update
                try {
                  localStorage.removeItem(cacheKey);
                } catch (error) {
                  console.error('Failed to clear cache:', error);
                }
                fetchingRef.current = false;
                lastFetchRef.current = 0; // Force refresh
                setCurrentOffset(0);
                const { orderBy, orderDirection } = getSortParams(sortBy);
                fetchMessages({
                  workspaceId,
                  channelConnectionId: selectedChannel || undefined,
                  priority: priorityFilter as MessagePriority | undefined,
                  category: categoryFilter as MessageCategory | undefined,
                  isRead: statusFilter === 'unread' ? false : undefined,
                  isStarred: statusFilter === 'starred' ? true : undefined,
                  limit: MESSAGES_PER_PAGE,
                  offset: 0,
                  orderBy,
                  orderDirection,
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
              performSync('all');
            }
          });
        }}
      />

      {/* Sync Channel Selection Dialog - for All Inboxes view */}
      <SyncChannelDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        workspaceId={workspaceId}
        userId={userId}
        onSync={performSync}
        syncing={syncing}
      />

      {/* Sync Progress Dialog - shows detailed progress with live counts */}
      <SyncProgressDialog
        isOpen={syncProgressDialogOpen}
        onClose={() => setSyncProgressDialogOpen(false)}
        workspaceId={workspaceId}
        onSyncComplete={() => {
          // Refresh messages after sync completes
          try {
            localStorage.removeItem(cacheKey);
          } catch (error) {
            console.error('Failed to clear cache:', error);
          }
          fetchingRef.current = false;
          lastFetchRef.current = 0;
          setCurrentOffset(0);
          const { orderBy, orderDirection } = getSortParams(sortBy);
          fetchMessages({
            workspaceId,
            channelConnectionId: selectedChannel || undefined,
            priority: priorityFilter as MessagePriority | undefined,
            category: categoryFilter as MessageCategory | undefined,
            isRead: statusFilter === 'unread' ? false : undefined,
            isStarred: statusFilter === 'starred' ? true : undefined,
            limit: MESSAGES_PER_PAGE,
            offset: 0,
            orderBy,
            orderDirection,
          });
        }}
      />
    </div>
  );
});
