-- =====================================================
-- Shopify Stores Table
-- Stores merchant connections from Shopify App installs
-- =====================================================

-- Create shopify_stores table
CREATE TABLE IF NOT EXISTS public.shopify_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Shop identification
    shop_domain TEXT NOT NULL UNIQUE,  -- e.g., "store-name.myshopify.com"
    shop_name TEXT,
    shop_email TEXT,
    shop_owner TEXT,
    
    -- OAuth tokens
    access_token TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    
    -- Shop metadata
    shop_plan TEXT,  -- "basic", "shopify", "advanced", "plus"
    currency TEXT,
    timezone TEXT,
    country_code TEXT,
    
    -- Aiva workspace connection (optional - linked after merchant signs up)
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Installation status
    is_active BOOLEAN DEFAULT true,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    uninstalled_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shopify_stores_shop_domain ON public.shopify_stores(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_workspace ON public.shopify_stores(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopify_stores_active ON public.shopify_stores(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Service role can do everything (for webhooks and OAuth callbacks)
CREATE POLICY "Service role has full access to shopify_stores"
    ON public.shopify_stores
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Users can view their linked stores
CREATE POLICY "Users can view their linked Shopify stores"
    ON public.shopify_stores
    FOR SELECT
    USING (
        linked_user_id = auth.uid()
        OR is_workspace_member(auth.uid(), workspace_id)
    );

-- Users can update their linked stores (e.g., link to workspace)
CREATE POLICY "Users can update their linked Shopify stores"
    ON public.shopify_stores
    FOR UPDATE
    USING (
        linked_user_id = auth.uid()
        OR is_workspace_admin(auth.uid(), workspace_id)
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_shopify_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopify_stores_updated_at
    BEFORE UPDATE ON public.shopify_stores
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_stores_updated_at();

-- =====================================================
-- Shopify Webhooks Log (for GDPR compliance & debugging)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shopify_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT NOT NULL,
    topic TEXT NOT NULL,  -- e.g., "app/uninstalled", "customers/redact"
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_webhook_logs_shop ON public.shopify_webhook_logs(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_webhook_logs_topic ON public.shopify_webhook_logs(topic);

-- Enable RLS (only service role can access)
ALTER TABLE public.shopify_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access webhook logs"
    ON public.shopify_webhook_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.shopify_stores IS 'Stores Shopify merchant connections from app installations';
COMMENT ON COLUMN public.shopify_stores.shop_domain IS 'The myshopify.com domain (unique identifier for shop)';
COMMENT ON COLUMN public.shopify_stores.workspace_id IS 'Linked Aiva workspace (set when merchant connects their Aiva account)';
COMMENT ON COLUMN public.shopify_stores.linked_user_id IS 'The Aiva user who owns/manages this store connection';

COMMENT ON TABLE public.shopify_webhook_logs IS 'Audit log of Shopify webhooks for GDPR compliance';

