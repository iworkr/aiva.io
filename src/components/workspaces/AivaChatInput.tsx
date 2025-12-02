/**
 * Aiva Chat Input Component
 * Functional AI chat/search input for the Morning Brief
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface AivaChatInputProps {
  className?: string;
}

export function AivaChatInput({ className }: AivaChatInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId] = useState(() => `brief-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, append, isLoading, input, setInput, stop } = useChat({
    id: chatId,
    api: '/api/chat',
    onFinish: () => {
      // Auto-scroll to bottom when message finishes
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    },
    onError: (error) => {
      console.error('Aiva assistant error:', error);
      toast.error('Aiva had trouble answering that. Please try again in a moment.');
    },
    onResponse: (response) => {
      if (response.status === 401) {
        toast.error('Your session has expired. Please log in again.');
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await append({
      role: 'user',
      content: input,
    });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Auto-open when user starts typing
  useEffect(() => {
    if (input.trim() && !isOpen) {
      setIsOpen(true);
    }
  }, [input, isOpen]);

  return (
    <div className={cn('relative', className)}>
      {/* Search Input with Animated Gradient Border */}
      <div className="relative aiva-input-wrapper">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <Input
          type="text"
          placeholder="Try: 'Summarise my inbox', 'Find emails from John', 'Schedule a meeting with Dan tomorrow'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          className="pl-10 h-12 text-base bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-0 focus:ring-0 focus-visible:ring-0 relative z-10"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="animated-border animated-border-active absolute top-full left-0 right-0 mt-2 z-50 shadow-lg flex flex-col overflow-hidden" style={{ maxHeight: 'min(calc(100vh - 180px), 600px)' }}>
          <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Aiva Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                stop();
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Ask me anything about your messages, tasks, or schedule.</p>
                <p className="text-xs">Examples:</p>
                <ul className="text-xs list-disc list-inside space-y-1 ml-2">
                  <li>"What urgent messages do I have?"</li>
                  <li>"Show me tasks due today"</li>
                  <li>"Summarize my unread messages"</li>
                </ul>
                <p className="text-xs pt-2">
                  Tip: Connect your Gmail, Outlook, or other channels so Aiva can give richer answers.{" "}
                  <a
                    href="/inbox"
                    className="underline text-primary"
                  >
                    Go to channels
                  </a>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex flex-col gap-2',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-lg px-4 py-2 max-w-[80%] text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Aiva is thinking...</span>
                  </div>
                )}
              </div>
            )}
            <div ref={scrollRef} />
          </ScrollArea>

          <div className="border-t p-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}

