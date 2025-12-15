/**
 * FeatureSlideshow - Marketing Component
 * Auto-rotating carousel of feature vignettes with smooth transitions
 */

'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  showControls?: boolean;
  showIndicators?: boolean;
  compact?: boolean;
}

export function FeatureSlideshow({
  className,
  autoPlayInterval = 14000,
  showControls = true,
  showIndicators = true,
  compact = false,
}: FeatureSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    // Short transition period
    setTimeout(() => {
      setCurrentIndex(index);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 400);
  }, [isTransitioning]);

  const goToNext = useCallback(() => {
    goToSlide((currentIndex + 1) % slides.length);
  }, [currentIndex, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
  }, [currentIndex, goToSlide]);

  // Auto-advance timer
  useEffect(() => {
    timerRef.current = setInterval(goToNext, autoPlayInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goToNext, autoPlayInterval]);

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
    <div className={cn('relative group', className)}>
      {/* Main container with fixed dimensions */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-secondary/30 border shadow-xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center space-y-2">
          <h3 
            className={cn(
              'text-2xl font-bold tracking-tight transition-opacity duration-300',
              isTransitioning ? 'opacity-0' : 'opacity-100'
            )}
          >
            {currentSlide.title}
          </h3>
          <p 
            className={cn(
              'text-base text-muted-foreground max-w-md mx-auto transition-opacity duration-300',
              isTransitioning ? 'opacity-0' : 'opacity-100'
            )}
          >
            {currentSlide.description}
          </p>
        </div>

        {/* Vignette container - FIXED HEIGHT */}
        <div className="relative h-[480px] px-6 pb-8 overflow-hidden">
          <div 
            className={cn(
              'w-full h-full transition-opacity duration-500',
              isTransitioning ? 'opacity-0' : 'opacity-100'
            )}
          >
            <SlideComponent 
              compact={compact} 
              autoPlay={true} 
              loop={true} 
            />
          </div>
        </div>

        {/* Navigation controls */}
        {showControls && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/80 backdrop-blur-sm hover:bg-background/90 z-20"
              onClick={goToPrev}
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/80 backdrop-blur-sm hover:bg-background/90 z-20"
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
                'h-2 rounded-full transition-all duration-500 ease-out',
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to slide ${index + 1}: ${slide.title}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50 overflow-hidden rounded-b-2xl">
        <div
          key={currentIndex}
          className="h-full bg-primary/60 rounded-full animate-progress"
          style={{
            animationDuration: `${autoPlayInterval}ms`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </div>
  );
}

export default FeatureSlideshow;
