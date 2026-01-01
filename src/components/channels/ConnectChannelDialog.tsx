/**
 * ConnectChannelDialog Component - Minimal Design
 * Clean, simple dialog for connecting communication channels
 * Uses grouped list instead of tabs, no heavy cards
 * Shows Connect/Disconnect for Gmail/Outlook, Coming Soon for others
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { IntegrationLogo } from '@/components/integrations/IntegrationLogo';
import {
  emailIntegrations,
  messagingIntegrations,
  socialIntegrations,
  calendarIntegrations,
  type Integration,
} from '@/lib/integrations/config';
import { getUserChannelConnections } from '@/data/user/channels';
import { disconnectChannelAction } from '@/data/user/channels';
import { useEffect, useState, useCallback } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ChannelConnection {
  id: string;
  provider: string;
  status: string;
  provider_account_name?: string;
}

interface ConnectChannelDialogProps {
  workspaceId: string;
  userId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function ConnectChannelDialog({
  workspaceId,
  userId,
  open,
  onOpenChange,
  onConnected,
}: ConnectChannelDialogProps) {
  const [connectedChannels, setConnectedChannels] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<{
    integration: Integration;
    connection: ChannelConnection;
  } | null>(null);

  // Fetch connected channels when dialog opens
  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      getUserChannelConnections(workspaceId, userId)
        .then((channels) => {
          setConnectedChannels(channels || []);
        })
        .catch((error) => {
          console.error('Failed to fetch channels:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, workspaceId, userId]);

  // Disconnect action
  const { execute: executeDisconnect } = useAction(disconnectChannelAction, {
    onSuccess: () => {
      toast.success('Channel disconnected successfully');
      // Remove from local state
      if (confirmDisconnect) {
        setConnectedChannels((prev) =>
          prev.filter((c) => c.id !== confirmDisconnect.connection.id)
        );
      }
      setConfirmDisconnect(null);
      setDisconnectingId(null);
      // Notify parent to refresh
      if (onConnected) {
        onConnected();
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to disconnect channel');
      setDisconnectingId(null);
    },
  });

  // Check if a provider is connected
  const getConnectionForProvider = useCallback(
    (providerId: string): ChannelConnection | undefined => {
      return connectedChannels.find(
        (c) => c.provider === providerId && c.status === 'active'
      );
    },
    [connectedChannels]
  );

  const handleConnect = (integration: Integration) => {
    if (integration.status !== 'available') {
      return;
    }

    // Build OAuth URL
    const authUrl = integration.oauth?.authUrl
      ? `${integration.oauth.authUrl}?workspace_id=${workspaceId}`
      : `/api/auth/${integration.id}?workspace_id=${workspaceId}`;

    // Open in same window
    window.location.href = authUrl;

    // Close dialog
    onOpenChange(false);

    // Call callback if provided
    if (onConnected) {
      setTimeout(onConnected, 1000);
    }
  };

  const handleDisconnect = (integration: Integration, connection: ChannelConnection) => {
    setConfirmDisconnect({ integration, connection });
  };

  const confirmDisconnectAction = () => {
    if (!confirmDisconnect) return;
    setDisconnectingId(confirmDisconnect.connection.id);
    executeDisconnect({
      id: confirmDisconnect.connection.id,
      workspaceId,
    });
  };

  // Integration row component - with Connect/Disconnect for available, Coming Soon for others
  const IntegrationRow = ({ integration }: { integration: Integration }) => {
    const isAvailable = integration.status === 'available';
    const connection = getConnectionForProvider(integration.id);
    const isConnected = !!connection;
    const isDisconnecting = disconnectingId === connection?.id;

    return (
      <div
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
          isAvailable ? '' : 'opacity-70'
        )}
      >
        <IntegrationLogo integration={integration} size="sm" />
        <span className="flex-1 text-sm font-medium">{integration.name}</span>

        {isAvailable ? (
          // Gmail/Outlook - show Connect or Disconnect button
          isConnected ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-3 text-xs"
              onClick={() => handleDisconnect(integration, connection)}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Disconnect'
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleConnect(integration)}
              disabled={loading}
            >
              Connect
            </Button>
          )
        ) : (
          // All other channels - show Coming Soon badge
          <Badge variant="secondary" className="text-xs font-normal">
            Coming Soon
          </Badge>
        )}
      </div>
    );
  };

  // Category section component
  const CategorySection = ({
    title,
    integrations,
  }: {
    title: string;
    integrations: Integration[];
  }) => (
    <div className="space-y-1">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
        {title}
      </h3>
      <div>
        {integrations.map((integration) => (
          <IntegrationRow key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg">Connect a Channel</DialogTitle>
            <DialogDescription className="text-sm">
              Connect a service to sync messages with your workspace
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-3 pb-6 space-y-4 max-h-[60vh]">
            <CategorySection title="Email" integrations={emailIntegrations} />
            <CategorySection title="Messaging" integrations={messagingIntegrations} />
            <CategorySection title="Social" integrations={socialIntegrations} />
            <CategorySection title="Calendar" integrations={calendarIntegrations} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={!!confirmDisconnect}
        onOpenChange={(open) => !open && setConfirmDisconnect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {confirmDisconnect?.integration.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your {confirmDisconnect?.integration.name} account
              {confirmDisconnect?.connection.provider_account_name &&
                ` (${confirmDisconnect.connection.provider_account_name})`}{' '}
              from this workspace. You can reconnect it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!disconnectingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisconnectAction}
              disabled={!!disconnectingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnectingId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
