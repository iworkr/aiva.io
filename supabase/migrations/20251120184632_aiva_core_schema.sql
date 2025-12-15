-- Aiva.io Core Schema Migration
-- Creates all tables needed for unified communication platform
-- All tables are workspace-scoped with RLS policies

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Channel provider types
CREATE TYPE channel_provider AS ENUM (
  'gmail',
  'outlook',
  'slack',
  'teams',
  'whatsapp',
  'instagram',
  'facebook_messenger',
  'linkedin'
);

-- Channel connection status
CREATE TYPE channel_connection_status AS ENUM (
  'active',
  'inactive',
  'error',
  'token_expired',
  'revoked'
);

-- Message priority levels
CREATE TYPE message_priority AS ENUM (
  'high',
  'medium',
  'low',
  'noise'
);

-- Message categories
CREATE TYPE message_category AS ENUM (
  'sales_lead',
  'client_support',
  'internal',
  'social',
  'marketing',
  'personal',
  'other'
);

-- Message sentiment
CREATE TYPE message_sentiment AS ENUM (
  'neutral',
  'positive',
  'negative',
  'urgent'
);

-- Message status
CREATE TYPE message_status AS ENUM (
  'unread',
  'read',
  'action_required',
  'waiting_on_others',
  'done',
  'archived'
);

-- Message actionability
CREATE TYPE message_actionability AS ENUM (
  'question',
  'request',
  'fyi',
  'scheduling_intent',
  'task',
  'none'
);

-- Calendar provider types
CREATE TYPE calendar_provider AS ENUM (
  'google_calendar',
  'outlook_calendar',
  'apple_calendar'
);

-- Task status
CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

-- Task priority
CREATE TYPE task_priority AS ENUM (
  'high',
  'medium',
  'low'
);

-- AI action types
CREATE TYPE ai_action_type AS ENUM (
  'classification',
  'summarization',
  'reply_draft',
  'auto_send',
  'task_extraction',
  'scheduling_detection',
  'sentiment_analysis'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Channel Connections
-- Stores OAuth tokens and connection details for communication channels
CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider channel_provider NOT NULL,
  provider_account_id TEXT NOT NULL, -- Email address, Slack user ID, etc.
  provider_account_name TEXT, -- Display name from provider
  access_token TEXT NOT NULL, -- Encrypted in application
  refresh_token TEXT, -- Encrypted in application
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}', -- OAuth scopes granted
  status channel_connection_status DEFAULT 'active' NOT NULL,
  last_sync_at TIMESTAMPTZ,
  sync_cursor TEXT, -- For incremental sync (page tokens, history IDs, etc.)
  metadata JSONB DEFAULT '{}', -- Provider-specific metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, provider, provider_account_id)
);

-- Indexes for channel_connections
CREATE INDEX idx_channel_connections_workspace ON channel_connections(workspace_id);
CREATE INDEX idx_channel_connections_user ON channel_connections(user_id);
CREATE INDEX idx_channel_connections_status ON channel_connections(status);

-- Threads
-- Conversation threads across channels (must be created before messages)
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Thread metadata
  primary_subject TEXT NOT NULL,
  participants JSONB DEFAULT '[]', -- Array of {email, name}
  channels TEXT[] DEFAULT '{}', -- List of channels involved
  
  -- Thread summary
  summary TEXT,
  message_count INT DEFAULT 0,
  
  -- Timing
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  
  -- Status
  is_archived BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for threads
CREATE INDEX idx_threads_workspace ON threads(workspace_id);
CREATE INDEX idx_threads_last_message ON threads(last_message_at DESC);

-- Messages
-- Normalized messages from all channels
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  
  -- Provider identifiers
  provider_message_id TEXT NOT NULL, -- Original message ID from provider
  provider_thread_id TEXT, -- Thread ID from provider
  
  -- Message content
  subject TEXT,
  body TEXT NOT NULL,
  body_html TEXT,
  snippet TEXT, -- Short preview
  
  -- Participants
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipients JSONB DEFAULT '[]', -- Array of {email, name, type: 'to'|'cc'|'bcc'}
  
  -- Metadata
  timestamp TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  labels TEXT[] DEFAULT '{}', -- Provider labels/tags
  attachments JSONB DEFAULT '[]', -- Array of {name, url, type, size}
  
  -- AI Classification
  priority message_priority,
  category message_category,
  sentiment message_sentiment,
  actionability message_actionability,
  status message_status DEFAULT 'unread',
  
  -- AI Analysis
  summary TEXT,
  key_points JSONB DEFAULT '[]', -- Array of extracted key points
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Flags
  has_draft_reply BOOLEAN DEFAULT FALSE,
  auto_sent BOOLEAN DEFAULT FALSE,
  
  -- Raw data
  raw_data JSONB DEFAULT '{}', -- Full original message data
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(channel_connection_id, provider_message_id)
);

