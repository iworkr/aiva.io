-- Create frequent_contacts table for frequently met with contacts
CREATE TABLE IF NOT EXISTS frequent_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE frequent_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view frequent contacts in their workspace"
  ON frequent_contacts
  FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create frequent contacts in their workspace"
  ON frequent_contacts
  FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update frequent contacts in their workspace"
  ON frequent_contacts
  FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete frequent contacts in their workspace"
  ON frequent_contacts
  FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Add indexes
CREATE INDEX idx_frequent_contacts_workspace_id ON frequent_contacts(workspace_id);
CREATE INDEX idx_frequent_contacts_user_id ON frequent_contacts(user_id);
CREATE INDEX idx_frequent_contacts_email ON frequent_contacts(email);

-- Add unique constraint for workspace and email
CREATE UNIQUE INDEX idx_frequent_contacts_workspace_email ON frequent_contacts(workspace_id, email);

