-- Migration: Add sync tracking columns for automatic background sync
-- This migration adds columns to track sync timing for tiered syncing based on subscription plans

-- Add sync tracking columns to channel_connections
ALTER TABLE channel_connections 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS webhook_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS webhook_expires_at TIMESTAMP WITH TIME ZONE;

-- Add sync frequency to workspace_settings if not exists
-- Note: This is stored in the JSONB workspace_settings column, but we can add a dedicated column for faster queries
ALTER TABLE workspace_settings 
ADD COLUMN IF NOT EXISTS sync_frequency_minutes INTEGER DEFAULT 15;

-- Create index for efficient sync job queries
CREATE INDEX IF NOT EXISTS idx_channel_connections_sync 
ON channel_connections (last_sync_at, status) 
WHERE status = 'active';

-- Create index for webhook renewal queries
CREATE INDEX IF NOT EXISTS idx_channel_connections_webhook 
ON channel_connections (webhook_expires_at) 
WHERE webhook_enabled = TRUE;

-- Update existing connections to have default last_sync_at
UPDATE channel_connections 
SET last_sync_at = COALESCE(updated_at, created_at)
WHERE last_sync_at IS NULL AND status = 'active';

-- Comment describing the sync tiers
COMMENT ON COLUMN channel_connections.last_sync_at IS 'Timestamp of last successful sync. Used by cron jobs to determine if workspace should be synced.';
COMMENT ON COLUMN channel_connections.next_sync_at IS 'Calculated next sync time based on plan and frequency settings.';
COMMENT ON COLUMN channel_connections.webhook_enabled IS 'Whether real-time webhooks are enabled (Pro/Enterprise only).';
COMMENT ON COLUMN channel_connections.webhook_subscription_id IS 'External webhook subscription ID (Gmail watch ID or Outlook subscription ID).';
COMMENT ON COLUMN channel_connections.webhook_expires_at IS 'Webhook subscription expiration time. Cron job renews before expiration.';
COMMENT ON COLUMN workspace_settings.sync_frequency_minutes IS 'User-configured sync frequency in minutes. Minimum enforced by plan.';

