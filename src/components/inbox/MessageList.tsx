/**
 * MessageList Component
 * Displays list of messages with optimized rendering
 * Uses pagination for large lists instead of virtualization for better UX
 */

'use client';

import { useMemo, memo, useState, useCallback } from 'react';
import { MessageItem } from './MessageItem';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MessageListProps {
  messages: any[];
  workspaceId: string;
  onMessageUpdate: () => void;
}

const MESSAGES_PER_PAGE = 50;

export const MessageList = memo(function MessageList({
  messages,
  workspaceId,
  onMessageUpdate,
}: MessageListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Paginate messages for better performance
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * MESSAGES_PER_PAGE;
    const endIndex = startIndex + MESSAGES_PER_PAGE;
    return messages.slice(startIndex, endIndex);
  }, [messages, currentPage]);

  const totalPages = Math.ceil(messages.length / MESSAGES_PER_PAGE);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Reset to page 1 when messages change
  useMemo(() => {
    setCurrentPage(1);
  }, [messages.length]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y">
          {paginatedMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              workspaceId={workspaceId}
              onUpdate={onMessageUpdate}
            />
          ))}
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="border-t bg-background px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * MESSAGES_PER_PAGE) + 1}-
            {Math.min(currentPage * MESSAGES_PER_PAGE, messages.length)} of {messages.length} messages
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

