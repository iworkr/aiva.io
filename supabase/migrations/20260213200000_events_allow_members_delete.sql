-- Allow workspace members to delete events (not just admins)
-- Fixes deletes not persisting when the user is a member but not admin

DROP POLICY IF EXISTS "Workspace admins can delete events" ON events;

CREATE POLICY "Workspace members can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
