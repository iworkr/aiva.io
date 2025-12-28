-- ============================================================================
-- Add Instant Delay Mode
-- Allows immediate sending for testing purposes
-- ============================================================================

-- Update the CHECK constraint to allow 'instant' as a delay type
ALTER TABLE workspace_settings
DROP CONSTRAINT IF EXISTS workspace_settings_auto_send_delay_type_check;

ALTER TABLE workspace_settings
ADD CONSTRAINT workspace_settings_auto_send_delay_type_check 
CHECK (auto_send_delay_type IN ('exact', 'random', 'instant'));

-- Update comment
COMMENT ON COLUMN workspace_settings.auto_send_delay_type IS 'Delay mode: exact (fixed delay), random (range), or instant (send immediately)';
