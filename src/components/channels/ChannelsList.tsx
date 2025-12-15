/**
 * Channels List Component
 * Displays list of connected channels with status and actions
 */

'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { disconnectChannelAction } from '@/data/user/channels';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import {
  Unplug,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { IntegrationLogo } from '@/components/integrations/IntegrationLogo';
import { getIntegrationById, providerNames } from '@/lib/integrations/config';

type ChannelProvider =
  | 'gmail'
  | 'outlook'
  | 'slack'
  | 'teams'
  | 'whatsapp'
  | 'instagram'
  | 'facebook_messenger'
  | 'linkedin';

type Channel = {
  id: string;
  provider: ChannelProvider;
  provider_account_id: string;
  provider_account_name: string | null;
  status: 'active' | 'inactive' | 'error' | 'token_expired' | 'revoked';
  last_sync_at: string | null;
  created_at: string;
};

interface ChannelsListProps {
  channels: Channel[];
  workspaceId: string;
}


export function ChannelsList({ channels, workspaceId }: ChannelsListProps) {
  const [channelToDisconnect, setChannelToDisconnect] = useState<Channel | null>(null);

  const { execute: disconnect, status: disconnectStatus } = useAction(
    disconnectChannelAction,
    {
      onSuccess: () => {
        toast.success('Channel disconnected successfully');
        setChannelToDisconnect(null);
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to disconnect channel');
      },
    }
  );

  const getStatusBadge = (status: Channel['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-sky-100 text-sky-700">
            <Check className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'token_expired':
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Token Expired
          </Badge>
        );
      case 'inactive':
      case 'revoked':
        return (
          <Badge variant="outline">
            <X className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        );
    }
  };

  if (channels.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {channels.map((channel) => {
          const integration = getIntegrationById(channel.provider);
          
          return (
            <Card key={channel.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Channel Info */}
                  <div className="flex items-center space-x-4">
                    {integration ? (
                      <IntegrationLogo integration={integration} size="md" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <Mail className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">
                          {providerNames[channel.provider] || channel.provider}
                        </h3>
                        {getStatusBadge(channel.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {channel.provider_account_name || channel.provider_account_id}
                      </p>
                      {channel.last_sync_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last synced{' '}
                          {formatDistanceToNow(new Date(channel.last_sync_at), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {(channel.status === 'error' || channel.status === 'token_expired') && (
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChannelToDisconnect(channel)}
                    >
                      <Unplug className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={!!channelToDisconnect}
        onOpenChange={(open) => !open && setChannelToDisconnect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Channel?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect{' '}
              <strong>
                {channelToDisconnect &&
                  providerNames[channelToDisconnect.provider]}
              </strong>
              ? You can reconnect it later, but you'll need to authorize access
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (channelToDisconnect) {
                  disconnect({
                    id: channelToDisconnect.id,
                    workspaceId,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={disconnectStatus === 'executing'}
            >
              {disconnectStatus === 'executing' ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

