/**
 * ConversationThread Component
 * Fetches and displays all messages in a conversation thread
 * Uses provider_thread_id to group related messages
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabaseUserClientComponent } from '@/supabase-clients/user/supabaseUserClientComponent';
import { ThreadMessage } from './ThreadMessage';
import { Loader2, MessageSquare } from 'lucide-react';

interface ConversationThreadProps {
  currentMessageId: string;
  threadId: string | null;
  workspaceId: string;
  userEmail?: string;
}

interface Message {
  id: string;
  subject?: string | null;
  body?: string | null;
  body_html?: string | null;
  sender_name?: string | null;
  sender_email: string;
  timestamp: string;
  is_read?: boolean | null;
  priority?: string | null;
  category?: string | null;
  sentiment?: string | null;
  ai_summary?: string | null;
  ai_key_points?: string[] | null;
  direction?: 'inbound' | 'outbound' | null;
  provider_thread_id?: string | null;
}

export function ConversationThread({
  currentMessageId,
  threadId,
  workspaceId,
  userEmail,
}: ConversationThreadProps) {
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch thread messages
  useEffect(() => {
    const fetchThread = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = supabaseUserClientComponent;

        if (threadId) {
          // Fetch all messages in the thread
          const { data, error: fetchError } = await supabase
            .from('messages')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('provider_thread_id', threadId)
            .order('timestamp', { ascending: true });

          if (fetchError) {
            console.error('Failed to fetch thread:', fetchError);
            setError('Failed to load conversation');
          } else {
            setThreadMessages(data || []);
          }
        } else {
          // No thread ID - just show current message
          const { data, error: fetchError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', currentMessageId)
            .eq('workspace_id', workspaceId)
            .single();

          if (fetchError) {
            console.error('Failed to fetch message:', fetchError);
            setError('Failed to load message');
          } else if (data) {
            setThreadMessages([data]);
          }
        }
      } catch (err) {
        console.error('Error fetching thread:', err);
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchThread();
  }, [currentMessageId, threadId, workspaceId]);

  // Sort messages - oldest first for natural conversation flow
  const sortedMessages = useMemo(() => {
    return [...threadMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [threadMessages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (sortedMessages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No messages found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thread count indicator */}
      {sortedMessages.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{sortedMessages.length} messages in this conversation</span>
        </div>
      )}

      {/* Messages */}
      {sortedMessages.map((message, index) => (
        <ThreadMessage
          key={message.id}
          message={message}
          isCurrentMessage={message.id === currentMessageId}
          userEmail={userEmail}
        />
      ))}
    </div>
  );
}

