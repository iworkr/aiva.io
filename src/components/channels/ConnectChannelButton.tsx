/**
 * Connect Channel Button Component
 * Opens dialog to select and connect a new communication channel
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Facebook,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConnectChannelButtonProps {
  workspaceId: string;
  children: React.ReactNode;
}

type ChannelOption = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  comingSoon?: boolean;
  href?: string;
};

export function ConnectChannelButton({
  workspaceId,
  children,
}: ConnectChannelButtonProps) {
  const [open, setOpen] = useState(false);

  const channels: ChannelOption[] = [
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Connect your Gmail account to manage emails',
      icon: <Mail className="h-6 w-6" />,
      available: true,
      href: `/api/auth/gmail?workspace_id=${workspaceId}`,
    },
    {
      id: 'outlook',
      name: 'Outlook',
      description: 'Connect your Outlook/Microsoft 365 account',
      icon: <Mail className="h-6 w-6" />,
      available: true,
      href: `/api/auth/outlook?workspace_id=${workspaceId}`,
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Manage Slack messages and channels',
      icon: <MessageSquare className="h-6 w-6" />,
      available: false,
      comingSoon: true,
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Connect to Microsoft Teams chat',
      icon: <MessageSquare className="h-6 w-6" />,
      available: false,
      comingSoon: true,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Manage WhatsApp Business conversations',
      icon: <MessageSquare className="h-6 w-6" />,
      available: false,
      comingSoon: true,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Manage LinkedIn messages and InMail',
      icon: <Linkedin className="h-6 w-6" />,
      available: false,
      comingSoon: true,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Connect Instagram Direct messages',
      icon: <Instagram className="h-6 w-6" />,
      available: false,
      comingSoon: true,
    },
    {
      id: 'facebook_messenger',
      name: 'Facebook Messenger',
      description: 'Manage Facebook Messenger conversations',
      icon: <Facebook className="h-6 w-6" />,
      available: false,
      comingSoon: true,
    },
  ];

  const handleConnect = (channel: ChannelOption) => {
    if (!channel.available) {
      return;
    }

    if (channel.href) {
      // Redirect to OAuth flow
      window.location.href = channel.href;
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect a Channel</DialogTitle>
          <DialogDescription>
            Choose a communication channel to connect to your Aiva.io workspace
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {channels.map((channel) => (
            <Card
              key={channel.id}
              className={`cursor-pointer hover:shadow-md transition-all ${
                !channel.available ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              onClick={() => handleConnect(channel)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {channel.icon}
                  </div>
                  {channel.comingSoon && (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold mb-1">{channel.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {channel.description}
                </p>
                {channel.available && (
                  <div className="mt-4 flex items-center text-xs text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Secure OAuth 2.0
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Privacy first:</strong> We use
            secure OAuth 2.0 authentication and never store your passwords. You can
            disconnect at any time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

