/**
 * Aiva Chat Input Component
 * Minimal AI chat input - matches FloatingAssistant styling
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from 'ai/react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, X, Loader2, ThumbsUp, ThumbsDown, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AivaChatInputProps {
  className?: string;
}

export function AivaChatInput({ className }: AivaChatInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId] = useState(() => `dashboard-${Date.now()}`);
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

  // Close panel
  const closePanel = useCallback(() => {
    stop?.();
    setIsOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [stop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Open panel if not already open
    if (!isOpen) setIsOpen(true);

    await append({
      role: 'user',
      content: input,
    });
    setInput('');
    
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
    <div className={cn('relative', className)}>
      {/* Simple Input Bar with Send Button Inside */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <Image
            src="/logos/aiva-mark.svg"
            alt="Aiva"
            width={16}
            height={16}
            className="object-contain opacity-60"
          />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Ask Aiva anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => !isOpen && messages.length > 0 && setIsOpen(true)}
          className="pl-10 pr-12 h-11 text-sm bg-background border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 rounded-xl"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()} 
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center transition-all",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            input.trim() && !isLoading 
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* Chat Panel - Only shows when there are messages */}
      {isOpen && messages.length > 0 && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/10" 
            onClick={closePanel}
            aria-hidden="true"
          />
          
          {/* Chat Window */}
          <div 
            ref={panelRef}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border-2 border-border/50 shadow-xl rounded-xl flex flex-col"
            style={{ maxHeight: '400px' }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="relative h-7 w-7">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-primary/25 blur-sm" />
                  <div className="relative h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Image
                      src="/logos/aiva-mark.svg"
                      alt="Aiva"
                      width={14}
                      height={14}
                      className="object-contain"
                    />
                  </div>
                </div>
                <span className="font-medium text-sm">Aiva Assistant</span>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-skeleton transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 min-h-0"
            >
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
                          'flex gap-2',
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        {/* Avatar */}
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 relative h-6 w-6">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary/25 blur-sm" />
                            <div className="relative h-6 w-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <Image
                                src="/logos/aiva-mark.svg"
                                alt="Aiva"
                                width={12}
                                height={12}
                                className="object-contain"
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Message bubble */}
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-normal',
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
                      
                      {/* Timestamp and actions */}
                      <div
                        className={cn(
                          'flex items-center gap-2 px-1',
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row ml-8'
                        )}
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(message.createdAt || new Date())}
                        </span>
                        
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
                              <TooltipContent side="top" className="text-xs">Good response</TooltipContent>
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
                              <TooltipContent side="top" className="text-xs">Poor response</TooltipContent>
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
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 relative h-6 w-6">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary/25 blur-sm" />
                        <div className="relative h-6 w-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Image
                            src="/logos/aiva-mark.svg"
                            alt="Aiva"
                            width={12}
                            height={12}
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
                          </div>
                          <span className="text-xs text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick suggestions at bottom */}
                  {!isLoading && !input.trim() && (
                    <div className="pt-2 grid grid-cols-2 gap-2">
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
              
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-border/50 p-3 bg-muted/30">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 h-9 text-sm rounded-xl border-2 border-border/50 focus:border-primary/50"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()} 
                  className="h-9 w-9 rounded-xl p-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
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
    </div>
  );
}
