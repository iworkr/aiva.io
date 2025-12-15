-- ============================================================================
-- Auto-Send System
-- Adds settings, queue table, and audit log for automatic email replies
-- ============================================================================

-- Add auto-send settings columns to workspace_settings
ALTER TABLE workspace_settings
ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_send_delay_type TEXT DEFAULT 'random' CHECK (auto_send_delay_type IN ('exact', 'random')),
ADD COLUMN IF NOT EXISTS auto_send_delay_min INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS auto_send_delay_max INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_send_confidence_threshold DECIMAL(3,2) DEFAULT 0.85,
ADD COLUMN IF NOT EXISTS auto_send_time_start TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS auto_send_time_end TIME DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS auto_send_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_send_paused_at TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN workspace_settings.auto_send_enabled IS 'Master toggle for auto-send feature';
COMMENT ON COLUMN workspace_settings.auto_send_delay_type IS 'Delay mode: exact (fixed delay) or random (range)';
COMMENT ON COLUMN workspace_settings.auto_send_delay_min IS 'Minimum delay in minutes before auto-sending';
COMMENT ON COLUMN workspace_settings.auto_send_delay_max IS 'Maximum delay in minutes (used with random mode)';
COMMENT ON COLUMN workspace_settings.auto_send_confidence_threshold IS 'Minimum AI confidence score required for auto-send (0.70-0.95)';
COMMENT ON COLUMN workspace_settings.auto_send_time_start IS 'Start of allowed sending window (e.g., 09:00)';
COMMENT ON COLUMN workspace_settings.auto_send_time_end IS 'End of allowed sending window (e.g., 21:00)';
COMMENT ON COLUMN workspace_settings.auto_send_paused IS 'Emergency kill switch - pauses all auto-sends';
COMMENT ON COLUMN workspace_settings.auto_send_paused_at IS 'Timestamp when auto-send was paused';

-- Create auto_send_queue table for scheduled sends
CREATE TABLE IF NOT EXISTS auto_send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  draft_id UUID NOT NULL REFERENCES message_drafts(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Result
  sent_at TIMESTAMPTZ,
  sent_message_id TEXT, -- Provider's message ID after sending
  
  -- Metadata
  confidence_score DECIMAL(3,2),
  delay_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_auto_send_queue_pending 
ON auto_send_queue(scheduled_send_at, status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_auto_send_queue_workspace 
ON auto_send_queue(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_send_queue_message 
ON auto_send_queue(message_id);

-- Add comments
COMMENT ON TABLE auto_send_queue IS 'Queue of scheduled auto-send messages waiting to be sent';
COMMENT ON COLUMN auto_send_queue.scheduled_send_at IS 'When the message should be sent';
COMMENT ON COLUMN auto_send_queue.status IS 'pending: waiting, processing: being sent, sent: completed, failed: error, cancelled: user cancelled';
COMMENT ON COLUMN auto_send_queue.sent_message_id IS 'Provider message ID returned after successful send';

-- Create auto_send_log table for audit trail
CREATE TABLE IF NOT EXISTS auto_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  draft_id UUID REFERENCES message_drafts(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES auto_send_queue(id) ON DELETE SET NULL,
  
  -- Action tracking
  action TEXT NOT NULL CHECK (action IN ('queued', 'sent', 'cancelled', 'failed', 'paused', 'skipped')),
  
  -- Details
  confidence_score DECIMAL(3,2),
  delay_used INTEGER,
  recipient_email TEXT,
  subject TEXT,
  
  -- Error/skip info
  error_message TEXT,
  skip_reason TEXT,
  
  -- Metadata
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for log queries
CREATE INDEX IF NOT EXISTS idx_auto_send_log_workspace 
ON auto_send_log(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_send_log_action 
ON auto_send_log(action, created_at DESC);

-- Add comments
COMMENT ON TABLE auto_send_log IS 'Audit log of all auto-send actions for transparency';
COMMENT ON COLUMN auto_send_log.action IS 'queued: added to queue, sent: successfully sent, cancelled: user cancelled, failed: error occurred, paused: skipped due to pause, skipped: skipped due to rules';

-- Enable RLS on new tables
ALTER TABLE auto_send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_send_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for auto_send_queue
CREATE POLICY "Workspace members can view auto-send queue"
ON auto_send_queue FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Workspace members can manage auto-send queue"
ON auto_send_queue FOR ALL
TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
);

-- RLS policies for auto_send_log
CREATE POLICY "Workspace members can view auto-send log"
ON auto_send_log FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Workspace members can insert auto-send log"
ON auto_send_log FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
);

-- Create updated_at trigger for auto_send_queue
CREATE OR REPLACE FUNCTION update_auto_send_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_send_queue_updated_at ON auto_send_queue;
CREATE TRIGGER auto_send_queue_updated_at
  BEFORE UPDATE ON auto_send_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_send_queue_updated_at();

