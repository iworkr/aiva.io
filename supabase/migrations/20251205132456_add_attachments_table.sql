-- Migration: Add attachments table for tracking message attachments
-- This enables the contextual reference engine to find relevant files

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_connection_id UUID REFERENCES channel_connections(id) ON DELETE SET NULL,
  
  -- Provider info
  provider_attachment_id TEXT,
  
  -- File metadata
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  
  -- Content info
  content_preview TEXT, -- First ~500 chars of text content for search
  content_type TEXT, -- 'document', 'image', 'spreadsheet', 'presentation', 'pdf', 'other'
  
  -- Extracted metadata
  extracted_title TEXT, -- Title extracted from document
  extracted_summary TEXT, -- AI-generated summary
  keywords TEXT[], -- Extracted keywords for search
  
  -- Download info
  download_url TEXT, -- Temporary download URL (may expire)
  is_downloaded BOOLEAN DEFAULT FALSE,
  local_path TEXT, -- Path if downloaded locally
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view attachments in their workspaces" ON attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = attachments.workspace_id
      AND wm.workspace_member_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments in their workspaces" ON attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = attachments.workspace_id
      AND wm.workspace_member_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attachments in their workspaces" ON attachments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = attachments.workspace_id
      AND wm.workspace_member_id = auth.uid()
    )
  );

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_attachments_workspace ON attachments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_filename ON attachments(workspace_id, filename);
CREATE INDEX IF NOT EXISTS idx_attachments_content_type ON attachments(workspace_id, content_type);
CREATE INDEX IF NOT EXISTS idx_attachments_keywords ON attachments USING GIN(keywords);

-- Full-text search index for content preview
CREATE INDEX IF NOT EXISTS idx_attachments_content_search 
ON attachments USING GIN(to_tsvector('english', COALESCE(filename, '') || ' ' || COALESCE(extracted_title, '') || ' ' || COALESCE(content_preview, '')));

-- Add comments
COMMENT ON TABLE attachments IS 'Tracks message attachments for contextual reference engine';
COMMENT ON COLUMN attachments.content_preview IS 'First ~500 chars of text content for quick search';
COMMENT ON COLUMN attachments.keywords IS 'Extracted keywords for efficient reference matching';

