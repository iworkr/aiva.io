/**
 * Today's Briefing Button with AI-generated typing animation
 * When clicked, generates and displays an AI briefing with typewriter effect
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronRight,
  ChevronUp,
  FileText,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface TodaysBriefingButtonProps {
  itemCount: number;
  briefingData: {
    newMessages: number;
    activeConversations: number;
    todayEventsCount: number;
    upcomingEventsCount: number;
    urgentItemsCount: number;
  };
}

export function TodaysBriefingButton({ itemCount, briefingData }: TodaysBriefingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefingText, setBriefingText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate the briefing when opened
  const generateBriefing = async () => {
    setIsGenerating(true);
    setBriefingText('');
    setDisplayedText('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Generate a concise daily briefing for me. Here's my current status:
- ${briefingData.newMessages} new unread messages
- ${briefingData.activeConversations} total conversations
- ${briefingData.todayEventsCount} events scheduled today
- ${briefingData.upcomingEventsCount} events in the next 48 hours
- ${briefingData.urgentItemsCount} urgent items needing attention

Please provide a brief, friendly overview of my day in 3-4 sentences. Be encouraging and helpful. Start with a brief assessment, mention priorities, and end with a motivating note. Keep it conversational and personal.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate briefing');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          // Parse SSE format
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('0:')) {
              // Extract the text content from the SSE format
              const jsonStr = line.slice(2);
              try {
                const parsed = JSON.parse(jsonStr);
                if (typeof parsed === 'string') {
                  fullText += parsed;
                  setBriefingText(fullText);
                }
              } catch {
                // If not JSON, try direct text
                fullText += jsonStr;
                setBriefingText(fullText);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating briefing:', error);
      setBriefingText("I couldn't generate your briefing right now. Please try again in a moment.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Typewriter effect
  useEffect(() => {
    if (!briefingText || isGenerating) {
      setDisplayedText(briefingText);
      return;
    }

    setIsTyping(true);
    let currentIndex = displayedText.length;

    const typeNextChar = () => {
      if (currentIndex < briefingText.length) {
        setDisplayedText(briefingText.slice(0, currentIndex + 1));
        currentIndex++;
        // Random delay for natural typing feel
        const delay = Math.random() * 20 + 10;
        setTimeout(typeNextChar, delay);
      } else {
        setIsTyping(false);
      }
    };

    if (currentIndex < briefingText.length) {
      typeNextChar();
    }
  }, [briefingText, isGenerating]);

  // Handle button click
  const handleClick = () => {
    if (!isOpen) {
      setIsOpen(true);
      generateBriefing();
    } else {
      setIsOpen(false);
      setBriefingText('');
      setDisplayedText('');
    }
  };

  // Scroll to bottom of briefing as it types
  useEffect(() => {
    if (containerRef.current && isTyping) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText, isTyping]);

  return (
    <div className="flex flex-col items-center gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="default"
              className="group h-10 px-5 shadow-md hover:shadow-lg transition-all"
              onClick={handleClick}
              aria-label={`${isOpen ? 'Close' : 'View'} today's briefing with ${itemCount} items that need your attention`}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span className="font-medium">Today's briefing</span>
              <span className="ml-2 inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-semibold">
                {itemCount}
              </span>
              {isOpen ? (
                <ChevronUp className="ml-2 h-4 w-4 transition-transform" />
              ) : (
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isOpen ? 'Close briefing' : `Generate AI briefing for your ${itemCount} priority items`}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* AI Briefing Card */}
      {isOpen && (
        <Card className="w-full max-w-2xl mx-auto animate-in slide-in-from-top-2 duration-300 border-primary/20 shadow-lg">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8">
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
                <div>
                  <span className="font-semibold text-sm">Aiva's Daily Briefing</span>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    AI-generated summary
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setBriefingText('');
                  setDisplayedText('');
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-skeleton transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Briefing Content */}
            <div
              ref={containerRef}
              className="p-4 min-h-[100px] max-h-[300px] overflow-y-auto"
            >
              {isGenerating && !displayedText ? (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm">Generating your personalized briefing...</span>
                </div>
              ) : (
                <div className="text-sm leading-relaxed">
                  {displayedText}
                  {(isTyping || isGenerating) && (
                    <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse" />
                  )}
                </div>
              )}
            </div>

            {/* Footer with regenerate option */}
            {!isGenerating && briefingText && !isTyping && (
              <div className="px-4 py-3 border-t border-border/50 bg-muted/30 rounded-b-lg">
                <button
                  type="button"
                  onClick={generateBriefing}
                  className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Regenerate briefing
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

