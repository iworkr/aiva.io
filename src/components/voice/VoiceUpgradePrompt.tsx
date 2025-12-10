/**
 * Voice Upgrade Prompt Component
 * Shows an upgrade dialog for users without Pro subscription who try to use voice features
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Volume2, Sparkles, Zap, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceUpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function VoiceUpgradePrompt({
  open,
  onOpenChange,
  workspaceId,
}: VoiceUpgradePromptProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = () => {
    setIsLoading(true);
    // Navigate to the billing/pricing page
    router.push(`/workspace/${workspaceId}/settings/billing`);
  };

  const features = [
    {
      icon: Mic,
      title: 'Natural Voice Conversations',
      description: 'Speak directly to Aiva and get instant voice responses',
    },
    {
      icon: Volume2,
      title: 'High-Quality Voice',
      description: 'Powered by ElevenLabs for natural, human-like speech',
    },
    {
      icon: Zap,
      title: 'Low Latency',
      description: 'Fast response times for seamless conversations',
    },
    {
      icon: MessageSquare,
      title: 'AI Drafts & Replies',
      description: 'Get AI-powered email drafts and smart replies',
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Voice-activated calendar management',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Unlock Voice Aiva</DialogTitle>
          <DialogDescription className="text-base">
            Upgrade to Pro to have natural voice conversations with Aiva
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg',
                'bg-muted/50 border border-border/50'
              )}
            >
              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <feature.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full h-11 text-base gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Redirecting...' : 'Upgrade to Pro'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Voice Feature Badge Component
 * Shows a "Pro" badge for voice features
 */
export function VoiceProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium',
        'bg-gradient-to-r from-primary/20 to-accent/20 text-primary',
        'rounded-md border border-primary/20',
        className
      )}
    >
      <Sparkles className="h-2.5 w-2.5" />
      PRO
    </span>
  );
}

