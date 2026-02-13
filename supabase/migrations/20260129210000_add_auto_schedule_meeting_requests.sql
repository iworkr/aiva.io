-- Allow workspaces to auto-reply and create calendar events for meeting/booking emails when confident
ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS auto_schedule_meeting_requests BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN workspace_settings.auto_schedule_meeting_requests IS 'When true, high-confidence scheduling/booking drafts can auto-send; calendar event is created after send.';
