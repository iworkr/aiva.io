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
  const [manualClose, setManualClose] = useState(false);
  const [chatId] = useState(() => `brief-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelInputRef = useRef<HTMLInputElement>(null);
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

  // Close panel handler - properly handles focus
  const closePanel = useCallback(() => {
    // Set flags to prevent re-opening
    isClosingRef.current = true;
    setManualClose(true);
    
    // Stop any ongoing AI request
    stop?.();
    
    // Blur the main input first (this is critical)
    inputRef.current?.blur();
    panelInputRef.current?.blur();
    
    // Blur any other focused element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Close the panel
    setIsOpen(false);
    
    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    // Reset flags after delay to allow re-opening
    closeTimeoutRef.current = setTimeout(() => {
      isClosingRef.current = false;
      setManualClose(false);
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

  // Handle focus on input - only open if not manually closed
  const handleInputFocus = useCallback(() => {
    // Don't re-open if user manually closed or we're in closing state
    if (!isClosingRef.current && !manualClose) {
      setIsOpen(true);
    }
  }, [manualClose]);

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
    <div className={cn('relative', isOpen ? 'mb-[350px]' : '', className)}>
      {/* Search Input with Animated Gradient Border - Highly prominent on all screens */}
      <div className="relative aiva-input-wrapper shadow-md hover:shadow-lg transition-all duration-300 rounded-lg bg-muted/20">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Try: 'Summarise my inbox', 'Find emails from John', 'Schedule a meeting with Dan tomorrow'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          className="pl-11 h-11 text-base bg-background/80 backdrop-blur-sm border-2 border-primary/30 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary/30 relative z-10 placeholder:text-muted-foreground/50 rounded-lg"
        />
        {isLoading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Chat Panel Overlay - Floats above content, doesn't push layout */}
      {isOpen && (
        <>
          {/* Backdrop overlay for click-outside detection */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closePanel}
            aria-hidden="true"
          />
          <Card 
            ref={panelRef}
            className="animated-border animated-border-active absolute top-full left-0 right-0 mt-2 z-50 shadow-2xl flex flex-col overflow-hidden bg-card/95 backdrop-blur-md border-2 border-border/50" 
            style={{ maxHeight: 'min(calc(100vh - 200px), 450px)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-semibold text-sm">Aiva Assistant</span>
              </div>
              <button
                type="button"
                onMouseDown={(e) => {
                  // Prevent focus shift before we can close
                  e.preventDefault();
                  e.stopPropagation();
                  closePanel();
                }}
                className="h-7 w-7 p-0 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20 transition-colors cursor-pointer"
                aria-label="Close Aiva Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ScrollArea className="flex-1 p-4" style={{ maxHeight: '300px' }}>
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground space-y-3">
                  <p>Ask me anything about your messages, tasks, or schedule.</p>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">Try asking:</p>
                    <ul className="text-xs space-y-1 ml-1">
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-primary"></span>
                        &quot;What urgent messages do I have?&quot;
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-primary"></span>
                        &quot;Show me tasks due today&quot;
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-primary"></span>
                        &quot;Summarize my unread messages&quot;
                      </li>
                    </ul>
                  </div>
                  <p className="text-xs pt-1 text-muted-foreground/80">
                    Tip: Connect your channels for richer answers.{" "}
                    <a href="/inbox" className="underline text-primary hover:text-primary/80">
                      Go to channels →
                    </a>
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex flex-col gap-1',
                        message.role === 'user' ? 'items-end' : 'items-start'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-lg px-3 py-2 max-w-[85%] text-sm',
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2.5 bg-primary/5 rounded-lg border border-primary/20">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span className="text-xs font-medium">Aiva is thinking...</span>
                    </div>
                  )}
                </div>
              )}
              <div ref={scrollRef} />
            </ScrollArea>

            <div className="border-t px-3 py-2.5 flex-shrink-0 bg-muted/20">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={panelInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 h-9 text-sm"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !input.trim()} className="h-9 px-3">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
