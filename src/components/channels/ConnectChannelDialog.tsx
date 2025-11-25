/**
 * ConnectChannelDialog Component
 * Dialog for connecting new communication channels
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntegrationLogo } from '@/components/integrations/IntegrationLogo';
import {
  allIntegrations,
  getIntegrationsByType,
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

  const emailIntegrations = getIntegrationsByType('email');
  const messagingIntegrations = getIntegrationsByType('messaging');
  const socialIntegrations = getIntegrationsByType('social');
  const calendarIntegrations = getIntegrationsByType('calendar');

  const renderIntegrationCard = (integration: Integration) => {
    const isAvailable = integration.status === 'available';
    const isBeta = integration.status === 'beta';
    
    return (
      <Card
        key={integration.id}
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          !isAvailable && 'opacity-60 cursor-not-allowed'
        )}
        onClick={() => isAvailable && handleConnect(integration)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <IntegrationLogo integration={integration} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{integration.name}</h3>
                {!isAvailable && (
                  <Badge variant="secondary" className="text-xs">
                    Coming Soon
                  </Badge>
                )}
                {isBeta && (
                  <Badge variant="outline" className="text-xs">
                    Beta
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {integration.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {integration.features.slice(0, 2).map((feature, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
              <Button
                size="sm"
                variant={isAvailable ? 'default' : 'outline'}
                className="w-full"
                disabled={!isAvailable}
              >
                {isAvailable ? (
                  <>
                    Connect
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </>
                ) : (
                  'Coming Soon'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect a Channel</DialogTitle>
          <DialogDescription>
            Choose a communication or calendar service to connect to your workspace
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="messaging">Messaging</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {emailIntegrations.map(renderIntegrationCard)}
            </div>
          </TabsContent>

          <TabsContent value="messaging" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {messagingIntegrations.map(renderIntegrationCard)}
            </div>
          </TabsContent>

          <TabsContent value="social" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {socialIntegrations.map(renderIntegrationCard)}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {calendarIntegrations.map(renderIntegrationCard)}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

