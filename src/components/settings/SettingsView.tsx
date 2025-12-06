/**
 * SettingsView Component
 * Main settings interface with tabs
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCachedData } from '@/hooks/useCachedData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Bell,
  User,
  Shield,
  CreditCard,
  Lock,
  Crown,
  Loader2,
  Save,
  CheckCircle,
  Zap,
  Clock,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import {
  updateAISettingsAction,
  updateNotificationSettingsAction,
  updateAccountSettingsAction,
  updateSyncSettingsAction,
  updateAutoSendSettingsAction,
  pauseAutoSendAction,
  resumeAutoSendAction,
  getWorkspaceSettings,
  getUserProfile,
  getAutoSendSettings,
} from '@/data/user/settings';
import { useRouter } from '@/i18n/routing';
import { ReactNode } from 'react';
import { useProSubscription } from '@/components/ProFeatureGate';

interface SettingsViewProps {
  workspaceId: string;
  userId: string;
  user: any;
  billingContent?: ReactNode;
}

// Comprehensive timezone list grouped by region
const TIMEZONE_OPTIONS = [
  // Australia
  { value: 'Australia/Brisbane', label: 'Australia/Brisbane (AEST)', region: 'Australia' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)', region: 'Australia' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST/AEDT)', region: 'Australia' },
  { value: 'Australia/Perth', label: 'Australia/Perth (AWST)', region: 'Australia' },
  { value: 'Australia/Adelaide', label: 'Australia/Adelaide (ACST/ACDT)', region: 'Australia' },
  // Americas
  { value: 'America/New_York', label: 'America/New York (EST/EDT)', region: 'Americas' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)', region: 'Americas' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT)', region: 'Americas' },
  { value: 'America/Toronto', label: 'America/Toronto (EST/EDT)', region: 'Americas' },
  { value: 'America/Vancouver', label: 'America/Vancouver (PST/PDT)', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'America/São Paulo (BRT)', region: 'Americas' },
  // Europe
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Europe/Zurich (CET/CEST)', region: 'Europe' },
  // Asia
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong Kong (HKT)', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (KST)', region: 'Asia' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)', region: 'Asia' },
  // Pacific
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)', region: 'Pacific' },
  { value: 'Pacific/Fiji', label: 'Pacific/Fiji (FJT)', region: 'Pacific' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (HST)', region: 'Pacific' },
  // Other
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'Other' },
];

// Get display label for a timezone value
function getTimezoneLabel(value: string): string {
  const tz = TIMEZONE_OPTIONS.find(t => t.value === value);
  return tz?.label || value;
}

// Detect user's browser timezone
function detectUserTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check if it's in our list, otherwise return UTC
    const exists = TIMEZONE_OPTIONS.some(t => t.value === detected);
    return exists ? detected : 'UTC';
  } catch {
    return 'UTC';
  }
}

export function SettingsView({ workspaceId, userId, user, billingContent }: SettingsViewProps) {
  const router = useRouter();
  const [autoClassify, setAutoClassify] = useState(true);
  const [autoTasks, setAutoTasks] = useState(false);
  const [autoEvents, setAutoEvents] = useState(false);
  const [defaultTone, setDefaultTone] = useState('professional');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [timezone, setTimezone] = useState(() => detectUserTimezone()); // Auto-detect on init
  const [syncFrequency, setSyncFrequency] = useState('15');
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [detectedTimezone] = useState(() => detectUserTimezone()); // Store detected timezone

  // Auto-send settings state
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [autoSendDelayType, setAutoSendDelayType] = useState<'exact' | 'random'>('random');
  const [autoSendDelayMin, setAutoSendDelayMin] = useState(10);
  const [autoSendDelayMax, setAutoSendDelayMax] = useState(30);
  const [autoSendConfidenceThreshold, setAutoSendConfidenceThreshold] = useState(0.85);
  const [autoSendTimeStart, setAutoSendTimeStart] = useState('09:00');
  const [autoSendTimeEnd, setAutoSendTimeEnd] = useState('21:00');
  const [autoSendPaused, setAutoSendPaused] = useState(false);
  
  // Check Pro subscription status
  const { hasPro, loading: loadingPro } = useProSubscription(workspaceId);

  // Cache key for settings
  const cacheKey = useMemo(() => `settings-${workspaceId}-${userId}`, [workspaceId, userId]);

  // Fetch function for settings
  const fetchSettingsData = useCallback(async () => {
    const [rawSettings, profile, autoSend] = await Promise.all([
      getWorkspaceSettings(workspaceId, userId),
      getUserProfile(userId),
      getAutoSendSettings(workspaceId, userId),
    ]);
    return { settings: rawSettings, profile, autoSend };
  }, [workspaceId, userId]);

  // Use cached data for instant load
  const { data: cachedSettings, isLoading: loading } = useCachedData(
    cacheKey,
    fetchSettingsData,
    {
      ttl: 10 * 60 * 1000, // 10 minutes cache for settings
      deps: [workspaceId, userId],
      onUpdate: (data) => {
        // Update local state when fresh data arrives
        if (!data) return;
        
        const settings = data.settings as {
          ai?: {
            autoClassify?: boolean;
            autoExtractTasks?: boolean;
            autoCreateEvents?: boolean;
            defaultReplyTone?: string;
          };
          notifications?: {
            email?: boolean;
            push?: boolean;
          };
          timezone?: string;
          syncFrequency?: number;
        };
        const profile = data.profile;

        // Set AI settings
        if (settings?.ai) {
          setAutoClassify(settings.ai.autoClassify ?? true);
          setAutoTasks(settings.ai.autoExtractTasks ?? false);
          setAutoEvents(settings.ai.autoCreateEvents ?? false);
          setDefaultTone(settings.ai.defaultReplyTone || 'professional');
        }

        // Set notification settings
        if (settings?.notifications) {
          setEmailNotifications(settings.notifications.email ?? true);
          setPushNotifications(settings.notifications.push ?? true);
        }

        // Set account settings
        if (profile?.full_name) {
          setDisplayName(profile.full_name);
        }

        // Set sync settings
        if (settings?.timezone) {
          setTimezone(settings.timezone);
        }
        if (settings?.syncFrequency) {
          setSyncFrequency(String(settings.syncFrequency));
        }

        // Set auto-send settings
        const autoSend = data.autoSend as {
          autoSendEnabled?: boolean;
          autoSendDelayType?: 'exact' | 'random';
          autoSendDelayMin?: number;
          autoSendDelayMax?: number;
          autoSendConfidenceThreshold?: number;
          autoSendTimeStart?: string;
          autoSendTimeEnd?: string;
          autoSendPaused?: boolean;
        };
        if (autoSend) {
          setAutoSendEnabled(autoSend.autoSendEnabled ?? false);
          setAutoSendDelayType(autoSend.autoSendDelayType ?? 'random');
          setAutoSendDelayMin(autoSend.autoSendDelayMin ?? 10);
          setAutoSendDelayMax(autoSend.autoSendDelayMax ?? 30);
          setAutoSendConfidenceThreshold(autoSend.autoSendConfidenceThreshold ?? 0.85);
          setAutoSendTimeStart(autoSend.autoSendTimeStart ?? '09:00');
          setAutoSendTimeEnd(autoSend.autoSendTimeEnd ?? '21:00');
          setAutoSendPaused(autoSend.autoSendPaused ?? false);
        }
        
        setSettingsInitialized(true);
      },
    }
  );

  // Initialize settings from cache on first load
  useEffect(() => {
    if (cachedSettings && !settingsInitialized) {
      const settings = cachedSettings.settings as {
        ai?: {
          autoClassify?: boolean;
          autoExtractTasks?: boolean;
          autoCreateEvents?: boolean;
          defaultReplyTone?: string;
        };
        notifications?: {
          email?: boolean;
          push?: boolean;
        };
        timezone?: string;
        syncFrequency?: number;
      };
      const profile = cachedSettings.profile;

      if (settings?.ai) {
        setAutoClassify(settings.ai.autoClassify ?? true);
        setAutoTasks(settings.ai.autoExtractTasks ?? false);
        setAutoEvents(settings.ai.autoCreateEvents ?? false);
        setDefaultTone(settings.ai.defaultReplyTone || 'professional');
      }

      if (settings?.notifications) {
        setEmailNotifications(settings.notifications.email ?? true);
        setPushNotifications(settings.notifications.push ?? true);
      }

      if (profile?.full_name) {
        setDisplayName(profile.full_name);
      }

      if (settings?.timezone) {
        setTimezone(settings.timezone);
      }
      if (settings?.syncFrequency) {
        setSyncFrequency(String(settings.syncFrequency));
      }

      // Initialize auto-send settings from cache
      const autoSend = cachedSettings.autoSend as {
        autoSendEnabled?: boolean;
        autoSendDelayType?: 'exact' | 'random';
        autoSendDelayMin?: number;
        autoSendDelayMax?: number;
        autoSendConfidenceThreshold?: number;
        autoSendTimeStart?: string;
        autoSendTimeEnd?: string;
        autoSendPaused?: boolean;
      };
      if (autoSend) {
        setAutoSendEnabled(autoSend.autoSendEnabled ?? false);
        setAutoSendDelayType(autoSend.autoSendDelayType ?? 'random');
        setAutoSendDelayMin(autoSend.autoSendDelayMin ?? 10);
        setAutoSendDelayMax(autoSend.autoSendDelayMax ?? 30);
        setAutoSendConfidenceThreshold(autoSend.autoSendConfidenceThreshold ?? 0.85);
        setAutoSendTimeStart(autoSend.autoSendTimeStart ?? '09:00');
        setAutoSendTimeEnd(autoSend.autoSendTimeEnd ?? '21:00');
        setAutoSendPaused(autoSend.autoSendPaused ?? false);
      }
      
      setSettingsInitialized(true);
    }
  }, [cachedSettings, settingsInitialized]);

  // Debounce timer refs for auto-save
  const aiSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notifSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if values have been modified to avoid saving on initial load
  const hasInitializedRef = useRef(false);

  // AI Settings - auto-save with debounce
  const { execute: saveAISettings, status: aiStatus } = useAction(updateAISettingsAction, {
    onSuccess: () => {
      toast.success('Setting updated', { duration: 2000 });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save setting');
    },
  });

  // Notification Settings - auto-save
  const { execute: saveNotificationSettings, status: notifStatus } = useAction(updateNotificationSettingsAction, {
    onSuccess: () => {
      toast.success('Setting updated', { duration: 2000 });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save setting');
    },
  });

  // Account Settings - manual save only for text inputs
  const { execute: saveAccountSettings, status: accountStatus } = useAction(updateAccountSettingsAction, {
    onSuccess: () => {
      toast.success('Profile updated successfully', {
        description: 'Your profile information has been saved.',
        duration: 4000,
      });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save account settings');
    },
  });

  // Sync Settings - auto-save with debounce
  const { execute: saveSyncSettings, status: syncStatus } = useAction(updateSyncSettingsAction, {
    onSuccess: () => {
      toast.success('Setting updated', { duration: 2000 });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save setting');
    },
  });

  // Auto-send Settings
  const { execute: saveAutoSendSettings, status: autoSendStatus } = useAction(updateAutoSendSettingsAction, {
    onSuccess: () => {
      toast.success('Auto-reply setting updated', { duration: 2000 });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save auto-reply setting');
    },
  });

  const { execute: pauseAutoSend, status: pauseStatus } = useAction(pauseAutoSendAction, {
    onSuccess: () => {
      setAutoSendPaused(true);
      toast.success('Auto-reply paused', { duration: 3000 });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to pause auto-reply');
    },
  });

  const { execute: resumeAutoSend, status: resumeStatus } = useAction(resumeAutoSendAction, {
    onSuccess: () => {
      setAutoSendPaused(false);
      toast.success('Auto-reply resumed', { duration: 3000 });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to resume auto-reply');
    },
  });

  // Auto-send timer ref for debounced saves
  const autoSendSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save AI settings when switches/selects change
  const triggerAIAutoSave = useCallback((updates: { 
    autoClassify?: boolean; 
    autoTasks?: boolean; 
    autoEvents?: boolean; 
    defaultTone?: string 
  }) => {
    if (!hasInitializedRef.current) return;
    
    if (aiSaveTimerRef.current) {
      clearTimeout(aiSaveTimerRef.current);
    }
    
    aiSaveTimerRef.current = setTimeout(() => {
      saveAISettings({
        workspaceId,
        autoClassify: updates.autoClassify ?? autoClassify,
        autoExtractTasks: updates.autoTasks ?? autoTasks,
        autoCreateEvents: updates.autoEvents ?? autoEvents,
        defaultReplyTone: (updates.defaultTone ?? defaultTone) as any,
      });
    }, 500);
  }, [workspaceId, autoClassify, autoTasks, autoEvents, defaultTone, saveAISettings]);

  // Auto-save notification settings when switches change
  const triggerNotifAutoSave = useCallback((updates: { 
    emailNotifications?: boolean; 
    pushNotifications?: boolean 
  }) => {
    if (!hasInitializedRef.current) return;
    
    if (notifSaveTimerRef.current) {
      clearTimeout(notifSaveTimerRef.current);
    }
    
    notifSaveTimerRef.current = setTimeout(() => {
      saveNotificationSettings({
        workspaceId,
        emailNotifications: updates.emailNotifications ?? emailNotifications,
        pushNotifications: updates.pushNotifications ?? pushNotifications,
      });
    }, 500);
  }, [workspaceId, emailNotifications, pushNotifications, saveNotificationSettings]);

  // Auto-save sync settings when selects change
  const triggerSyncAutoSave = useCallback((updates: { 
    timezone?: string; 
    syncFrequency?: string 
  }) => {
    if (!hasInitializedRef.current) return;
    
    if (syncSaveTimerRef.current) {
      clearTimeout(syncSaveTimerRef.current);
    }
    
    syncSaveTimerRef.current = setTimeout(() => {
      const tz = updates.timezone ?? timezone;
      const freq = updates.syncFrequency ?? syncFrequency;
      saveSyncSettings({
        workspaceId,
        timezone: tz !== 'utc' ? tz : undefined,
        syncFrequency: freq ? Number(freq) : undefined,
      });
    }, 500);
  }, [workspaceId, timezone, syncFrequency, saveSyncSettings]);

  // Handlers for auto-save enabled fields
  const handleAutoClassifyChange = (value: boolean) => {
    setAutoClassify(value);
    triggerAIAutoSave({ autoClassify: value });
  };

  const handleAutoTasksChange = (value: boolean) => {
    setAutoTasks(value);
    triggerAIAutoSave({ autoTasks: value });
  };

  const handleAutoEventsChange = (value: boolean) => {
    setAutoEvents(value);
    triggerAIAutoSave({ autoEvents: value });
  };

  const handleDefaultToneChange = (value: string) => {
    setDefaultTone(value);
    triggerAIAutoSave({ defaultTone: value });
  };

  const handleEmailNotificationsChange = (value: boolean) => {
    setEmailNotifications(value);
    triggerNotifAutoSave({ emailNotifications: value });
  };

  const handlePushNotificationsChange = (value: boolean) => {
    setPushNotifications(value);
    triggerNotifAutoSave({ pushNotifications: value });
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    triggerSyncAutoSave({ timezone: value });
  };

  const handleSyncFrequencyChange = (value: string) => {
    setSyncFrequency(value);
    triggerSyncAutoSave({ syncFrequency: value });
  };

  // Manual save for text inputs only
  const handleSaveProfile = () => {
    saveAccountSettings({
      displayName,
    });
  };

  // Auto-send settings handlers with debounced save
  const triggerAutoSendSave = useCallback((updates: Partial<{
    autoSendEnabled: boolean;
    autoSendDelayType: 'exact' | 'random';
    autoSendDelayMin: number;
    autoSendDelayMax: number;
    autoSendConfidenceThreshold: number;
    autoSendTimeStart: string;
    autoSendTimeEnd: string;
  }>) => {
    if (!hasInitializedRef.current) return;
    
    if (autoSendSaveTimerRef.current) {
      clearTimeout(autoSendSaveTimerRef.current);
    }
    
    autoSendSaveTimerRef.current = setTimeout(() => {
      saveAutoSendSettings({
        workspaceId,
        ...updates,
      });
    }, 800);
  }, [workspaceId, saveAutoSendSettings]);

  const handleAutoSendToggle = (enabled: boolean) => {
    setAutoSendEnabled(enabled);
    triggerAutoSendSave({ autoSendEnabled: enabled });
  };

  const handleAutoSendDelayTypeChange = (type: 'exact' | 'random') => {
    setAutoSendDelayType(type);
    triggerAutoSendSave({ autoSendDelayType: type });
  };

  const handleAutoSendDelayMinChange = (value: number) => {
    setAutoSendDelayMin(value);
    triggerAutoSendSave({ autoSendDelayMin: value });
  };

  const handleAutoSendDelayMaxChange = (value: number) => {
    setAutoSendDelayMax(value);
    triggerAutoSendSave({ autoSendDelayMax: value });
  };

  const handleAutoSendConfidenceChange = (value: number[]) => {
    const confidence = value[0] / 100;
    setAutoSendConfidenceThreshold(confidence);
    triggerAutoSendSave({ autoSendConfidenceThreshold: confidence });
  };

  const handleAutoSendTimeStartChange = (value: string) => {
    setAutoSendTimeStart(value);
    triggerAutoSendSave({ autoSendTimeStart: value });
  };

  const handleAutoSendTimeEndChange = (value: string) => {
    setAutoSendTimeEnd(value);
    triggerAutoSendSave({ autoSendTimeEnd: value });
  };

  const handlePauseAutoSend = () => {
    pauseAutoSend({ workspaceId });
  };

  const handleResumeAutoSend = () => {
    resumeAutoSend({ workspaceId });
  };

  // Mark as initialized after first data load
  useEffect(() => {
    if (settingsInitialized && !hasInitializedRef.current) {
      // Small delay to ensure state is fully set before enabling auto-save
      setTimeout(() => {
        hasInitializedRef.current = true;
      }, 100);
    }
  }, [settingsInitialized]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (aiSaveTimerRef.current) clearTimeout(aiSaveTimerRef.current);
      if (notifSaveTimerRef.current) clearTimeout(notifSaveTimerRef.current);
      if (syncSaveTimerRef.current) clearTimeout(syncSaveTimerRef.current);
    };
  }, []);

  const handleChangePassword = () => {
    router.push('/update-password');
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ai">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Features
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="account">
              <User className="mr-2 h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="billing">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* AI Features Settings */}
          <TabsContent value="ai" className="space-y-4">
            {/* Plan Badge */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {hasPro ? 'Professional Plan' : 'Basic Plan'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasPro
                        ? 'Full access to all AI features'
                        : 'Upgrade to Pro for AI drafts and auto-responses'}
                    </p>
                  </div>
                </div>
                {!hasPro && (
                  <Button onClick={() => router.push('/settings/billing')} size="sm">
                    Upgrade to Pro
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">AI Classification</CardTitle>
                <CardDescription className="text-base">
                  Configure how AI analyzes and categorizes your messages (Available on all plans)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-classify">Auto-classify messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically classify priority, category, and sentiment for new messages
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{autoClassify ? 'On' : 'Off'}</span>
                    <Switch
                      id="auto-classify"
                      checked={autoClassify}
                      onCheckedChange={handleAutoClassifyChange}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="auto-tasks">Auto-extract events from messages</Label>
                      <Badge variant="outline" className="text-xs">
                        All Plans
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically create calendar events from messages with scheduling intent
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{autoTasks ? 'On' : 'Off'}</span>
                    <Switch
                      id="auto-tasks"
                      checked={autoTasks}
                      onCheckedChange={handleAutoTasksChange}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="auto-events">Deep history search & linking</Label>
                      <Badge variant="outline" className="text-xs">
                        All Plans
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI-powered search across all messages and intelligent conversation linking
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{autoEvents ? 'On' : 'Off'}</span>
                    <Switch
                      id="auto-events"
                      checked={autoEvents}
                      onCheckedChange={handleAutoEventsChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={!hasPro ? 'opacity-60' : ''}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl font-bold">AI Reply Generation</CardTitle>
                      {!hasPro && (
                        <Badge variant="secondary">
                          <Lock className="mr-1 h-3 w-3" />
                          Pro Feature
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-base">
                      AI-powered reply drafts and auto-responses {!hasPro && '(Requires Pro plan)'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="default-tone">Default reply tone</Label>
                    {aiStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <Select
                    value={defaultTone}
                    onValueChange={handleDefaultToneChange}
                    disabled={!hasPro || loadingPro}
                  >
                    <SelectTrigger id="default-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    The default tone used when generating AI replies
                  </p>
                </div>
                {!hasPro && (
                  <div className="rounded-lg border border-muted bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      Upgrade to Professional plan to unlock:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>• AI-powered reply drafts</li>
                      <li>• Multiple tone variations</li>
                      <li>• Auto-send with confidence thresholds</li>
                      <li>• Custom AI prompts</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto-Reply Settings Card */}
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Auto-Reply
                    </CardTitle>
                    <CardDescription className="text-base">
                      Configure automatic reply sending for routine messages
                    </CardDescription>
                  </div>
                  {hasPro && (
                    <Badge variant={autoSendPaused ? 'destructive' : autoSendEnabled ? 'default' : 'secondary'}>
                      {autoSendPaused ? 'Paused' : autoSendEnabled ? 'Active' : 'Disabled'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!hasPro ? (
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                    <Lock className="h-8 w-8 text-primary/50" />
                    <div>
                      <p className="font-medium">Upgrade to Pro for Auto-Reply</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically send AI-drafted replies for routine, low-risk messages
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => router.push('/settings/billing')}
                      >
                        View Plans
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Master Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-send-enabled">Enable Auto-Reply</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically send AI-drafted replies when confidence is high
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {autoSendStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        <span className="text-sm text-muted-foreground">{autoSendEnabled ? 'On' : 'Off'}</span>
                        <Switch
                          id="auto-send-enabled"
                          checked={autoSendEnabled}
                          onCheckedChange={handleAutoSendToggle}
                          disabled={autoSendPaused}
                        />
                      </div>
                    </div>

                    {autoSendEnabled && (
                      <>
                        <Separator />

                        {/* Kill Switch */}
                        {autoSendPaused ? (
                          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <div>
                                  <p className="font-medium text-destructive">Auto-Reply Paused</p>
                                  <p className="text-sm text-muted-foreground">
                                    All pending auto-sends have been cancelled
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResumeAutoSend}
                                disabled={resumeStatus === 'executing'}
                              >
                                {resumeStatus === 'executing' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-1" />
                                    Resume
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <Pause className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Emergency stop: Pause all auto-replies instantly
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handlePauseAutoSend}
                              disabled={pauseStatus === 'executing'}
                            >
                              {pauseStatus === 'executing' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Pause All'
                              )}
                            </Button>
                          </div>
                        )}

                        <Separator />

                        {/* Confidence Threshold */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Confidence Threshold</Label>
                              <p className="text-sm text-muted-foreground">
                                Only auto-send when AI confidence is above this level
                              </p>
                            </div>
                            <span className="text-lg font-bold text-primary">
                              {Math.round(autoSendConfidenceThreshold * 100)}%
                            </span>
                          </div>
                          <Slider
                            value={[autoSendConfidenceThreshold * 100]}
                            onValueChange={handleAutoSendConfidenceChange}
                            min={70}
                            max={95}
                            step={5}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>70% (more auto-sends)</span>
                            <span>95% (only very confident)</span>
                          </div>
                        </div>

                        <Separator />

                        {/* Delay Settings */}
                        <div className="space-y-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Label>Sending Delay</Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Wait before sending to allow review time
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="delay-type" className="text-sm">Delay Mode</Label>
                              <Select value={autoSendDelayType} onValueChange={(v) => handleAutoSendDelayTypeChange(v as 'exact' | 'random')}>
                                <SelectTrigger id="delay-type">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="exact">Fixed delay</SelectItem>
                                  <SelectItem value="random">Random range</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {autoSendDelayType === 'exact' ? (
                              <div className="space-y-2">
                                <Label htmlFor="delay-min" className="text-sm">Delay (minutes)</Label>
                                <Select value={String(autoSendDelayMin)} onValueChange={(v) => handleAutoSendDelayMinChange(Number(v))}>
                                  <SelectTrigger id="delay-min">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[5, 10, 15, 20, 30, 45, 60].map((min) => (
                                      <SelectItem key={min} value={String(min)}>
                                        {min} minutes
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor="delay-min" className="text-sm">Min delay</Label>
                                  <Select value={String(autoSendDelayMin)} onValueChange={(v) => handleAutoSendDelayMinChange(Number(v))}>
                                    <SelectTrigger id="delay-min">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[5, 10, 15, 20, 30].map((min) => (
                                        <SelectItem key={min} value={String(min)}>
                                          {min} min
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}
                          </div>

                          {autoSendDelayType === 'random' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div /> {/* Spacer */}
                              <div className="space-y-2">
                                <Label htmlFor="delay-max" className="text-sm">Max delay</Label>
                                <Select value={String(autoSendDelayMax)} onValueChange={(v) => handleAutoSendDelayMaxChange(Number(v))}>
                                  <SelectTrigger id="delay-max">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[15, 20, 30, 45, 60, 90, 120].filter(max => max > autoSendDelayMin).map((max) => (
                                      <SelectItem key={max} value={String(max)}>
                                        {max} min
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Time Window */}
                        <div className="space-y-4">
                          <div className="space-y-0.5">
                            <Label>Sending Hours</Label>
                            <p className="text-sm text-muted-foreground">
                              Only auto-send during these hours (your timezone)
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="time-start" className="text-sm">Start time</Label>
                              <Input
                                id="time-start"
                                type="time"
                                value={autoSendTimeStart}
                                onChange={(e) => handleAutoSendTimeStartChange(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="time-end" className="text-sm">End time</Label>
                              <Input
                                id="time-end"
                                type="time"
                                value={autoSendTimeEnd}
                                onChange={(e) => handleAutoSendTimeEndChange(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Auto-save notice */}
            <p className="text-xs text-muted-foreground text-right">
              <CheckCircle className="inline h-3 w-3 mr-1" />
              Changes are saved automatically
            </p>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Email Notifications</CardTitle>
                <CardDescription className="text-base">
                  Choose what email notifications you receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notif">Email notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important messages
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {notifStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{emailNotifications ? 'On' : 'Off'}</span>
                    <Switch
                      id="email-notif"
                      checked={emailNotifications}
                      onCheckedChange={handleEmailNotificationsChange}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notif">Push notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications for urgent messages
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {notifStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{pushNotifications ? 'On' : 'Off'}</span>
                    <Switch
                      id="push-notif"
                      checked={pushNotifications}
                      onCheckedChange={handlePushNotificationsChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-save notice */}
            <p className="text-xs text-muted-foreground text-right">
              <CheckCircle className="inline h-3 w-3 mr-1" />
              Changes are saved automatically
            </p>
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Profile Information</CardTitle>
                <CardDescription className="text-base">
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    Contact support to update your email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  onClick={handleChangePassword}
                  title="Change your account password"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
                <p className="text-sm text-muted-foreground">
                  Update your password to keep your account secure
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Preferences</CardTitle>
                <CardDescription className="text-base">
                  Configure your timezone and sync preferences. Your timezone affects calendar events and message timestamps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    {syncStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <Select value={timezone} onValueChange={handleTimezoneChange}>
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone">
                        {getTimezoneLabel(timezone)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {/* Group by region */}
                      {['Australia', 'Americas', 'Europe', 'Asia', 'Pacific', 'Other'].map((region) => (
                        <div key={region}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {region}
                          </div>
                          {TIMEZONE_OPTIONS
                            .filter(tz => tz.region === region)
                            .map(tz => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))
                          }
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {timezone === detectedTimezone ? (
                      <>Auto-detected: {getTimezoneLabel(timezone)}</>
                    ) : (
                      <>Selected: {getTimezoneLabel(timezone)} (Detected: {getTimezoneLabel(detectedTimezone)})</>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sync-frequency">Sync Frequency</Label>
                    {syncStatus === 'executing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <Select value={syncFrequency} onValueChange={handleSyncFrequencyChange}>
                    <SelectTrigger id="sync-frequency">
                      <SelectValue placeholder="Select sync frequency">
                        {syncFrequency === '5' ? 'Every 5 minutes' :
                         syncFrequency === '15' ? 'Every 15 minutes' :
                         syncFrequency === '30' ? 'Every 30 minutes' :
                         syncFrequency === '60' ? 'Every hour' : 'Every 15 minutes'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Every 5 minutes</SelectItem>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How often channels sync new messages
                  </p>
                </div>

                {/* Auto-save notice for preferences */}
                <p className="text-xs text-muted-foreground pt-2">
                  <CheckCircle className="inline h-3 w-3 mr-1" />
                  Preferences are saved automatically
                </p>
              </CardContent>
            </Card>

            {/* Single save button for text inputs (profile) */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveProfile}
                disabled={accountStatus === 'executing' || loading}
                className="shadow-md hover:shadow-lg transition-all h-10 px-6 font-medium bg-primary text-primary-foreground"
              >
                {accountStatus === 'executing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Billing Settings */}
          <TabsContent value="billing" className="space-y-4">
            {billingContent || (
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                      <CreditCard className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Billing Coming Soon</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      Subscription management and billing features are being set up.
                      You'll be able to manage your plan and payment methods here.
                    </p>
                    
                    {/* Roadmap */}
                    <div className="w-full max-w-md text-left bg-muted/50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold mb-3">What's Coming:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Plan upgrades and downgrades
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Payment method management
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Invoice history and downloads
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Usage analytics and quotas
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Team seat management
                        </li>
                      </ul>
                    </div>
                    
                    <Badge variant="secondary">
                      <Sparkles className="mr-1 h-3 w-3" />
                      In Development
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

