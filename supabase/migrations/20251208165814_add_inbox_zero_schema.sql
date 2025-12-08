-- Inbox Zero Schema
-- Track handled messages and enable the inbox zero experience

-- Add handled_by_aiva columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS handled_by_aiva BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS handle_action TEXT,
ADD COLUMN IF NOT EXISTS archived_in_provider BOOLEAN DEFAULT false;

-- Add comment for handle_action values
COMMENT ON COLUMN messages.handle_action IS 'Values: auto_replied, classified_no_action, manually_dismissed, manually_handled';

-- Create index for efficient querying of handled messages
CREATE INDEX IF NOT EXISTS idx_messages_handled 
ON messages(workspace_id, handled_by_aiva, handled_at) 
WHERE handled_by_aiva = true;

-- Create index for unhandled messages (needs attention)
CREATE INDEX IF NOT EXISTS idx_messages_unhandled 
ON messages(workspace_id, handled_by_aiva, requires_human_review, timestamp DESC) 
WHERE handled_by_aiva = false;

-- Create message_handle_log table for tracking all handle actions
CREATE TABLE IF NOT EXISTS message_handle_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),
    action TEXT NOT NULL,
    provider_action TEXT,
    provider_message_id TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for action values
COMMENT ON COLUMN message_handle_log.action IS 'Values: auto_replied, archived_no_action, manually_handled, restored';
COMMENT ON COLUMN message_handle_log.provider_action IS 'Values: archived, labeled, read, moved, category_applied';

-- Create indexes for message_handle_log
CREATE INDEX IF NOT EXISTS idx_handle_log_workspace ON message_handle_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_handle_log_message ON message_handle_log(message_id);
CREATE INDEX IF NOT EXISTS idx_handle_log_created ON message_handle_log(workspace_id, created_at DESC);

-- Enable RLS on message_handle_log
ALTER TABLE message_handle_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_handle_log
CREATE POLICY "Workspace members can view handle logs"
ON message_handle_log FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can create handle logs"
ON message_handle_log FOR INSERT
WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Create aiva_notifications table for the notification system (separate from existing user_notifications)
CREATE TABLE IF NOT EXISTS aiva_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    sent_push BOOLEAN DEFAULT false,
    sent_email BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for notification type values
COMMENT ON COLUMN aiva_notifications.type IS 'Values: review_needed, high_priority, daily_digest, auto_reply_sent';

-- Create indexes for aiva_notifications
CREATE INDEX IF NOT EXISTS idx_aiva_notifications_user ON aiva_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aiva_notifications_workspace ON aiva_notifications(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aiva_notifications_unread ON aiva_notifications(user_id, read) WHERE read = false;

-- Enable RLS on aiva_notifications
ALTER TABLE aiva_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for aiva_notifications
CREATE POLICY "Users can view own aiva notifications"
ON aiva_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own aiva notifications"
ON aiva_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create aiva notifications"
ON aiva_notifications FOR INSERT
WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Add inbox zero settings to workspace_settings
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS inbox_zero_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_archive_handled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS apply_aiva_label BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_digest_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_digest_time TEXT DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_high_priority BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_review_needed BOOLEAN DEFAULT true;

-- Add comments for inbox zero settings
COMMENT ON COLUMN workspace_settings.inbox_zero_enabled IS 'Master toggle for inbox zero features';
COMMENT ON COLUMN workspace_settings.auto_archive_handled IS 'Automatically archive messages after Aiva handles them';
COMMENT ON COLUMN workspace_settings.apply_aiva_label IS 'Apply "Handled by Aiva" label/category in provider';
COMMENT ON COLUMN workspace_settings.daily_digest_time IS 'Time to send daily digest email (HH:MM format)';

-- Create function to get daily stats for dashboard
CREATE OR REPLACE FUNCTION get_workspace_daily_stats(p_workspace_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    messages_received BIGINT,
    messages_handled BIGINT,
    auto_replies_sent BIGINT,
    review_queue_count BIGINT,
    high_priority_unhandled BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM messages 
         WHERE workspace_id = p_workspace_id 
         AND DATE(timestamp) = p_date) as messages_received,
        
        (SELECT COUNT(*) FROM messages 
         WHERE workspace_id = p_workspace_id 
         AND handled_by_aiva = true 
         AND DATE(handled_at) = p_date) as messages_handled,
        
        (SELECT COUNT(*) FROM auto_send_log 
         WHERE workspace_id = p_workspace_id 
         AND action = 'sent' 
         AND DATE(created_at) = p_date) as auto_replies_sent,
        
        (SELECT COUNT(*) FROM messages 
         WHERE workspace_id = p_workspace_id 
         AND requires_human_review = true 
         AND reviewed_at IS NULL) as review_queue_count,
        
        (SELECT COUNT(*) FROM messages 
         WHERE workspace_id = p_workspace_id 
         AND handled_by_aiva = false 
         AND priority IN ('urgent', 'high')
         AND DATE(timestamp) = p_date) as high_priority_unhandled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

