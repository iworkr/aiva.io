/**
 * ChannelsView Component
 * Enhanced channel management view
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Zap,
  Mail,
} from 'lucide-react';
import { getUserChannelConnections, disconnectChannelAction } from '@/data/user/channels';
import { syncChannelConnection } from '@/lib/sync/orchestrator';
import { ConnectChannelDialog } from './ConnectChannelDialog';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { IntegrationLogo } from '@/components/integrations/IntegrationLogo';
import { getIntegrationById, providerNames } from '@/lib/integrations/config';
import { useCachedData } from '@/hooks/useCachedData';

interface ChannelsViewProps {
  workspaceId: string;
  userId: string;
}

export function ChannelsView({ workspaceId, userId }: ChannelsViewProps) {
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Use cached data hook for instant load with background refresh
  const {
    data: channels,
    isLoading: loading,
    refresh: refreshChannels,
  } = useCachedData<any[]>(
    `channels-management-${workspaceId}`,
    useCallback(async () => {
      const data = await getUserChannelConnections(workspaceId, userId);
      return data || [];
    }, [workspaceId, userId]),
    {
      ttl: 5 * 60 * 1000, // 5 minutes cache
      deps: [workspaceId, userId],
    }
  );
  
  // Default to empty array if null
  const channelsList = channels || [];

  // Disconnect channel
  const { execute: disconnect } = useAction(disconnectChannelAction, {
    onSuccess: () => {
      toast.success('Channel disconnected');
      refreshChannels();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to disconnect channel');
    },
  });

  // Sync single channel
  const handleSyncChannel = async (channelId: string) => {
    setSyncingChannel(channelId);
    try {
      const result = await syncChannelConnection(channelId, workspaceId, {
        maxMessages: 50,
        autoClassify: true,
      });

      if (result.success) {
        toast.success(`Synced ${result.newCount || 0} new message(s)`);
        refreshChannels();
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Failed to sync channel');
      console.error(error);
    } finally {
      setSyncingChannel(null);
    }
  };

  // Get provider name (use config)
  const getProviderName = (provider: string) => {
    return providerNames[provider] || provider;
  };

  const stats = {
    total: channelsList.length,
    active: channelsList.filter((c) => c.status === 'active').length,
    error: channelsList.filter((c) => c.status === 'error').length,
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Channels</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold text-sky-600">{stats.active}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-sky-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Needs Attention</p>
                  <p className="text-3xl font-bold text-red-600">{stats.error}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connect Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Connected Channels</h2>
          <Button onClick={() => setShowConnectDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Connect Channel
          </Button>
        </div>

        {/* Channels List */}
        {loading && !channels ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading channels...</p>
          </div>
        ) : channelsList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No channels connected</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground max-w-sm">
                Connect your first communication channel to start using Aiva.io's unified inbox
              </p>
              <Button className="mt-6" onClick={() => setShowConnectDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Connect Your First Channel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {channelsList.map((channel) => {
              const integration = getIntegrationById(channel.provider);
              const isSyncing = syncingChannel === channel.id;

              return (
                <Card key={channel.id} className={cn(channel.status === 'error' && 'border-red-200 dark:border-red-900')}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* Provider Logo */}
                        {integration ? (
                          <IntegrationLogo integration={integration} size="md" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                            <Mail className="h-6 w-6 text-gray-600" />
                          </div>
                        )}

                        {/* Channel Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{getProviderName(channel.provider)}</h3>
                            {channel.status === 'active' && (
                              <Badge variant="outline" className="text-sky-700 bg-sky-100 dark:bg-sky-900/20">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Active
                              </Badge>
                            )}
                            {channel.status === 'error' && (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" />
                                Error
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {channel.provider_account_name || channel.provider_account_id}
                          </p>
                          {channel.last_sync_at && (
                            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Synced {formatDistanceToNow(new Date(channel.last_sync_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSyncChannel(channel.id)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSyncChannel(channel.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Sync Now
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Are you sure you want to disconnect ${getProviderName(channel.provider)}?`)) {
                                  disconnect({ id: channel.id, workspaceId });
                                }
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Disconnect
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Connect Dialog */}
      <ConnectChannelDialog
        workspaceId={workspaceId}
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        onConnected={refreshChannels}
      />
    </div>
  );
}

