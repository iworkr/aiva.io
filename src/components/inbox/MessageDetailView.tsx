/**
 * MessageDetailView Component
 * Minimalist conversation view with thread display and inline reply
 * Redesigned: No tabs, single scrollable view, sticky header
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  archiveMessageAction,
  markMessageAsReadAction,
  starMessageAction,
  unstarMessageAction,
} from '@/data/user/messages';
import { getIntegrationById } from '@/lib/integrations/config';
import { cn } from '@/lib/utils';
import { supabaseUserClientComponent } from '@/supabase-clients/user/supabaseUserClientComponent';
import {
  Archive,
  ArrowLeft,
  Calendar,
  Loader2,
  Mail,
  MoreHorizontal,
  Star,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Components
import { autoCreateEventFromMessage } from '@/lib/ai/scheduling';
import { ConversationThread } from './ConversationThread';
import { InlineReplyComposer } from './InlineReplyComposer';

interface MessageDetailViewProps {
  messageId: string;
  workspaceId: string;
  userId: string;
}

export function MessageDetailView({ messageId, workspaceId, userId }: MessageDetailViewProps) {
  const router = useRouter();
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Fetch message
  useEffect(() => {
    const fetchMessage = async () => {
      const supabase = supabaseUserClientComponent;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          channel_connections(provider, provider_account_name, provider_account_id)
        `)
        .eq('id', messageId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error) {
        toast.error("Oops — couldn't load this message. Please try refreshing.");
        console.error(error);
      } else {
        setMessage(data);
        setIsStarred(data.is_starred || false);

        // Mark as read
        if (!data.is_read) {
          markAsRead({ id: messageId, workspaceId });
        }
      }

      setLoading(false);
    };

    fetchMessage();
  }, [messageId, workspaceId]);

  // Mark as read
  const { execute: markAsRead } = useAction(markMessageAsReadAction, {
    onSuccess: () => {
      if (message) {
        setMessage({ ...message, is_read: true });
      }
    },
  });

  // Star message
  const { execute: starMessage } = useAction(starMessageAction, {
    onSuccess: () => {
      setIsStarred(true);
      toast.success("Got it — I'll keep this one handy for you ⭐");
    },
    onError: () => {
      setIsStarred(false);
      toast.error("Hmm, couldn't star that. Let's try again.");
    },
  });

  // Unstar message
  const { execute: unstarMessage } = useAction(unstarMessageAction, {
    onSuccess: () => {
      setIsStarred(false);
      toast.success("Removed from starred messages");
    },
    onError: () => {
      setIsStarred(true);
      toast.error("Couldn't remove star. Please try again.");
    },
  });

  // Archive message
  const { execute: archive } = useAction(archiveMessageAction, {
    onSuccess: () => {
      toast.success("All done — archived and out of sight!");
      router.push('/inbox');
    },
    onError: () => {
      toast.error("Couldn't archive this one. Give it another shot?");
    },
  });

  const handleToggleStar = () => {
    // Optimistic update
    setIsStarred(!isStarred);
    if (isStarred) {
      unstarMessage({ id: messageId, workspaceId });
    } else {
      starMessage({ id: messageId, workspaceId });
    }
  };

  const handleArchive = () => {
    archive({ id: messageId, workspaceId });
  };

  const handleCreateEvent = async () => {
    setCreatingEvent(true);
    try {
      const result = await autoCreateEventFromMessage(messageId, workspaceId, userId);
      if (result.success) {
        toast.success("Perfect — I've added that to your calendar!");
      } else {
        toast.info(result.message || "No scheduling details found in this message");
      }
    } catch (error) {
      toast.error("Couldn't create the event. Want to try again?");
      console.error(error);
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleBack = () => {
    router.push('/inbox');
  };

  // Get provider info
  const provider = message?.channel_connections?.provider;
  const integration = provider ? getIntegrationById(provider) : null;
  // Use sender_email from message as fallback for user email identification
  const userEmail = message?.channel_connections?.provider_account_id;

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading message...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!message) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Message not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This message may have been deleted or moved.
          </p>
          <Button variant="outline" className="mt-4" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inbox
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back button + Subject */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Inbox</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="min-w-0 flex-1">
              <h1 className="font-semibold truncate">
                {message.subject || '(no subject)'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {/* Provider badge */}
                {integration && (
                  <div className="flex items-center gap-1.5">
                    {integration.logoUrl ? (
                      <Image
                        src={integration.logoUrl}
                        alt={integration.name}
                        width={14}
                        height={14}
                        className="object-contain"
                        unoptimized={integration.logoUrl.startsWith('http')}
                      />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs">{integration.name}</span>
                  </div>
                )}
                <span>•</span>
                <span className="truncate">
                  From: {message.sender_name || message.sender_email}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleStar}
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        isStarred && 'fill-yellow-400 text-yellow-400'
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isStarred ? 'Unstar' : 'Star'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleArchive}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Archive</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreateEvent} disabled={creatingEvent}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {creatingEvent ? 'Creating event...' : 'Create calendar event'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Scrollable Content - Conversation Thread */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto max-w-3xl p-4 pb-4">
          <ConversationThread
            currentMessageId={messageId}
            threadId={message.provider_thread_id}
            workspaceId={workspaceId}
            userEmail={userEmail}
          />
        </div>
      </div>

      {/* Reply Composer - Fixed at bottom */}
      {provider && (provider === 'gmail' || provider === 'outlook') && (
        <InlineReplyComposer
          messageId={messageId}
          workspaceId={workspaceId}
          messageSubject={message.subject || ''}
          senderEmail={message.sender_email}
          provider={provider}
          providerMessageId={message.provider_message_id}
          onSent={() => {
            // Refresh the thread after sending
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
