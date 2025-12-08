/**
 * FeatureSlideshow - Marketing Component
 * Auto-rotating carousel of feature vignettes
 */

'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { AITriageVignette } from './vignettes/AITriageVignette';
import { InboxZeroVignette } from './vignettes/InboxZeroVignette';
import { AutoReplyVignette } from './vignettes/AutoReplyVignette';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Slide {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<{ compact?: boolean; autoPlay?: boolean; loop?: boolean }>;
}

const slides: Slide[] = [
  {
    id: 'triage',
    title: 'AI-Powered Triage',
    description: 'Instantly classify and prioritize every message',
    component: AITriageVignette,
  },
  {
    id: 'inbox-zero',
    title: 'Achieve Inbox Zero',
    description: 'Let Aiva handle your messages automatically',
    component: InboxZeroVignette,
  },
  {
    id: 'auto-reply',
    title: 'Smart Auto-Reply',
    description: 'AI drafts perfect replies in your tone',
    component: AutoReplyVignette,
  },
];

interface FeatureSlideshowProps {
  className?: string;
  autoPlayInterval?: number;
  pauseOnHover?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  compact?: boolean;
}

export function FeatureSlideshow({
  className,
  autoPlayInterval = 14000, // Slower default for readability
  pauseOnHover = true,
  showControls = true,
  showIndicators = true,
  compact = false,
}: FeatureSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const goToNext = useCallback(() => {
    goToSlide((currentIndex + 1) % slides.length);
  }, [currentIndex, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
  }, [currentIndex, goToSlide]);

  // Auto-advance
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPaused, goToNext, autoPlayInterval]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  const currentSlide = slides[currentIndex];
  const SlideComponent = currentSlide.component;

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {/* Slide content */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-secondary/30 border shadow-xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">{currentSlide.title}</h3>
          <p className="text-base text-muted-foreground max-w-md mx-auto">{currentSlide.description}</p>
        </div>

        {/* Vignette container */}
        <div className="relative px-6 pb-8">
          <div
            key={currentSlide.id}
            className={cn(
              'transition-all duration-700 ease-out',
              isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            )}
          >
            <SlideComponent compact={compact} autoPlay={!isPaused} loop={false} />
          </div>
        </div>

        {/* Navigation controls */}
        {showControls && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              onClick={goToPrev}
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              onClick={goToNext}
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {/* Indicators */}
      {showIndicators && (
        <div className="flex justify-center gap-2 mt-4">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-6 bg-primary'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to slide ${index + 1}: ${slide.title}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden rounded-b-2xl">
          <div
            className="h-full bg-primary transition-all ease-linear"
            style={{
              width: '100%',
              animation: `shrink ${autoPlayInterval}ms linear infinite`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default FeatureSlideshow;

