/**
 * Aiva Chat Input Component
 * Functional AI chat/search input for the Morning Brief
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from 'ai/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // useChat hook
  const { messages, append, isLoading, input, setInput, stop } = useChat({
    id: chatId,
    api: '/api/chat',
    onFinish: () => {
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

  // Close panel handler with proper cleanup
  const closePanel = useCallback(() => {
    // Prevent multiple close attempts
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    
    // Stop any ongoing AI request
    stop?.();
    
    // Blur the input to prevent focus-triggered re-open
    inputRef.current?.blur();
    document.activeElement instanceof HTMLElement && document.activeElement.blur();
    
    // Close the panel
    setIsOpen(false);
    
    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    // Reset closing flag after delay to allow re-opening
    closeTimeoutRef.current = setTimeout(() => {
      isClosingRef.current = false;
    }, 300);
  }, [stop]);

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
      e.preventDefault();
      closePanel();
    }
  };

  // Handle focus on input - only open if not currently closing
  const handleInputFocus = useCallback(() => {
    if (!isClosingRef.current) {
      setIsOpen(true);
    }
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isOpen) return;
      
      const target = e.target as Node;
      const panel = panelRef.current;
      const input = inputRef.current;
      
      // Check if click is outside both panel and input
      if (panel && !panel.contains(target) && input && !input.contains(target)) {
        closePanel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closePanel]);

  // Global ESC key handler
  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closePanel();
      }
    };
    document.addEventListener('keydown', handleGlobalEsc);
    return () => document.removeEventListener('keydown', handleGlobalEsc);
  }, [isOpen, closePanel]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Auto-open when user starts typing (but not if closing)
  useEffect(() => {
    if (input.trim() && !isOpen && !isClosingRef.current) {
      setIsOpen(true);
    }
  }, [input, isOpen]);

  return (
    <div className={cn('relative', className)}>
      {/* Search Input with Animated Gradient Border - Highly prominent on all screens */}
      <div className="relative aiva-input-wrapper shadow-lg lg:shadow-xl hover:shadow-xl lg:hover:shadow-2xl transition-all duration-300 rounded-xl bg-muted/20">
        <div className="absolute left-4 lg:left-5 top-1/2 -translate-y-1/2 z-10">
          <Sparkles className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Try: 'Summarise my inbox', 'Find emails from John', 'Schedule a meeting with Dan tomorrow'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          className="pl-12 lg:pl-14 h-14 lg:h-16 text-base lg:text-lg bg-background/80 backdrop-blur-sm border-2 border-primary/30 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary/30 relative z-10 placeholder:text-muted-foreground/50 rounded-xl"
        />
        {isLoading && (
          <div className="absolute right-4 lg:right-5 top-1/2 -translate-y-1/2 z-10">
            <Loader2 className="h-5 w-5 lg:h-6 lg:w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <Card 
          ref={panelRef}
          className="animated-border animated-border-active absolute top-full left-0 right-0 mt-2 z-50 shadow-lg flex flex-col overflow-hidden" 
          style={{ maxHeight: 'min(calc(100vh - 180px), 600px)' }}
        >
          <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Aiva Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closePanel();
              }}
              onMouseDown={(e) => {
                // Prevent focus from shifting before click completes
                e.preventDefault();
              }}
              className="h-8 w-8 p-0 hover:bg-destructive/10 focus:ring-2 focus:ring-destructive/20"
              aria-label="Close Aiva Assistant"
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
                  <li>&quot;What urgent messages do I have?&quot;</li>
                  <li>&quot;Show me tasks due today&quot;</li>
                  <li>&quot;Summarize my unread messages&quot;</li>
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-primary/5 rounded-lg border border-primary/20 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-medium">Aiva is thinking...</span>
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
