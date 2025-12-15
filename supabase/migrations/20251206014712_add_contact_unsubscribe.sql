-- Add unsubscribe fields to contacts table for easy email unsubscription
-- This allows users to mark contacts/senders as unsubscribed to mute notifications

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- Index for filtering unsubscribed contacts efficiently
CREATE INDEX IF NOT EXISTS idx_contacts_unsubscribed 
ON contacts(workspace_id, is_unsubscribed);

-- Comment for documentation
COMMENT ON COLUMN contacts.is_unsubscribed IS 'Whether the user has unsubscribed from this contact (muted notifications/emails)';
COMMENT ON COLUMN contacts.unsubscribed_at IS 'Timestamp when the contact was unsubscribed';

