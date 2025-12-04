/**
 * MessageList Component
 * Displays list of messages with optimized rendering
 * Uses pagination for large lists instead of virtualization for better UX
 */

'use client';

import { useMemo, memo, useState, useCallback } from 'react';
import { MessageItem } from './MessageItem';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: any[];
  workspaceId: string;
  onMessageUpdate: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  selectedChannel?: string | null;
}

const MESSAGES_PER_PAGE = 50;

export const MessageList = memo(function MessageList({
  messages,
  workspaceId,
  onMessageUpdate,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  selectedChannel = null,
}: MessageListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Paginate messages for better performance (client-side pagination for already loaded messages)
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

  // Reset to page 1 when messages change significantly
  useMemo(() => {
    if (messages.length > 0 && currentPage > Math.ceil(messages.length / MESSAGES_PER_PAGE)) {
      setCurrentPage(1);
    }
  }, [messages.length, currentPage]);

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
              selectedChannel={selectedChannel}
            />
          ))}
        </div>
      </div>

      {/* Pagination controls */}
      <div className="border-t bg-background px-4 py-3 flex flex-col gap-3">
        {/* Client-side pagination for loaded messages */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * MESSAGES_PER_PAGE) + 1}-
              {Math.min(currentPage * MESSAGES_PER_PAGE, messages.length)} of {messages.length} loaded messages
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages && !hasMore}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Load More button for server-side pagination */}
        {hasMore && onLoadMore && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={loadingMore}
              aria-label="Load more messages"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Loading...
                </>
              ) : (
                <>
                  Load More Messages
                  <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
