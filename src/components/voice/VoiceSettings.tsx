/**
 * Voice Settings Component
 * Allows users to configure their voice preferences
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Volume2, Play, Mic, Settings2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VoiceProBadge } from './VoiceUpgradePrompt';

// Schema for voice settings form
const voiceSettingsSchema = z.object({
  voiceId: z.string().min(1, 'Please select a voice'),
  speed: z.number().min(0.5).max(2),
  volume: z.number().min(0).max(1),
  autoPlay: z.boolean(),
  enabled: z.boolean(),
});

type VoiceSettingsFormValues = z.infer<typeof voiceSettingsSchema>;

// Available voices (subset of ElevenLabs voices)
const AVAILABLE_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, professional' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, gentle' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded, expressive' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Young, friendly' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep, mature' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp, authoritative' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, narrative' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Raspy, dynamic' },
];

interface VoiceSettingsProps {
  workspaceId: string;
  initialSettings?: VoiceSettingsFormValues;
  hasVoiceAccess?: boolean;
  onSettingsChange?: (settings: VoiceSettingsFormValues) => void;
}

export function VoiceSettings({
  workspaceId,
  initialSettings,
  hasVoiceAccess = true,
  onSettingsChange,
}: VoiceSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const defaultValues: VoiceSettingsFormValues = {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    speed: 1.0,
    volume: 1.0,
    autoPlay: true,
    enabled: true,
    ...initialSettings,
  };

  const form = useForm<VoiceSettingsFormValues>({
    resolver: zodResolver(voiceSettingsSchema),
    defaultValues,
  });

  // Test the selected voice
  const handleTestVoice = async () => {
    if (!hasVoiceAccess) {
      toast.error('Voice features require a Pro subscription');
      return;
    }

    setIsTesting(true);
    try {
      const voiceId = form.getValues('voiceId');
      const response = await fetch('/api/voice/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          text: 'Hello! I am Aiva, your AI assistant. How can I help you today?',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to test voice');
      }

      const data = await response.json();
      if (data.audio) {
        const audioBuffer = Uint8Array.from(atob(data.audio), (c) =>
          c.charCodeAt(0)
        );
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = form.getValues('volume');
        audio.playbackRate = form.getValues('speed');
        await audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Voice test error:', error);
      toast.error('Failed to test voice. Please try again.');
    } finally {
      setIsTesting(false);
    }
  };

  // Save settings
  const onSubmit = async (values: VoiceSettingsFormValues) => {
    if (!hasVoiceAccess) {
      toast.error('Voice features require a Pro subscription');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/voice/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          ...values,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success('Voice settings saved successfully');
      onSettingsChange?.(values);
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn(!hasVoiceAccess && 'opacity-60')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Voice Settings</CardTitle>
            <VoiceProBadge />
          </div>
          {form.watch('enabled') && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Active
            </span>
          )}
        </div>
        <CardDescription>
          Configure your Voice Aiva preferences including voice selection and playback options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Enable/Disable Voice */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Voice Aiva</FormLabel>
                    <FormDescription>
                      Turn voice features on or off
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!hasVoiceAccess}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Voice Selection */}
            <FormField
              control={form.control}
              name="voiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voice</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!hasVoiceAccess}
                    >
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AVAILABLE_VOICES.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            <div className="flex flex-col">
                              <span>{voice.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {voice.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleTestVoice}
                      disabled={isTesting || !hasVoiceAccess}
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <FormDescription>
                    Choose the voice that Aiva will use when speaking
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Playback Speed */}
            <FormField
              control={form.control}
              name="speed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Playback Speed: {field.value.toFixed(1)}x
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0.5}
                      max={2}
                      step={0.1}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      disabled={!hasVoiceAccess}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Adjust how fast Aiva speaks (0.5x - 2x)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Volume */}
            <FormField
              control={form.control}
              name="volume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Volume: {Math.round(field.value * 100)}%
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      disabled={!hasVoiceAccess}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Adjust the volume of voice responses
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto-play */}
            <FormField
              control={form.control}
              name="autoPlay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto-play Responses</FormLabel>
                    <FormDescription>
                      Automatically play voice responses when received
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!hasVoiceAccess}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Save Button */}
            <Button
              type="submit"
              disabled={isLoading || !hasVoiceAccess}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Voice Settings'
              )}
            </Button>

            {!hasVoiceAccess && (
              <p className="text-xs text-center text-muted-foreground">
                Upgrade to Pro to customize voice settings
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

