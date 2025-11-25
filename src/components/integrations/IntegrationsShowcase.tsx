/**
 * IntegrationsShowcase Component
 * Beautiful showcase of all available integrations
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationLogo } from './IntegrationLogo';
import {
  allIntegrations,
  getIntegrationsByType,
  getAvailableIntegrations,
  getComingSoonIntegrations,
  type Integration,
} from '@/lib/integrations/config';
import { cn } from '@/lib/utils';
import { ExternalLink, CheckCircle2, Clock } from 'lucide-react';

interface IntegrationsShowcaseProps {
  onConnect?: (integration: Integration) => void;
  compact?: boolean;
}

export function IntegrationsShowcase({ onConnect, compact = false }: IntegrationsShowcaseProps) {
  const available = getAvailableIntegrations();
  const comingSoon = getComingSoonIntegrations();

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
          'group relative overflow-hidden transition-all hover:shadow-lg',
          !isAvailable && 'opacity-75'
        )}
      >
        <CardContent className={cn('p-6', compact && 'p-4')}>
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="relative">
              <IntegrationLogo 
                integration={integration} 
                size={compact ? 'sm' : 'md'} 
                className="transition-transform group-hover:scale-110"
              />
              {isAvailable && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-sky-500 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </div>
              )}
              {!isAvailable && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-amber-500 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                  <Clock className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
                  {integration.name}
                </h3>
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

              {!compact && (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    {integration.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {integration.features.slice(0, 3).map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </>
              )}

              {onConnect && (
                <Button
                  size="sm"
                  variant={isAvailable ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => isAvailable && onConnect(integration)}
                  disabled={!isAvailable}
                >
                  {isAvailable ? (
                    <>
                      Connect
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <Clock className="mr-2 h-3 w-3" />
                      Coming Soon
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Now</p>
                <p className="text-3xl font-bold text-sky-600">{available.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-sky-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                <p className="text-3xl font-bold text-amber-600">{comingSoon.length}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations by Type */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className={cn('grid gap-4', compact ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
            {allIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <div className={cn('grid gap-4', compact ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
            {emailIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="messaging" className="mt-4">
          <div className={cn('grid gap-4', compact ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
            {messagingIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <div className={cn('grid gap-4', compact ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
            {socialIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className={cn('grid gap-4', compact ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
            {calendarIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

