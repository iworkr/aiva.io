/**
 * Server Actions for Channel Management
 * Handles connecting/disconnecting communication channels (Gmail, Outlook, Slack, etc.)
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { authActionClient } from '@/lib/safe-action';
import {
  createChannelConnectionSchema,
  updateChannelConnectionSchema,
  disconnectChannelSchema,
  type ChannelProvider,
} from '@/utils/zod-schemas/aiva-schemas';
import { isWorkspaceMember } from '../user/workspaces';

// ============================================================================
// CREATE CHANNEL CONNECTION
// ============================================================================

export const createChannelConnectionAction = authActionClient
  .schema(createChannelConnectionSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const {
      workspaceId,
      provider,
      providerAccountId,
      providerAccountName,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes,
      metadata,
    } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('channel_connections')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      // DB enum for provider may lag behind newly added providers (twitter, telegram), so relax type here.
      .eq('provider' as any, provider as any)
      .eq('provider_account_id', providerAccountId)
      .single();

    if (existing) {
      // Update existing connection instead of creating duplicate
      const { data, error } = await supabase
        .from('channel_connections')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          scopes: scopes,
          status: 'active',
          provider_account_name: providerAccountName,
          metadata: metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update channel connection: ${error.message}`);
      }

      revalidatePath(`/workspace/${workspaceId}/channels`);
      revalidatePath(`/home`);

      return {
        success: true,
        data,
        message: `${provider} reconnected successfully`,
      };
    }

    // Create new connection
    const { data, error } = await supabase
      .from('channel_connections')
      // Cast insert payload to any so newly added providers (twitter, telegram) don't conflict
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        provider,
        provider_account_id: providerAccountId,
        provider_account_name: providerAccountName,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        scopes: scopes,
        status: 'active',
        metadata: metadata,
      } as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create channel connection: ${error.message}`);
    }

    revalidatePath(`/workspace/${workspaceId}/channels`);
    revalidatePath(`/home`);

    return {
      success: true,
      data,
      message: `${provider} connected successfully`,
    };
  });

// ============================================================================
// UPDATE CHANNEL CONNECTION
// ============================================================================

export const updateChannelConnectionAction = authActionClient
  .schema(updateChannelConnectionSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, ...updates } = parsedInput;

    const supabase = await createSupabaseUserServerActionClient();

    // Get the connection to verify ownership and workspace
    const { data: connection, error: fetchError } = await supabase
      .from('channel_connections')
      .select('user_id, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error('Channel connection not found');
    }

    // Verify user owns this connection
    if (connection.user_id !== userId) {
      throw new Error('You do not have permission to update this connection');
    }

    // Update the connection
    const { data, error } = await supabase
      .from('channel_connections')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update channel connection: ${error.message}`);
    }

    revalidatePath(`/workspace/${connection.workspace_id}/channels`);
    revalidatePath(`/home`);

    return {
      success: true,
      data,
      message: 'Channel connection updated successfully',
    };
  });

// ============================================================================
// DISCONNECT CHANNEL
// ============================================================================

export const disconnectChannelAction = authActionClient
  .schema(disconnectChannelSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error('You are not a member of this workspace');
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Get the connection to verify ownership
    const { data: connection, error: fetchError } = await supabase
      .from('channel_connections')
      .select('user_id, provider, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error('Channel connection not found');
    }

    // Verify user owns this connection
    if (connection.user_id !== userId) {
      throw new Error('You do not have permission to disconnect this channel');
    }

    // Update status to revoked instead of deleting (preserve data)
    const { error } = await supabase
      .from('channel_connections')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to disconnect channel: ${error.message}`);
    }

    revalidatePath(`/workspace/${workspaceId}/channels`);
    revalidatePath(`/home`);

    return {
      success: true,
      message: `${connection.provider} disconnected successfully`,
    };
  });

// ============================================================================
// GET USER'S CHANNEL CONNECTIONS
// ============================================================================

export async function getUserChannelConnections(workspaceId: string, userId: string) {
  // Verify workspace membership
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) {
    throw new Error('You are not a member of this workspace');
  }

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .in('status', ['active', 'error', 'token_expired'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch channel connections: ${error.message}`);
  }

  return data;
}

// ============================================================================
// GET WORKSPACE CHANNEL CONNECTIONS (Admin)
// ============================================================================

export async function getWorkspaceChannelConnections(workspaceId: string, userId: string) {
  // Verify workspace membership
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) {
    throw new Error('You are not a member of this workspace');
  }

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('channel_connections')
    .select(
      `
      *,
      user:user_profiles(id, full_name, avatar_url)
    `
    )
    .eq('workspace_id', workspaceId)
    .in('status', ['active', 'error', 'token_expired'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch workspace connections: ${error.message}`);
  }

  return data;
}

// ============================================================================
// GET ACTIVE CONNECTION BY PROVIDER
// ============================================================================

export async function getActiveConnectionByProvider(
  workspaceId: string,
  userId: string,
  provider: ChannelProvider
) {
  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider' as any, provider as any)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" - not an error in this case
    throw new Error(`Failed to fetch connection: ${error.message}`);
  }

  return data;
}

// ============================================================================
// REFRESH TOKEN HELPER
// ============================================================================

export const refreshConnectionTokenAction = authActionClient
  .schema(
    updateChannelConnectionSchema.pick({
      id: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
    })
  )
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { id, accessToken, refreshToken, tokenExpiresAt } = parsedInput;

    const supabase = await createSupabaseUserServerActionClient();

    // Verify ownership
    const { data: connection, error: fetchError } = await supabase
      .from('channel_connections')
      .select('user_id, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || connection.user_id !== userId) {
      throw new Error('Connection not found or access denied');
    }

    // Update token
    const { data, error } = await supabase
      .from('channel_connections')
      .update({
        access_token: accessToken!,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }

    return {
      success: true,
      data,
    };
  });

// ============================================================================
// HELPER: Check if token needs refresh
// ============================================================================

function needsTokenRefresh(tokenExpiresAt: string | null): boolean {
  if (!tokenExpiresAt) return false;

  const expiresAt = new Date(tokenExpiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  return expiresAt <= fiveMinutesFromNow;
}

