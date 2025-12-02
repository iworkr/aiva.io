/**
 * SettingsView Component
 * Main settings interface with tabs
 */

'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useAction } from 'next-safe-action/hooks';
import {
  updateAISettingsAction,
  updateNotificationSettingsAction,
  updateAccountSettingsAction,
  updateSyncSettingsAction,
  getWorkspaceSettings,
  getUserProfile,
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
  const [loading, setLoading] = useState(true);
  const [detectedTimezone] = useState(() => detectUserTimezone()); // Store detected timezone
  
  // Check Pro subscription status
  const { hasPro, loading: loadingPro } = useProSubscription(workspaceId);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [rawSettings, profile] = await Promise.all([
          getWorkspaceSettings(workspaceId, userId),
          getUserProfile(userId),
        ]);

        // Type assertion for settings
        const settings = rawSettings as {
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

        // Set sync settings (timezone, sync frequency)
        // Use saved timezone if exists, otherwise keep auto-detected value
        if (settings?.timezone) {
          setTimezone(settings.timezone);
        }
        if (settings?.syncFrequency) {
          setSyncFrequency(String(settings.syncFrequency));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [workspaceId, userId]);

  // AI Settings
  const { execute: saveAISettings, status: aiStatus } = useAction(updateAISettingsAction, {
    onSuccess: () => {
      toast.success('AI settings saved successfully');
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save AI settings');
    },
  });

  // Notification Settings
  const { execute: saveNotificationSettings, status: notifStatus } = useAction(updateNotificationSettingsAction, {
    onSuccess: () => {
      toast.success('Notification settings saved successfully');
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save notification settings');
    },
  });

  // Account Settings
  const { execute: saveAccountSettings, status: accountStatus } = useAction(updateAccountSettingsAction, {
    onSuccess: () => {
      toast.success('Account settings saved successfully');
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save account settings');
    },
  });

  // Sync Settings (Timezone & Sync Frequency)
  const { execute: saveSyncSettings, status: syncStatus } = useAction(updateSyncSettingsAction, {
    onSuccess: () => {
      toast.success('Settings saved successfully');
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save settings');
    },
  });

  const handleSaveAISettings = () => {
    saveAISettings({
      workspaceId,
      autoClassify,
      autoExtractTasks: autoTasks,
      autoCreateEvents: autoEvents,
      defaultReplyTone: defaultTone as any,
    });
  };

  const handleSaveNotificationSettings = () => {
    saveNotificationSettings({
      workspaceId,
      emailNotifications,
      pushNotifications,
    });
  };

  const handleSaveAccountSettings = () => {
    saveAccountSettings({
      displayName,
    });
  };

  const handleSaveSyncSettings = () => {
    saveSyncSettings({
      workspaceId,
      timezone: timezone !== 'utc' ? timezone : undefined,
      syncFrequency: syncFrequency ? Number(syncFrequency) : undefined,
    });
  };

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
              <CardHeader>
                <CardTitle>AI Classification</CardTitle>
                <CardDescription>
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
                    <span className="text-sm text-muted-foreground">{autoClassify ? 'On' : 'Off'}</span>
                    <Switch
                      id="auto-classify"
                      checked={autoClassify}
                      onCheckedChange={setAutoClassify}
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
                    <span className="text-sm text-muted-foreground">{autoTasks ? 'On' : 'Off'}</span>
                    <Switch
                      id="auto-tasks"
                      checked={autoTasks}
                      onCheckedChange={setAutoTasks}
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
                    <span className="text-sm text-muted-foreground">{autoEvents ? 'On' : 'Off'}</span>
                    <Switch
                      id="auto-events"
                      checked={autoEvents}
                      onCheckedChange={setAutoEvents}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={!hasPro ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>AI Reply Generation</CardTitle>
                      {!hasPro && (
                        <Badge variant="secondary">
                          <Lock className="mr-1 h-3 w-3" />
                          Pro Feature
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      AI-powered reply drafts and auto-responses {!hasPro && '(Requires Pro plan)'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default-tone">Default reply tone</Label>
                  <Select
                    value={defaultTone}
                    onValueChange={setDefaultTone}
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

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveAISettings}
                disabled={aiStatus === 'executing' || loading}
                className="shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all h-10 px-6 font-medium"
              >
                {aiStatus === 'executing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save AI Settings'}
              </Button>
            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
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
                    <span className="text-sm text-muted-foreground">{emailNotifications ? 'On' : 'Off'}</span>
                    <Switch
                      id="email-notif"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
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
                    <span className="text-sm text-muted-foreground">{pushNotifications ? 'On' : 'Off'}</span>
                    <Switch
                      id="push-notif"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveNotificationSettings}
                disabled={notifStatus === 'executing' || loading}
                className="shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all h-10 px-6 font-medium"
              >
                {notifStatus === 'executing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Notification Settings'}
              </Button>
            </div>
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
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
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Configure your timezone and sync preferences. Your timezone affects calendar events and message timestamps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
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
                  <Label htmlFor="sync-frequency">Sync Frequency</Label>
                  <Select value={syncFrequency} onValueChange={setSyncFrequency}>
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
                    Current: {syncFrequency === '5' ? 'Every 5 minutes' :
                     syncFrequency === '15' ? 'Every 15 minutes' :
                     syncFrequency === '30' ? 'Every 30 minutes' :
                     syncFrequency === '60' ? 'Every hour' : 'Every 15 minutes'} • How often channels sync new messages
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button 
                onClick={handleSaveAccountSettings}
                disabled={accountStatus === 'executing' || loading}
                variant="outline"
                className="h-10 px-5 border-2 hover:bg-muted/50 transition-all font-medium"
              >
                {accountStatus === 'executing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Profile'}
              </Button>
              <Button 
                onClick={handleSaveSyncSettings}
                disabled={syncStatus === 'executing' || loading}
                className="shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all h-10 px-6 font-medium"
              >
                {syncStatus === 'executing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Preferences'}
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

