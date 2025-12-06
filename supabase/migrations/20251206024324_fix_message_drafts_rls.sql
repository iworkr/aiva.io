-- Fix RLS policy for message_drafts to allow workspace-scoped access
-- The previous policy required auth.uid() = user_id, but AI-generated drafts
-- use the workspace_id as user_id placeholder. We need to allow workspace members
-- to create and view drafts within their workspace.

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their drafts" ON message_drafts;
DROP POLICY IF EXISTS "Users can create drafts" ON message_drafts;
DROP POLICY IF EXISTS "Users can update their drafts" ON message_drafts;
DROP POLICY IF EXISTS "Users can delete their drafts" ON message_drafts;

-- Create new workspace-scoped policies

-- Members can view drafts in their workspace
CREATE POLICY "Workspace members can view drafts"
  ON message_drafts FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Members can create drafts in their workspace  
CREATE POLICY "Workspace members can create drafts"
  ON message_drafts FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Members can update drafts in their workspace
CREATE POLICY "Workspace members can update drafts"
  ON message_drafts FOR UPDATE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Members can delete drafts in their workspace
CREATE POLICY "Workspace members can delete drafts"
  ON message_drafts FOR DELETE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

