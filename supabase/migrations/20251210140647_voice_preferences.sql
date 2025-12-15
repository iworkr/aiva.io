-- Voice Preferences Migration
-- Stores user voice preferences for the Voice Aiva feature

-- Create voice_preferences table
CREATE TABLE IF NOT EXISTS voice_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    voice_id TEXT DEFAULT '21m00Tcm4TlvDq8ikWAM', -- Default ElevenLabs voice (Rachel)
    speed DECIMAL(3,2) DEFAULT 1.0 CHECK (speed >= 0.5 AND speed <= 2.0),
    volume DECIMAL(3,2) DEFAULT 1.0 CHECK (volume >= 0.0 AND volume <= 1.0),
    auto_play BOOLEAN DEFAULT true, -- Auto-play voice responses
    enabled BOOLEAN DEFAULT true, -- Voice feature enabled
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voice_preferences_workspace_user 
    ON voice_preferences(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_voice_preferences_user_id 
    ON voice_preferences(user_id);

-- Enable RLS
ALTER TABLE voice_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own preferences in workspaces they belong to
CREATE POLICY "Users can view own voice preferences"
    ON voice_preferences
    FOR SELECT
    USING (
        user_id = auth.uid() AND
        is_workspace_member(auth.uid(), workspace_id)
    );

-- RLS Policy: Users can insert their own preferences
CREATE POLICY "Users can create own voice preferences"
    ON voice_preferences
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_workspace_member(auth.uid(), workspace_id)
    );

-- RLS Policy: Users can update their own preferences
CREATE POLICY "Users can update own voice preferences"
    ON voice_preferences
    FOR UPDATE
    USING (
        user_id = auth.uid() AND
        is_workspace_member(auth.uid(), workspace_id)
    )
    WITH CHECK (
        user_id = auth.uid() AND
        is_workspace_member(auth.uid(), workspace_id)
    );

-- RLS Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own voice preferences"
    ON voice_preferences
    FOR DELETE
    USING (
        user_id = auth.uid() AND
        is_workspace_member(auth.uid(), workspace_id)
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_voice_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voice_preferences_updated_at
    BEFORE UPDATE ON voice_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_preferences_updated_at();

-- Voice conversation logs (optional - for analytics)
CREATE TABLE IF NOT EXISTS voice_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id TEXT, -- WebSocket session identifier
    duration_seconds INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    transcription_text TEXT, -- Combined user inputs
    response_text TEXT, -- Combined assistant responses
    voice_id TEXT, -- Voice used for responses
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for voice_conversations
CREATE INDEX IF NOT EXISTS idx_voice_conversations_workspace 
    ON voice_conversations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_voice_conversations_user 
    ON voice_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_voice_conversations_created 
    ON voice_conversations(created_at DESC);

-- Enable RLS on voice_conversations
ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view conversations in their workspaces
CREATE POLICY "Users can view workspace voice conversations"
    ON voice_conversations
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        (is_workspace_member(auth.uid(), workspace_id) AND 
         is_workspace_admin(auth.uid(), workspace_id))
    );

-- RLS Policy: Users can create their own conversations
CREATE POLICY "Users can create voice conversations"
    ON voice_conversations
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_workspace_member(auth.uid(), workspace_id)
    );

-- RLS Policy: Only the user can delete their own conversations
CREATE POLICY "Users can delete own voice conversations"
    ON voice_conversations
    FOR DELETE
    USING (user_id = auth.uid());

-- Add comment to tables
COMMENT ON TABLE voice_preferences IS 'Stores user preferences for Voice Aiva feature including voice selection and playback settings';
COMMENT ON TABLE voice_conversations IS 'Logs voice conversations for analytics and history';

