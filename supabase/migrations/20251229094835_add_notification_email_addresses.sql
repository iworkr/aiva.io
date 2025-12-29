-- ============================================================================
-- Add Notification Email Addresses
-- Allows users to specify multiple email addresses for notifications and daily digest
-- ============================================================================
-- Add email address arrays for notifications and daily digest
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS notification_email_addresses TEXT [] DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS daily_digest_email_addresses TEXT [] DEFAULT NULL;
-- Add comments
COMMENT ON COLUMN workspace_settings.notification_email_addresses IS 'Array of email addresses to receive email notifications (review needed, high priority, etc.). If null, uses user account email.';
COMMENT ON COLUMN workspace_settings.daily_digest_email_addresses IS 'Array of email addresses to receive daily digest emails. If null, uses user account email.';