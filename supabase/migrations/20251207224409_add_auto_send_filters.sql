-- ============================================================================
-- Auto-Send Smart Filters
-- Adds intelligent filtering settings to prevent inappropriate auto-replies
-- ============================================================================

-- Add inbox type column
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS inbox_type TEXT DEFAULT 'work' 
  CHECK (inbox_type IN ('work', 'personal', 'mixed'));

COMMENT ON COLUMN workspace_settings.inbox_type IS 'Inbox type: work (formal), personal (casual), mixed (context-aware)';

-- Add excluded categories (array of category names to skip)
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS auto_send_excluded_categories TEXT[] 
  DEFAULT ARRAY['marketing', 'newsletter', 'junk_email', 'social', 'notification'];

COMMENT ON COLUMN workspace_settings.auto_send_excluded_categories IS 'Email categories that should not receive auto-replies';

-- Add excluded sender patterns (array of patterns like "noreply@", "mailer-daemon@")
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS auto_send_excluded_senders TEXT[] 
  DEFAULT ARRAY['noreply@', 'no-reply@', 'donotreply@', 'mailer-daemon@', 'postmaster@', 'notifications@', 'alert@', 'system@', 'automated@', 'bounce@', 'newsletter@', 'marketing@'];

COMMENT ON COLUMN workspace_settings.auto_send_excluded_senders IS 'Email patterns that should not receive auto-replies (e.g., noreply@, mailer-daemon@)';

-- Add domain whitelist (if set, only reply to these domains)
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS auto_send_domain_whitelist TEXT[] DEFAULT '{}';

COMMENT ON COLUMN workspace_settings.auto_send_domain_whitelist IS 'If set, only auto-reply to emails from these domains';

-- Add domain blacklist (never reply to these domains)
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS auto_send_domain_blacklist TEXT[] DEFAULT '{}';

COMMENT ON COLUMN workspace_settings.auto_send_domain_blacklist IS 'Never auto-reply to emails from these domains';

-- Add max replies per thread limit
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS auto_send_max_replies_per_thread INTEGER DEFAULT 1;

COMMENT ON COLUMN workspace_settings.auto_send_max_replies_per_thread IS 'Maximum number of auto-replies per conversation thread';

-- Add sender cooldown (minutes between replies to same sender)
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS auto_send_sender_cooldown_minutes INTEGER DEFAULT 60;

COMMENT ON COLUMN workspace_settings.auto_send_sender_cooldown_minutes IS 'Minutes to wait before auto-replying to the same sender again';

-- ============================================================================
-- Add skip_reason to auto_send_log if not exists
-- ============================================================================

-- Note: skip_reason column already exists from the original migration
-- Just ensure it can handle the new filter reasons

-- ============================================================================
-- Create index for faster thread lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_thread_sender 
  ON messages(workspace_id, provider_thread_id, sender_email);

-- ============================================================================
-- Helper comment
-- ============================================================================

COMMENT ON TABLE workspace_settings IS 'Workspace-level settings including AI and auto-send configuration';

