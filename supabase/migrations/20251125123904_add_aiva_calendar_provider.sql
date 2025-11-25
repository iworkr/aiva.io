-- Add 'aiva' to calendar_provider enum for default/manual calendars
-- This allows users to create events without connecting external calendar accounts

ALTER TYPE calendar_provider ADD VALUE IF NOT EXISTS 'aiva';

-- Comment on the type
COMMENT ON TYPE calendar_provider IS 'Calendar provider types: google_calendar, outlook_calendar, apple_calendar, aiva (default/manual)';

