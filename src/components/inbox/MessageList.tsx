/**
 * MessageList Component
 * Displays list of messages with virtual scrolling
 */

'use client';

import { MessageItem } from './MessageItem';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: any[];
  workspaceId: string;
  onMessageUpdate: () => void;
}

export function MessageList({ messages, workspaceId, onMessageUpdate }: MessageListProps) {
  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            workspaceId={workspaceId}
            onUpdate={onMessageUpdate}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