-- Indexes for messages
CREATE INDEX idx_messages_workspace ON messages(workspace_id);
CREATE INDEX idx_messages_channel_connection ON messages(channel_connection_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_priority ON messages(priority);
CREATE INDEX idx_messages_sender ON messages(sender_email);
CREATE INDEX idx_messages_unread ON messages(workspace_id, is_read) WHERE is_read = FALSE;

-- Calendar Connections
-- OAuth connections to calendar providers
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider calendar_provider NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_account_email TEXT,
  access_token TEXT NOT NULL, -- Encrypted in application
  refresh_token TEXT, -- Encrypted in application
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  status channel_connection_status DEFAULT 'active' NOT NULL,
  last_sync_at TIMESTAMPTZ,
  sync_cursor TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, provider, provider_account_id)
);

-- Indexes for calendar_connections
CREATE INDEX idx_calendar_connections_workspace ON calendar_connections(workspace_id);
CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_status ON calendar_connections(status);

-- Events
-- Calendar events from all providers
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  calendar_connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  
  -- Provider identifiers
  provider_event_id TEXT NOT NULL,
  provider_calendar_id TEXT,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- Participants
  organizer JSONB, -- {email, name}
  attendees JSONB DEFAULT '[]', -- Array of {email, name, response_status}
  
  -- Status
  status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE format
  
  -- Metadata
  conference_data JSONB, -- Meeting links, dial-in info
  visibility TEXT DEFAULT 'default', -- default, public, private
  
  -- AI detection
  created_from_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Raw data
  raw_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(calendar_connection_id, provider_event_id)
);

-- Indexes for events
CREATE INDEX idx_events_workspace ON events(workspace_id);
CREATE INDEX idx_events_calendar_connection ON events(calendar_connection_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);
CREATE INDEX idx_events_time_range ON events(start_time, end_time);

-- Tasks
-- Extracted tasks from messages
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  
  -- Source
  source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  extracted_by_ai BOOLEAN DEFAULT FALSE,
  
  -- Priority and status
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  
  -- Timing
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Assignment
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  
  -- Integration
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for tasks
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_source_message ON tasks(source_message_id);

-- AI Action Logs
-- Audit trail for all AI operations
CREATE TABLE ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Action details
  action_type ai_action_type NOT NULL,
  input_ref UUID, -- Reference to message, thread, etc.
  output_ref UUID, -- Reference to created resource
  
  -- AI metadata
  model_used TEXT,
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  confidence_score DECIMAL(3,2),
  
  -- Input/Output
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  
  -- Status
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Timing
  processing_time_ms INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for ai_action_logs
CREATE INDEX idx_ai_action_logs_workspace ON ai_action_logs(workspace_id);
CREATE INDEX idx_ai_action_logs_user ON ai_action_logs(user_id);
CREATE INDEX idx_ai_action_logs_type ON ai_action_logs(action_type);
CREATE INDEX idx_ai_action_logs_created ON ai_action_logs(created_at DESC);

-- Message Drafts
-- AI-generated and user-edited draft replies
CREATE TABLE message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Draft content
  body TEXT NOT NULL,
  body_html TEXT,
  
  -- Metadata
  tone TEXT, -- formal, casual, friendly, professional
  generated_by_ai BOOLEAN DEFAULT FALSE,
  edited_by_user BOOLEAN DEFAULT FALSE,
  confidence_score DECIMAL(3,2),
  
  -- Auto-send
  is_auto_sendable BOOLEAN DEFAULT FALSE,
  auto_sent BOOLEAN DEFAULT FALSE,
  auto_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for message_drafts
CREATE INDEX idx_message_drafts_workspace ON message_drafts(workspace_id);
CREATE INDEX idx_message_drafts_message ON message_drafts(message_id);
CREATE INDEX idx_message_drafts_user ON message_drafts(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CHANNEL CONNECTIONS POLICIES
-- ============================================================================

-- Workspace members can view channel connections in their workspace
CREATE POLICY "Workspace members can view channel connections"
  ON channel_connections FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Workspace members can create channel connections
CREATE POLICY "Workspace members can create channel connections"
  ON channel_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    is_workspace_member(auth.uid(), workspace_id) AND
    auth.uid() = user_id
  );

