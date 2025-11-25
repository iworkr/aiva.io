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
    return { success: true };
  });

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

