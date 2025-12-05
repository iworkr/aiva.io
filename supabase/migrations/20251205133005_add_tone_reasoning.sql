-- Migration: Add tone_reasoning column for AI draft explanations
-- This stores the reasoning behind AI's tone and phrasing choices

-- Add tone_reasoning column to message_drafts table
ALTER TABLE message_drafts ADD COLUMN IF NOT EXISTS tone_reasoning JSONB;

-- Add column for previous interaction context
ALTER TABLE message_drafts ADD COLUMN IF NOT EXISTS context_data JSONB;

-- Add index for querying drafts by tone
CREATE INDEX IF NOT EXISTS idx_message_drafts_tone ON message_drafts(workspace_id, tone);

-- Add comments for documentation
COMMENT ON COLUMN message_drafts.tone_reasoning IS 'JSON containing reasons for AI tone/phrasing choices';
COMMENT ON COLUMN message_drafts.context_data IS 'JSON containing context used for draft generation (interaction history, etc.)';

-- Example tone_reasoning structure:
-- {
--   "tone": "professional",
--   "reasons": [
--     { "factor": "sender_relationship", "description": "First-time interaction", "weight": 0.4 },
--     { "factor": "message_content", "description": "Business inquiry", "weight": 0.35 },
--     { "factor": "context", "description": "Formal request", "weight": 0.25 }
--   ],
--   "previousInteractionCount": 0,
--   "confidenceInTone": 0.85
-- }

