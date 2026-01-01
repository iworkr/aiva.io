-- =====================================================
-- Workspace Usage Tracking Table
-- Tracks monthly usage per workspace for billing limits
-- =====================================================

-- Create workspace_usage table
CREATE TABLE IF NOT EXISTS public.workspace_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Billing period (monthly)
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- Usage counters
    messages_synced INTEGER NOT NULL DEFAULT 0,
    ai_drafts_generated INTEGER NOT NULL DEFAULT 0,
    auto_sends_count INTEGER NOT NULL DEFAULT 0,
    ai_classifications INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique billing period per workspace
    CONSTRAINT workspace_usage_unique_period UNIQUE (workspace_id, billing_period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace_id ON public.workspace_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_period ON public.workspace_usage(billing_period_start, billing_period_end);

-- Enable RLS
ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role has full access
CREATE POLICY "Service role has full access to workspace_usage"
    ON public.workspace_usage
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Workspace members can view their usage
CREATE POLICY "Workspace members can view their usage"
    ON public.workspace_usage
    FOR SELECT
    USING (is_workspace_member(auth.uid(), workspace_id));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_workspace_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_usage_updated_at
    BEFORE UPDATE ON public.workspace_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_usage_updated_at();

-- =====================================================
-- Function to get or create current billing period
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_current_usage(p_workspace_id UUID)
RETURNS public.workspace_usage AS $$
DECLARE
    v_usage public.workspace_usage;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    -- Calculate current billing period (1st of month to last day of month)
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Try to get existing usage record
    SELECT * INTO v_usage
    FROM public.workspace_usage
    WHERE workspace_id = p_workspace_id
      AND billing_period_start = v_period_start;
    
    -- If not found, create one
    IF NOT FOUND THEN
        INSERT INTO public.workspace_usage (
            workspace_id,
            billing_period_start,
            billing_period_end,
            messages_synced,
            ai_drafts_generated,
            auto_sends_count,
            ai_classifications
        )
        VALUES (
            p_workspace_id,
            v_period_start,
            v_period_end,
            0, 0, 0, 0
        )
        RETURNING * INTO v_usage;
    END IF;
    
    RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to increment usage atomically
-- Returns the new count after increment
-- =====================================================
CREATE OR REPLACE FUNCTION increment_usage(
    p_workspace_id UUID,
    p_usage_type TEXT,
    p_amount INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
    v_period_start DATE;
BEGIN
    -- Calculate current billing period
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- Ensure usage record exists
    PERFORM get_or_create_current_usage(p_workspace_id);
    
    -- Increment the appropriate counter
    CASE p_usage_type
        WHEN 'messages' THEN
            UPDATE public.workspace_usage
            SET messages_synced = messages_synced + p_amount,
                updated_at = NOW()
            WHERE workspace_id = p_workspace_id
              AND billing_period_start = v_period_start
            RETURNING messages_synced INTO v_new_count;
            
        WHEN 'ai_drafts' THEN
            UPDATE public.workspace_usage
            SET ai_drafts_generated = ai_drafts_generated + p_amount,
                updated_at = NOW()
            WHERE workspace_id = p_workspace_id
              AND billing_period_start = v_period_start
            RETURNING ai_drafts_generated INTO v_new_count;
            
        WHEN 'auto_sends' THEN
            UPDATE public.workspace_usage
            SET auto_sends_count = auto_sends_count + p_amount,
                updated_at = NOW()
            WHERE workspace_id = p_workspace_id
              AND billing_period_start = v_period_start
            RETURNING auto_sends_count INTO v_new_count;
            
        WHEN 'ai_classifications' THEN
            UPDATE public.workspace_usage
            SET ai_classifications = ai_classifications + p_amount,
                updated_at = NOW()
            WHERE workspace_id = p_workspace_id
              AND billing_period_start = v_period_start
            RETURNING ai_classifications INTO v_new_count;
            
        ELSE
            RAISE EXCEPTION 'Unknown usage type: %', p_usage_type;
    END CASE;
    
    RETURN COALESCE(v_new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to check if usage is within limits
-- Returns TRUE if within limits, FALSE if exceeded
-- =====================================================
CREATE OR REPLACE FUNCTION check_usage_limit(
    p_workspace_id UUID,
    p_usage_type TEXT,
    p_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_period_start DATE;
BEGIN
    -- If limit is -1, it means unlimited
    IF p_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- Get current usage
    CASE p_usage_type
        WHEN 'messages' THEN
            SELECT COALESCE(messages_synced, 0) INTO v_current_count
            FROM public.workspace_usage
            WHERE workspace_id = p_workspace_id
              AND billing_period_start = v_period_start;
              
        WHEN 'ai_drafts' THEN
            SELECT COALESCE(ai_drafts_generated, 0) INTO v_current_count
            FROM public.workspace_usage
            WHERE workspace_id = p_workspace_id
              AND billing_period_start = v_period_start;
              
        WHEN 'auto_sends' THEN
            SELECT COALESCE(auto_sends_count, 0) INTO v_current_count
            FROM public.workspace_usage
            WHERE workspace_id = p_workspace_id
              AND billing_period_start = v_period_start;
              
        WHEN 'ai_classifications' THEN
            SELECT COALESCE(ai_classifications, 0) INTO v_current_count
            FROM public.workspace_usage
            WHERE workspace_id = p_workspace_id
              AND billing_period_start = v_period_start;
              
        ELSE
            RETURN TRUE; -- Unknown type, allow
    END CASE;
    
    -- If no record found, count is 0
    IF v_current_count IS NULL THEN
        v_current_count := 0;
    END IF;
    
    RETURN v_current_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT SELECT ON TABLE public.workspace_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_current_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT, INTEGER) TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE public.workspace_usage IS 'Tracks monthly usage per workspace for billing limit enforcement';
COMMENT ON COLUMN public.workspace_usage.messages_synced IS 'Number of messages synced this billing period';
COMMENT ON COLUMN public.workspace_usage.ai_drafts_generated IS 'Number of AI drafts generated this billing period';
COMMENT ON COLUMN public.workspace_usage.auto_sends_count IS 'Number of auto-sent replies this billing period';
COMMENT ON COLUMN public.workspace_usage.ai_classifications IS 'Number of AI classifications this billing period';
COMMENT ON FUNCTION get_or_create_current_usage(UUID) IS 'Gets or creates a usage record for the current billing period';
COMMENT ON FUNCTION increment_usage(UUID, TEXT, INTEGER) IS 'Atomically increments a usage counter and returns the new value';
COMMENT ON FUNCTION check_usage_limit(UUID, TEXT, INTEGER) IS 'Checks if current usage is below the given limit';
