-- Add is_visible to calendar_connections so users can show/hide calendars in the UI
ALTER TABLE calendar_connections
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN calendar_connections.is_visible IS 'When true, this calendar''s events are shown in the calendar view.';
