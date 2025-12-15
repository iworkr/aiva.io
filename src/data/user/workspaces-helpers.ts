/**
 * Helper functions for workspace operations
 * These can be called from route handlers and other server contexts
 */

"use server";

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { v4 as uuid } from 'uuid';
import { addUserAsWorkspaceOwner, updateWorkspaceMembershipType } from './elevatedQueries';

/**
 * Create a workspace directly (for use in route handlers)
 * Returns the workspace ID
 */
export async function createWorkspaceDirectly(
  userId: string,
  name: string,
  workspaceType: 'solo' | 'team' = 'solo',
  isOnboardingFlow: boolean = false
): Promise<string> {
  const workspaceId = uuid();
  const supabaseClient = await createSupabaseUserServerActionClient();
  
  const { error } = await supabaseClient.from("workspaces").insert({
    id: workspaceId,
    name,
    slug: workspaceId, // Use ID as slug for simplicity
  });

  if (error) {
    throw new Error(error.message);
  }

  await Promise.all([
    addUserAsWorkspaceOwner({ workspaceId, userId }),
    updateWorkspaceMembershipType({
      workspaceId,
      workspaceMembershipType: workspaceType,
    }),
  ]);

  if (isOnboardingFlow) {
    // Set default workspace for the user
    const { error: updateError } = await supabaseClient
      .from("user_settings")
      .update({
        default_workspace: workspaceId,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error setting default workspace", updateError);
      throw new Error(updateError.message);
    }
  }

  return workspaceId;
}

