/**
 * Settings Server Actions
 * Handles workspace and user settings updates
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { isWorkspaceMember } from './workspaces';
import { getWorkspacePlanType } from '@/rsc-data/user/subscriptions';
import { getEffectiveSyncFrequency, PLAN_SYNC_LIMITS } from '@/utils/subscriptions';

// ============================================================================
// SCHEMAS
// ============================================================================

const updateAISettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  autoClassify: z.boolean().optional(),
  autoExtractTasks: z.boolean().optional(),
  autoCreateEvents: z.boolean().optional(),
  defaultReplyTone: z.enum(['formal', 'professional', 'friendly', 'casual']).optional(),
});

const updateNotificationSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

const updateAccountSettingsSchema = z.object({
  displayName: z.string().min(1).optional(),
});

const updateWorkspaceSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceName: z.string().min(1).optional(),
  timezone: z.string().optional(),
  syncFrequency: z.number().optional(),
});

const updateSyncSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  timezone: z.string().optional(),
  syncFrequency: z.number().optional(),
});

// Auto-Send Settings Schemas
const updateAutoSendSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  autoSendEnabled: z.boolean().optional(),
  autoSendDelayType: z.enum(['exact', 'random']).optional(),
  autoSendDelayMin: z.number().min(1).max(120).optional(),
  autoSendDelayMax: z.number().min(1).max(120).optional(),
  autoSendConfidenceThreshold: z.number().min(0.50).max(0.95).optional(), // Lowered to 50%
  autoSendTimeStart: z.string().optional(), // "HH:MM" format
  autoSendTimeEnd: z.string().optional(),   // "HH:MM" format
});

const pauseAutoSendSchema = z.object({
  workspaceId: z.string().uuid(),
});

const cancelScheduledSendSchema = z.object({
  workspaceId: z.string().uuid(),
  queueId: z.string().uuid(),
});

// ============================================================================
// AI SETTINGS
// ============================================================================

export const updateAISettingsAction = authActionClient
  .schema(updateAISettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...settings } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Get existing workspace settings
    const { data: existing } = await supabase
      .from('workspace_settings')
      .select('workspace_settings')
      .eq('workspace_id', workspaceId)
      .single();

    const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;

    // Update AI settings
    const updatedSettings = {
      ...currentSettings,
      ai: {
        ...((currentSettings.ai as Record<string, any>) || {}),
        autoClassify: settings.autoClassify,
        autoExtractTasks: settings.autoExtractTasks,
        autoCreateEvents: settings.autoCreateEvents,
        defaultReplyTone: settings.defaultReplyTone,
      },
    };

    // Remove undefined values
    Object.keys(updatedSettings.ai).forEach((key) => {
      if ((updatedSettings.ai as Record<string, any>)[key] === undefined) {
        delete (updatedSettings.ai as Record<string, any>)[key];
      }
    });

    const { error } = await supabase
      .from('workspace_settings')
      .upsert({
        workspace_id: workspaceId,
        workspace_settings: updatedSettings,
      });

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

export const updateNotificationSettingsAction = authActionClient
  .schema(updateNotificationSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...settings } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Get existing workspace settings
    const { data: existing } = await supabase
      .from('workspace_settings')
      .select('workspace_settings')
      .eq('workspace_id', workspaceId)
      .single();

    const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;

    // Update notification settings
    const updatedSettings = {
      ...currentSettings,
      notifications: {
        ...((currentSettings.notifications as Record<string, any>) || {}),
        email: settings.emailNotifications,
        push: settings.pushNotifications,
      },
    };

    // Remove undefined values
    Object.keys(updatedSettings.notifications).forEach((key) => {
      if ((updatedSettings.notifications as Record<string, any>)[key] === undefined) {
        delete (updatedSettings.notifications as Record<string, any>)[key];
      }
    });

    const { error } = await supabase
      .from('workspace_settings')
      .upsert({
        workspace_id: workspaceId,
        workspace_settings: updatedSettings,
      });

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// ACCOUNT SETTINGS
// ============================================================================

export const updateAccountSettingsAction = authActionClient
  .schema(updateAccountSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { displayName } = parsedInput;

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: displayName,
      })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// WORKSPACE SETTINGS
// ============================================================================

export const updateWorkspaceSettingsAction = authActionClient
  .schema(updateWorkspaceSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, workspaceName, timezone, syncFrequency } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Update workspace name if provided
    if (workspaceName) {
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .update({ name: workspaceName })
        .eq('id', workspaceId);

      if (workspaceError) throw new Error(workspaceError.message);
    }

    // Update workspace settings (timezone, sync frequency)
    if (timezone !== undefined || syncFrequency !== undefined) {
      const { data: existing } = await supabase
        .from('workspace_settings')
        .select('workspace_settings')
        .eq('workspace_id', workspaceId)
        .single();

      const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;

      const updatedSettings = {
        ...currentSettings,
        timezone: timezone !== undefined ? timezone : currentSettings.timezone,
        syncFrequency: syncFrequency !== undefined ? syncFrequency : currentSettings.syncFrequency,
      };

      const { error: settingsError } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          workspace_settings: updatedSettings,
        });

      if (settingsError) throw new Error(settingsError.message);
    }

    revalidatePath(`/settings`);
    revalidatePath(`/workspace/${workspaceId}`);
    return { success: true };
  });

// ============================================================================
// SYNC SETTINGS (Timezone & Sync Frequency - No Workspace Name)
// ============================================================================

export const updateSyncSettingsAction = authActionClient
  .schema(updateSyncSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, timezone, syncFrequency } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Update workspace settings (timezone, sync frequency)
    if (timezone !== undefined || syncFrequency !== undefined) {
      const { data: existing } = await supabase
        .from('workspace_settings')
        .select('workspace_settings')
        .eq('workspace_id', workspaceId)
        .single();

      const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;

      // Validate and enforce sync frequency based on plan
      let effectiveSyncFrequency = currentSettings.syncFrequency;
      if (syncFrequency !== undefined) {
        // Get workspace plan type to enforce sync limits
        const planType = await getWorkspacePlanType(workspaceId);
        const planLimits = PLAN_SYNC_LIMITS[planType];
        
        // Enforce minimum sync frequency for the plan
        effectiveSyncFrequency = getEffectiveSyncFrequency(planType, syncFrequency);
        
        // If user tried to set a faster frequency than allowed, inform them
        if (syncFrequency < planLimits.minSyncIntervalMinutes) {
          console.log(`Sync frequency ${syncFrequency} mins adjusted to ${effectiveSyncFrequency} mins for ${planType} plan`);
        }
      }

      const updatedSettings = {
        ...currentSettings,
        timezone: timezone !== undefined ? timezone : currentSettings.timezone,
        syncFrequency: effectiveSyncFrequency,
      };

      const { error: settingsError } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          workspace_settings: updatedSettings,
        });

      if (settingsError) throw new Error(settingsError.message);
    }

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// AUTO-SEND SETTINGS
// ============================================================================

export const updateAutoSendSettingsAction = authActionClient
  .schema(updateAutoSendSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...settings } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    
    if (settings.autoSendEnabled !== undefined) {
      updateData.auto_send_enabled = settings.autoSendEnabled;
    }
    if (settings.autoSendDelayType !== undefined) {
      updateData.auto_send_delay_type = settings.autoSendDelayType;
    }
    if (settings.autoSendDelayMin !== undefined) {
      updateData.auto_send_delay_min = settings.autoSendDelayMin;
    }
    if (settings.autoSendDelayMax !== undefined) {
      updateData.auto_send_delay_max = settings.autoSendDelayMax;
    }
    if (settings.autoSendConfidenceThreshold !== undefined) {
      updateData.auto_send_confidence_threshold = settings.autoSendConfidenceThreshold;
    }
    if (settings.autoSendTimeStart !== undefined) {
      updateData.auto_send_time_start = settings.autoSendTimeStart;
    }
    if (settings.autoSendTimeEnd !== undefined) {
      updateData.auto_send_time_end = settings.autoSendTimeEnd;
    }

    // If enabling, ensure paused is false
    if (settings.autoSendEnabled === true) {
      updateData.auto_send_paused = false;
      updateData.auto_send_paused_at = null;
    }

    const { error } = await supabase
      .from('workspace_settings')
      .update(updateData)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

export const pauseAutoSendAction = authActionClient
  .schema(pauseAutoSendSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Set paused flag
    const { error: settingsError } = await supabase
      .from('workspace_settings')
      .update({
        auto_send_paused: true,
        auto_send_paused_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId);

    if (settingsError) throw new Error(settingsError.message);

    // Cancel all pending items in queue
    const { error: queueError } = await supabase
      .from('auto_send_queue')
      .update({ status: 'cancelled' })
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending');

    if (queueError) {
      console.error('Failed to cancel queued items:', queueError);
    }

    // Log the pause action
    await supabase.from('auto_send_log').insert({
      workspace_id: workspaceId,
      action: 'paused',
      details: { reason: 'manual_kill_switch' },
    });

    revalidatePath(`/settings`);
    return { success: true, paused: true };
  });

export const resumeAutoSendAction = authActionClient
  .schema(pauseAutoSendSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('workspace_settings')
      .update({
        auto_send_paused: false,
        auto_send_paused_at: null,
      })
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true, paused: false };
  });

export const cancelScheduledSendAction = authActionClient
  .schema(cancelScheduledSendSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, queueId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Get the queue item to log details
    const { data: queueItem } = await supabase
      .from('auto_send_queue')
      .select('message_id, draft_id, confidence_score')
      .eq('id', queueId)
      .eq('workspace_id', workspaceId)
      .single();

    // Update status to cancelled
    const { error } = await supabase
      .from('auto_send_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending'); // Only cancel if still pending

    if (error) throw new Error(error.message);

    // Log the cancellation
    if (queueItem) {
      await supabase.from('auto_send_log').insert({
        workspace_id: workspaceId,
        queue_id: queueId,
        message_id: queueItem.message_id,
        draft_id: queueItem.draft_id,
        action: 'cancelled',
        confidence_score: queueItem.confidence_score,
        details: { reason: 'user_cancelled' },
      });
    }

    revalidatePath(`/settings`);
    return { success: true };
  });

// Get auto-send queue for a workspace
export async function getAutoSendQueue(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('auto_send_queue')
    .select(`
      *,
      message:messages(subject, sender_email, sender_name),
      draft:message_drafts(body)
    `)
    .eq('workspace_id', workspaceId)
    .order('scheduled_send_at', { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  return data || [];
}

// Get auto-send settings for a workspace
export async function getAutoSendSettings(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('workspace_settings')
    .select(`
      auto_send_enabled,
      auto_send_delay_type,
      auto_send_delay_min,
      auto_send_delay_max,
      auto_send_confidence_threshold,
      auto_send_time_start,
      auto_send_time_end,
      auto_send_paused,
      auto_send_paused_at
    `)
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  // Return defaults if no settings found
  return {
    autoSendEnabled: data?.auto_send_enabled ?? false,
    autoSendDelayType: data?.auto_send_delay_type ?? 'random',
    autoSendDelayMin: data?.auto_send_delay_min ?? 10,
    autoSendDelayMax: data?.auto_send_delay_max ?? 30,
    autoSendConfidenceThreshold: data?.auto_send_confidence_threshold ?? 0.85,
    autoSendTimeStart: data?.auto_send_time_start ?? '09:00',
    autoSendTimeEnd: data?.auto_send_time_end ?? '21:00',
    autoSendPaused: data?.auto_send_paused ?? false,
    autoSendPausedAt: data?.auto_send_paused_at,
  };
}

// Get recent auto-send log entries
export async function getAutoSendLog(workspaceId: string, userId: string, limit = 20) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('auto_send_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// GET SETTINGS
// ============================================================================

export async function getWorkspaceSettings(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('workspace_settings')
    .select('workspace_settings')
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" - that's okay, return defaults
    throw new Error(error.message);
  }

  return data?.workspace_settings || {};
}

export async function getUserProfile(userId: string) {
  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getWorkspace(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