-- Users can update their own channel connections
CREATE POLICY "Users can update their channel connections"
  ON channel_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own channel connections
CREATE POLICY "Users can delete their channel connections"
  ON channel_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Workspace members can view messages
CREATE POLICY "Workspace members can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- System can create messages (via service role)
CREATE POLICY "System can create messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Workspace members can update messages (mark read, status, etc.)
CREATE POLICY "Workspace members can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Workspace admins can delete messages
CREATE POLICY "Workspace admins can delete messages"
  ON messages FOR DELETE
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

-- ============================================================================
-- THREADS POLICIES
-- ============================================================================

-- Workspace members can view threads
CREATE POLICY "Workspace members can view threads"
  ON threads FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Workspace members can create threads
CREATE POLICY "Workspace members can create threads"
  ON threads FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Workspace members can update threads
CREATE POLICY "Workspace members can update threads"
  ON threads FOR UPDATE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- ============================================================================
-- CALENDAR CONNECTIONS POLICIES
-- ============================================================================

-- Workspace members can view calendar connections
CREATE POLICY "Workspace members can view calendar connections"
  ON calendar_connections FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Workspace members can create calendar connections
CREATE POLICY "Workspace members can create calendar connections"
  ON calendar_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    is_workspace_member(auth.uid(), workspace_id) AND
    auth.uid() = user_id
  );

-- Users can update their own calendar connections
CREATE POLICY "Users can update their calendar connections"
  ON calendar_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own calendar connections
CREATE POLICY "Users can delete their calendar connections"
  ON calendar_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- EVENTS POLICIES
-- ============================================================================

-- Workspace members can view events
CREATE POLICY "Workspace members can view events"
  ON events FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- System can create events
CREATE POLICY "System can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Workspace members can update events
CREATE POLICY "Workspace members can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Workspace admins can delete events
CREATE POLICY "Workspace admins can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

-- Workspace members can view tasks in their workspace
CREATE POLICY "Workspace members can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Workspace members can create tasks
CREATE POLICY "Workspace members can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Task owners or assignees can update tasks
CREATE POLICY "Task owners can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    is_workspace_member(auth.uid(), workspace_id) AND
    (auth.uid() = user_id OR auth.uid() = assigned_to)
  )
  WITH CHECK (
    is_workspace_member(auth.uid(), workspace_id) AND
    (auth.uid() = user_id OR auth.uid() = assigned_to)
  );

-- Task owners can delete tasks
CREATE POLICY "Task owners can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- AI ACTION LOGS POLICIES
-- ============================================================================

-- Workspace members can view AI action logs
CREATE POLICY "Workspace members can view AI logs"
  ON ai_action_logs FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- System can create AI action logs
CREATE POLICY "System can create AI logs"
  ON ai_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- ============================================================================
-- MESSAGE DRAFTS POLICIES
-- ============================================================================

-- Users can view their own drafts
CREATE POLICY "Users can view their drafts"
  ON message_drafts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create drafts
CREATE POLICY "Users can create drafts"
  ON message_drafts FOR INSERT
  TO authenticated
  WITH CHECK (
    is_workspace_member(auth.uid(), workspace_id) AND
    auth.uid() = user_id
  );

-- Users can update their own drafts
CREATE POLICY "Users can update their drafts"
  ON message_drafts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete their drafts"
  ON message_drafts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_channel_connections_updated_at
  BEFORE UPDATE ON channel_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_drafts_updated_at
  BEFORE UPDATE ON message_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update thread metadata when messages change
CREATE OR REPLACE FUNCTION update_thread_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE threads
    SET
      message_count = (SELECT COUNT(*) FROM messages WHERE thread_id = NEW.thread_id),
      last_message_at = (SELECT MAX(timestamp) FROM messages WHERE thread_id = NEW.thread_id),
      updated_at = NOW()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_metadata();

CREATE TRIGGER update_thread_on_message_update
  AFTER UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_metadata();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE channel_connections IS 'OAuth connections to communication channels (Gmail, Slack, etc.)';
COMMENT ON TABLE messages IS 'Normalized messages from all connected channels';
COMMENT ON TABLE threads IS 'Conversation threads across multiple channels';
COMMENT ON TABLE calendar_connections IS 'OAuth connections to calendar providers';
COMMENT ON TABLE events IS 'Calendar events from connected calendars';
COMMENT ON TABLE tasks IS 'Tasks extracted from messages or manually created';
COMMENT ON TABLE ai_action_logs IS 'Audit trail for all AI operations';
COMMENT ON TABLE message_drafts IS 'AI-generated and user-edited draft replies';

