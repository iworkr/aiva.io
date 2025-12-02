/**
 * CreateEventDialog Component
 * Dialog for creating new calendar events
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe } from 'lucide-react';
import { createEventAction } from '@/data/user/calendar';
import { getWorkspaceSettings } from '@/data/user/settings';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

// Get user's timezone (from settings or auto-detect)
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

const createEventFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isAllDay: z.boolean().default(false),
}).refine(
  (data) => {
    if (!data.startTime || !data.endTime) return true;
    return new Date(data.endTime) > new Date(data.startTime);
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

type CreateEventForm = z.infer<typeof createEventFormSchema>;

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId?: string;
  onSuccess?: () => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  workspaceId,
  userId,
  onSuccess,
}: CreateEventDialogProps) {
  const [userTimezone, setUserTimezone] = useState(() => getUserTimezone());
  
  // Load user's saved timezone from settings
  useEffect(() => {
    if (!userId || !workspaceId) return;
    
    const loadTimezone = async () => {
      try {
        const settings = await getWorkspaceSettings(workspaceId, userId) as { timezone?: string };
        if (settings?.timezone) {
          setUserTimezone(settings.timezone);
        }
      } catch (error) {
        // Keep auto-detected timezone if settings fail to load
        console.error('Failed to load timezone settings:', error);
      }
    };
    
    loadTimezone();
  }, [workspaceId, userId]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateEventForm>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      isAllDay: false,
    },
  });

  const { execute: createEvent, status } = useAction(createEventAction, {
    onSuccess: () => {
      toast.success('Event created successfully');
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to create event');
    },
  });

  const onSubmit = (data: CreateEventForm) => {
    // For manual events, we need a calendar connection
    // The action will handle finding or creating a default connection
    const startTime = new Date(data.startTime).toISOString();
    const endTime = new Date(data.endTime).toISOString();

    createEvent({
      workspaceId,
      calendarConnectionId: workspaceId, // Action will handle this
      providerEventId: `manual-${crypto.randomUUID()}`,
      title: data.title,
      description: data.description,
      location: data.location,
      startTime,
      endTime,
      timezone: userTimezone, // Use user's saved or auto-detected timezone
      isAllDay: data.isAllDay,
      status: 'confirmed',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Add a new event to your calendar
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter event title"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Enter event description (optional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  {...register('startTime')}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">{errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  {...register('endTime')}
                />
                {errors.endTime && (
                  <p className="text-sm text-destructive">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="Enter event location (optional)"
              />
            </div>
            
            {/* Timezone indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>Timezone: {userTimezone}</span>
              <Badge variant="outline" className="text-xs">
                {userTimezone === getUserTimezone() ? 'Auto-detected' : 'From settings'}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={status === 'executing'}
            >
              {status === 'executing' ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

