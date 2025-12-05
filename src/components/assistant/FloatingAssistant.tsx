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
import { Send, X, Loader2, Sparkles, ThumbsUp, ThumbsDown, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId] = useState(() => `assistant-${Date.now()}`);
  const [ratings, setRatings] = useState<Record<string, 'up' | 'down' | null>>({});
  const [reported, setReported] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // useChat hook
  const { messages, append, isLoading, input, setInput, stop } = useChat({
    id: chatId,
    api: '/api/chat',
    onFinish: () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    
    // Scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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

  // Quick action handler
  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // Rating handler
  const handleRating = (messageId: string, rating: 'up' | 'down') => {
    setRatings(prev => ({
      ...prev,
      [messageId]: prev[messageId] === rating ? null : rating
    }));
    if (rating === 'up') {
      toast.success('Thanks for the feedback!', { duration: 2000 });
    } else {
      toast.info('Thanks for letting us know. We\'ll improve!', { duration: 2000 });
    }
  };

  // Report handler
  const handleReport = (messageId: string) => {
    if (reported.has(messageId)) return;
    setReported(prev => new Set(prev).add(messageId));
    toast.success('Response reported. Thank you for helping us improve!', { duration: 3000 });
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] md:hidden"
            onClick={closePanel}
          />
          
          {/* Chat Window */}
          <div 
            ref={panelRef}
            className={cn(
              "fixed z-[70] flex flex-col",
              "bg-card border-2 border-border/50 shadow-2xl",
              "transition-all duration-300 ease-out",
              // Mobile: full screen with margins
              "inset-3 rounded-2xl md:inset-auto",
              // Desktop: positioned closer to bottom right
              "md:bottom-6 md:right-6 md:w-[420px] md:h-[560px] md:rounded-2xl"
            )}
          >
            {/* ===== STATIC HEADER ===== */}
            <div className="flex-shrink-0 border-b border-border/50 bg-gradient-to-r from-primary/5 via-background to-accent/5 rounded-t-2xl">
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  {/* Logo with gradient ring and contained blue glow */}
                  <div className="relative h-11 w-11">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-primary/30 blur-md" />
                    <div className="relative h-11 w-11 rounded-full bg-gradient-to-br from-primary to-accent p-[2px] shadow-lg shadow-primary/30">
                      <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                        <Image
                          src="/logos/aiva-mark.svg"
                          alt="Aiva"
                          width={26}
                          height={26}
                          className="object-contain"
                        />
                      </div>
                    </div>
                    {/* Online indicator */}
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Aiva Assistant</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Online • Ready to help
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-skeleton transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ===== SCROLLABLE MESSAGE AREA ===== */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
            >
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  /* Empty State / Welcome Screen */
                  <div className="h-full flex flex-col items-center justify-center py-8">
                    {/* Welcome illustration with contained blue glow */}
                    <div className="relative mb-6 h-20 w-20">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-primary/25 blur-lg" />
                      <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Image
                          src="/logos/aiva-mark.svg"
                          alt="Aiva"
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>
                      <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-primary animate-pulse" />
                    </div>
                    
                    <h4 className="text-lg font-semibold text-foreground mb-1">Hi! I&apos;m Aiva</h4>
                    <p className="text-sm text-muted-foreground mb-6 text-center px-4">
                      Your AI communication assistant. How can I help you today?
                    </p>

                    {/* Quick action suggestions */}
                    <div className="w-full space-y-2 px-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-3">
                        Quick Actions
                      </p>
                      <button
                        onClick={() => handleQuickAction("What urgent messages do I have?")}
                        className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/20 transition-all group"
                      >
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          🔥 Find urgent messages
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Across all your channels
                        </p>
                      </button>
                      <button
                        onClick={() => handleQuickAction("Summarize my unread messages")}
                        className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/20 transition-all group"
                      >
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          📬 Summarize my inbox
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Get a quick overview
                        </p>
                      </button>
                      <button
                        onClick={() => handleQuickAction("What meetings do I have today?")}
                        className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/20 transition-all group"
                      >
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          📅 Check today&apos;s schedule
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Meetings and events
                        </p>
                      </button>
                      <button
                        onClick={() => handleQuickAction("Help me draft a professional reply")}
                        className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/20 transition-all group"
                      >
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          ✍️ Draft a reply
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Professional and polished
                        </p>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Chat Messages */
                  <TooltipProvider delayDuration={300}>
                    <div className="space-y-4">
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
                              'flex gap-3',
                              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                            )}
                          >
                            {/* Avatar with contained blue glow */}
                            {message.role === 'assistant' && (
                              <div className="flex-shrink-0 relative h-8 w-8">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary/25 blur-sm" />
                                <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-sm shadow-primary/20">
                                  <Image
                                    src="/logos/aiva-mark.svg"
                                    alt="Aiva"
                                    width={18}
                                    height={18}
                                    className="object-contain"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Message bubble */}
                            <div
                              className={cn(
                                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-normal',
                                message.role === 'user'
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              )}
                            >
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <span className="block">{children}</span>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                  ul: ({ children }) => <ul className="list-disc pl-4 mt-1 space-y-0.5">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-4 mt-1 space-y-0.5">{children}</ol>,
                                  li: ({ children }) => <li className="leading-tight">{children}</li>,
                                  code: ({ children }) => <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                          
                          {/* Timestamp and actions row */}
                          <div
                            className={cn(
                              'flex items-center gap-2 px-1',
                              message.role === 'user' ? 'flex-row-reverse' : 'flex-row ml-11'
                            )}
                          >
                            {/* Timestamp */}
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(message.createdAt || new Date())}
                            </span>
                            
                            {/* Rating and report buttons (only for AI responses) */}
                            {message.role === 'assistant' && (
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => handleRating(message.id, 'up')}
                                      className={cn(
                                        'p-1 rounded-md transition-colors',
                                        ratings[message.id] === 'up'
                                          ? 'text-green-500 bg-green-500/10'
                                          : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
                                      )}
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Good response
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => handleRating(message.id, 'down')}
                                      className={cn(
                                        'p-1 rounded-md transition-colors',
                                        ratings[message.id] === 'down'
                                          ? 'text-red-500 bg-red-500/10'
                                          : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
                                      )}
                                    >
                                      <ThumbsDown className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Poor response
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => handleReport(message.id)}
                                      disabled={reported.has(message.id)}
                                      className={cn(
                                        'p-1 rounded-md transition-colors',
                                        reported.has(message.id)
                                          ? 'text-amber-500 bg-amber-500/10 cursor-not-allowed'
                                          : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                                      )}
                                    >
                                      <Flag className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {reported.has(message.id) ? 'Reported' : 'Report response'}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    
                      {/* Loading indicator */}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 relative h-8 w-8">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary/25 blur-sm" />
                            <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-sm shadow-primary/20">
                              <Image
                                src="/logos/aiva-mark.svg"
                                alt="Aiva"
                                width={18}
                                height={18}
                                className="object-contain"
                              />
                            </div>
                          </div>
                          <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
                              </div>
                              <span className="text-xs text-muted-foreground">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Quick suggestions - shown at bottom of chat when not typing/loading */}
                      {!isLoading && !input.trim() && (
                        <div className="pt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickAction("Summarize my inbox")}
                            className="px-3 py-2 text-xs rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors text-left"
                          >
                            📬 Summarize inbox
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAction("What urgent messages do I have?")}
                            className="px-3 py-2 text-xs rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors text-left"
                          >
                            🔥 Urgent messages
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAction("What's on my calendar today?")}
                            className="px-3 py-2 text-xs rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors text-left"
                          >
                            📅 Today&apos;s schedule
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAction("Help me draft a reply")}
                            className="px-3 py-2 text-xs rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors text-left"
                          >
                            ✍️ Draft reply
                          </button>
                        </div>
                      )}
                    </div>
                  </TooltipProvider>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ===== STATIC FOOTER ===== */}
            <div className="flex-shrink-0 border-t border-border/50 bg-muted/30 rounded-b-2xl p-3">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="h-11 text-sm rounded-xl pl-4 pr-4 border-2 border-border/50 focus:border-primary/50 bg-background"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()} 
                  className={cn(
                    "h-11 w-11 rounded-xl p-0 transition-all",
                    "bg-primary hover:bg-primary/90",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    input.trim() && !isLoading && "shadow-lg shadow-primary/25"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Press Enter to send • Esc to close
              </p>
            </div>
          </div>
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
            src="/aiva-logo/SVG/Asset 83.svg"
            alt="Aiva"
            width={30}
            height={30}
            className="object-contain group-hover:scale-110 transition-transform"
          />
          {/* Slow pulse animation ring */}
          <span className="absolute inset-0 rounded-full bg-white/15 animate-[ping_3s_ease-in-out_infinite]" />
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

