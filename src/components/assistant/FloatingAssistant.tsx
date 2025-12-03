/**
 * Floating AI Assistant Bubble
 * Appears on all app pages (when logged in) in the bottom right corner
 * Opens a chat interface for AI assistance
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from 'ai/react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, X, Loader2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId] = useState(() => `assistant-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Toggle panel
  const togglePanel = useCallback(() => {
    if (isOpen) {
      stop?.();
    }
    setIsOpen(!isOpen);
  }, [isOpen, stop]);

  // Close panel
  const closePanel = useCallback(() => {
    stop?.();
    setIsOpen(false);
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

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] md:hidden"
            onClick={closePanel}
          />
          <Card 
            ref={panelRef}
            className={cn(
              "fixed z-[70] shadow-2xl flex flex-col overflow-hidden",
              "bg-card/98 backdrop-blur-xl border-2 border-primary/20",
              "transition-all duration-300 ease-out",
              // Mobile: full screen with margins
              "inset-4 md:inset-auto",
              // Desktop: positioned above the bubble
              "md:bottom-24 md:right-6 md:w-[400px] md:max-h-[500px] md:rounded-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-0.5 ring-2 ring-primary/30">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                    <Image
                      src="/logos/aiva-mark.svg"
                      alt="Aiva"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-sm block">Aiva Assistant</span>
                  <span className="text-xs text-muted-foreground">Always here to help</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closePanel}
                  className="h-8 w-8 rounded-full hover:bg-muted"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closePanel}
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground space-y-4">
                  <div className="text-center py-6">
                    <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                      <Image
                        src="/logos/aiva-mark.svg"
                        alt="Aiva"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <p className="font-medium text-foreground">Hi! I&apos;m Aiva</p>
                    <p className="text-xs mt-1">Your AI communication assistant</p>
                  </div>
                  <div className="space-y-2 px-2">
                    <p className="text-xs font-medium text-foreground">I can help you:</p>
                    <ul className="text-xs space-y-2">
                      <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => setInput("What urgent messages do I have?")}>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                        <span>Find urgent messages across channels</span>
                      </li>
                      <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => setInput("Summarize my unread messages")}>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                        <span>Summarize your inbox</span>
                      </li>
                      <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => setInput("What meetings do I have today?")}>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                        <span>Check your calendar & schedule</span>
                      </li>
                      <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => setInput("Draft a reply to the last urgent email")}>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                        <span>Draft replies & messages</span>
                      </li>
                    </ul>
                  </div>
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
                          'rounded-2xl px-4 py-2.5 max-w-[85%] text-sm',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl rounded-bl-md border border-primary/10">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce"></span>
                      </div>
                      <span className="text-xs font-medium">Aiva is thinking...</span>
                    </div>
                  )}
                </div>
              )}
              <div ref={scrollRef} />
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border/50 p-3 flex-shrink-0 bg-muted/30">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Aiva anything..."
                  className="flex-1 h-10 text-sm rounded-full px-4 border-2 border-border/50 focus:border-primary/50"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()} 
                  className="h-10 w-10 rounded-full p-0 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </Card>
        </>
      )}

      {/* Floating Bubble Button */}
      <button
        onClick={togglePanel}
        className={cn(
          "fixed bottom-6 right-6 z-[60]",
          "h-14 w-14 rounded-full",
          "bg-gradient-to-br from-primary to-primary/80",
          "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "hover:scale-110 active:scale-95",
          "ring-4 ring-primary/20 hover:ring-primary/30",
          "group",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
        aria-label="Open Aiva Assistant"
      >
        <div className="relative">
          <Image
            src="/logos/aiva-mark.svg"
            alt="Aiva"
            width={28}
            height={28}
            className="object-contain brightness-0 invert group-hover:scale-110 transition-transform"
          />
          {/* Pulse animation ring */}
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
        </div>
      </button>

      {/* Tooltip hint (shows briefly on first load) */}
      <div className={cn(
        "fixed bottom-[90px] right-6 z-[55]",
        "bg-card border border-border/50 rounded-lg shadow-lg",
        "px-3 py-2 text-xs font-medium",
        "opacity-0 pointer-events-none",
        "transition-opacity duration-300",
        !isOpen && "animate-fade-in-delayed"
      )}>
        <span className="text-muted-foreground">Need help?</span>
        <span className="text-primary ml-1">Ask Aiva!</span>
        {/* Arrow pointing down */}
        <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-card border-b border-r border-border/50 rotate-45" />
      </div>
    </>
  );
}

