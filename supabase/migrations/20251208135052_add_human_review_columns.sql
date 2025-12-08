-- Add human review columns to messages and message_drafts tables
-- This enables the AI to flag messages that need human verification before auto-sending

-- Add columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS review_reason TEXT,
ADD COLUMN IF NOT EXISTS review_context JSONB,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES user_profiles(id);

-- Add columns to message_drafts table
ALTER TABLE message_drafts
ADD COLUMN IF NOT EXISTS hold_for_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS review_reason TEXT,
ADD COLUMN IF NOT EXISTS calendar_context JSONB,
ADD COLUMN IF NOT EXISTS ai_uncertainty_notes TEXT;

-- Create index for efficient querying of messages needing review
CREATE INDEX IF NOT EXISTS idx_messages_requires_review 
ON messages(workspace_id, requires_human_review) 
WHERE requires_human_review = true;

-- Create index for drafts held for review
CREATE INDEX IF NOT EXISTS idx_drafts_hold_review 
ON message_drafts(workspace_id, hold_for_review) 
WHERE hold_for_review = true;

-- Add review_reason enum type suggestions as comments
COMMENT ON COLUMN messages.review_reason IS 'Reason codes: calendar_mismatch, low_confidence, commitment_confirmation, sensitive_topic, personal_relationship, uncertain_context';
COMMENT ON COLUMN message_drafts.review_reason IS 'Reason codes: calendar_mismatch, low_confidence, commitment_confirmation, sensitive_topic, personal_relationship, uncertain_context';

-- Add workspace settings for human review sensitivity
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS human_review_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS human_review_for_scheduling BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS human_review_for_commitments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS human_review_for_sensitive BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS human_review_confidence_threshold NUMERIC(3,2) DEFAULT 0.60;

COMMENT ON COLUMN workspace_settings.human_review_confidence_threshold IS 'Drafts below this confidence are held for review (0.00-1.00)';

