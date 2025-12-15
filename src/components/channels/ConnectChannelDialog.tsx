/**
 * ConnectChannelDialog Component - Minimal Design
 * Clean, simple dialog for connecting communication channels
 * Uses grouped list instead of tabs, no heavy cards
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntegrationLogo } from '@/components/integrations/IntegrationLogo';
import {
  emailIntegrations,
  messagingIntegrations,
  socialIntegrations,
  calendarIntegrations,
  type Integration,
} from '@/lib/integrations/config';

interface ConnectChannelDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function ConnectChannelDialog({
  workspaceId,
  open,
  onOpenChange,
  onConnected,
}: ConnectChannelDialogProps) {
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

  // Integration row component - minimal design
  const IntegrationRow = ({ integration }: { integration: Integration }) => {
    const isAvailable = integration.status === 'available';
    
    return (
      <button
        onClick={() => isAvailable && handleConnect(integration)}
        disabled={!isAvailable}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
          isAvailable 
            ? 'hover:bg-muted/50 cursor-pointer group' 
            : 'opacity-60 cursor-not-allowed'
        )}
      >
        <IntegrationLogo integration={integration} size="sm" />
        <span className="flex-1 text-sm font-medium">{integration.name}</span>
        {isAvailable ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : (
          <span className="text-xs text-muted-foreground">Soon</span>
        )}
      </button>
    );
  };

  // Category section component
  const CategorySection = ({ 
    title, 
    integrations 
  }: { 
    title: string; 
    integrations: Integration[] 
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
  );
}
