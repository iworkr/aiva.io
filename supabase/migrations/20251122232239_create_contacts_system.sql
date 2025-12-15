-- Create contacts table for unified contact profiles
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Contact Information
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  
  -- Profile
  avatar_url TEXT,
  bio TEXT,
  notes TEXT,
  
  -- Metadata
  tags TEXT[], -- e.g., ['client', 'partner', 'team']
  is_favorite BOOLEAN DEFAULT false,
  last_interaction_at TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT contacts_workspace_name_unique UNIQUE (workspace_id, full_name)
);

-- Create contact_channels table for linking contacts to communication channels
CREATE TABLE IF NOT EXISTS contact_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Channel Information
  channel_type TEXT NOT NULL, -- 'instagram', 'whatsapp', 'email', 'gmail', 'outlook', 'slack', 'linkedin', etc.
  channel_id TEXT NOT NULL, -- The unique identifier on that channel (username, email, phone, etc.)
  channel_display_name TEXT, -- Display name on that channel
  
  -- Channel Details
  is_primary BOOLEAN DEFAULT false, -- Primary channel for this type
  is_verified BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT contact_channels_unique UNIQUE (contact_id, channel_type, channel_id)
);

-- Create indexes for performance
CREATE INDEX idx_contacts_workspace_id ON contacts(workspace_id);
CREATE INDEX idx_contacts_full_name ON contacts(full_name);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_favorite ON contacts(is_favorite);
CREATE INDEX idx_contacts_last_interaction ON contacts(last_interaction_at DESC);

CREATE INDEX idx_contact_channels_contact_id ON contact_channels(contact_id);
CREATE INDEX idx_contact_channels_workspace_id ON contact_channels(workspace_id);
CREATE INDEX idx_contact_channels_type ON contact_channels(channel_type);
CREATE INDEX idx_contact_channels_channel_id ON contact_channels(channel_id);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Users can view contacts in their workspace"
  ON contacts
  FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create contacts in their workspace"
  ON contacts
  FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update contacts in their workspace"
  ON contacts
  FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete contacts in their workspace"
  ON contacts
  FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- RLS Policies for contact_channels
CREATE POLICY "Users can view contact channels in their workspace"
  ON contact_channels
  FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create contact channels in their workspace"
  ON contact_channels
  FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update contact channels in their workspace"
  ON contact_channels
  FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete contact channels in their workspace"
  ON contact_channels
  FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Function to update contact's last_interaction_at and interaction_count
CREATE OR REPLACE FUNCTION update_contact_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET 
    last_interaction_at = NEW.last_message_at,
    interaction_count = interaction_count + 1,
    updated_at = NOW()
  WHERE id = NEW.contact_id
    AND (last_interaction_at IS NULL OR last_interaction_at < NEW.last_message_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update contact interaction stats when channel receives a message
CREATE TRIGGER trigger_update_contact_interaction
  AFTER INSERT OR UPDATE OF last_message_at ON contact_channels
  FOR EACH ROW
  WHEN (NEW.last_message_at IS NOT NULL)
  EXECUTE FUNCTION update_contact_interaction();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contacts updated_at
CREATE TRIGGER trigger_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

-- Trigger for contact_channels updated_at
CREATE TRIGGER trigger_contact_channels_updated_at
  BEFORE UPDATE ON contact_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

