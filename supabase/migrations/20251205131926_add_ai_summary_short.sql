-- Migration: Add ai_summary_short column for message list display
-- This column stores a short (max 200 char) AI-generated summary for inbox list view

-- Add ai_summary_short column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_summary_short VARCHAR(200);

-- Add index for faster retrieval (nullable column, so partial index on non-null)
CREATE INDEX IF NOT EXISTS idx_messages_ai_summary_short 
ON messages (workspace_id, ai_summary_short) 
WHERE ai_summary_short IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN messages.ai_summary_short IS 'Short AI-generated summary (max 200 chars) for inbox list display';

