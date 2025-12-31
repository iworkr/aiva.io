-- =====================================================
-- Entitlements Table
-- Single source of truth for subscription/plan status
-- Supports both Shopify and Stripe billing providers
-- =====================================================

-- Create entitlement status enum
DO $$ BEGIN
    CREATE TYPE entitlement_status AS ENUM ('active', 'trialing', 'past_due', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create entitlement provider enum
DO $$ BEGIN
    CREATE TYPE entitlement_provider AS ENUM ('shopify', 'stripe');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create plan type enum (matches existing PlanType in subscriptions.ts)
DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('free', 'basic', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Entitlements table (single source of truth)
CREATE TABLE IF NOT EXISTS public.entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identifiers (at least one must be set)
    shop_domain TEXT UNIQUE,  -- For Shopify shops (e.g., "store.myshopify.com")
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    
    -- Plan and status
    plan plan_type NOT NULL DEFAULT 'free',
    provider entitlement_provider NOT NULL,
    status entitlement_status NOT NULL DEFAULT 'active',
    
    -- Provider-specific data
    provider_subscription_id TEXT,  -- Shopify GID (gid://shopify/AppSubscription/123) or Stripe sub_id
    current_period_end TIMESTAMPTZ,
    
    -- Trial tracking
    trial_ends_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure at least one identifier is set
    CONSTRAINT entitlements_has_identifier CHECK (
        shop_domain IS NOT NULL OR workspace_id IS NOT NULL
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entitlements_shop_domain ON public.entitlements(shop_domain) WHERE shop_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entitlements_workspace_id ON public.entitlements(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entitlements_provider ON public.entitlements(provider);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON public.entitlements(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_plan ON public.entitlements(plan);

-- Enable RLS
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Service role has full access (for webhooks and backend operations)
CREATE POLICY "Service role has full access to entitlements"
    ON public.entitlements
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Users can view entitlements for their workspaces
CREATE POLICY "Users can view their workspace entitlements"
    ON public.entitlements
    FOR SELECT
    USING (
        workspace_id IS NOT NULL 
        AND is_workspace_member(auth.uid(), workspace_id)
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entitlements_updated_at
    BEFORE UPDATE ON public.entitlements
    FOR EACH ROW
    EXECUTE FUNCTION update_entitlements_updated_at();

-- =====================================================
-- Shopify Billing Plans Table
-- Maps internal plans to Shopify pricing
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shopify_billing_plans (
    plan plan_type PRIMARY KEY,
    
    -- Monthly pricing
    shopify_plan_name_monthly TEXT NOT NULL,
    shopify_amount_monthly DECIMAL(10, 2) NOT NULL,
    
    -- Annual pricing (optional)
    shopify_plan_name_annual TEXT,
    shopify_amount_annual DECIMAL(10, 2),
    
    -- Stripe price IDs for reference/comparison
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,
    
    -- Trial days
    trial_days INTEGER DEFAULT 14,
    
    -- Display order
    display_order INTEGER DEFAULT 0,
    
    -- Whether this plan is available for new subscriptions
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Only allow paid plans in this table
    CONSTRAINT shopify_billing_plans_no_free CHECK (plan != 'free')
);

-- Enable RLS
ALTER TABLE public.shopify_billing_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view plans (for pricing display)
CREATE POLICY "Everyone can view shopify billing plans"
    ON public.shopify_billing_plans
    FOR SELECT
    USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_shopify_billing_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopify_billing_plans_updated_at
    BEFORE UPDATE ON public.shopify_billing_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_billing_plans_updated_at();

-- =====================================================
-- Seed Shopify Billing Plans (with ~20% markup)
-- =====================================================

INSERT INTO public.shopify_billing_plans (plan, shopify_plan_name_monthly, shopify_amount_monthly, shopify_plan_name_annual, shopify_amount_annual, trial_days, display_order, is_active)
VALUES
    ('basic', 'Aiva Basic', 35.00, 'Aiva Basic Annual', 350.00, 14, 1, true),
    ('pro', 'Aiva Professional', 95.00, 'Aiva Professional Annual', 950.00, 14, 2, true),
    ('enterprise', 'Aiva Enterprise', 239.00, 'Aiva Enterprise Annual', 2390.00, 14, 3, true)
ON CONFLICT (plan) DO UPDATE SET
    shopify_plan_name_monthly = EXCLUDED.shopify_plan_name_monthly,
    shopify_amount_monthly = EXCLUDED.shopify_amount_monthly,
    shopify_plan_name_annual = EXCLUDED.shopify_plan_name_annual,
    shopify_amount_annual = EXCLUDED.shopify_amount_annual,
    trial_days = EXCLUDED.trial_days,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;

-- =====================================================
-- Billing Events Audit Log
-- For debugging and compliance
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    event_type TEXT NOT NULL,  -- e.g., 'subscription_created', 'subscription_updated', 'webhook_received'
    provider entitlement_provider NOT NULL,
    
    -- Related entities
    shop_domain TEXT,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    entitlement_id UUID REFERENCES public.entitlements(id) ON DELETE SET NULL,
    
    -- Event data
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Idempotency
    idempotency_key TEXT UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_events_shop_domain ON public.billing_events(shop_domain) WHERE shop_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_events_workspace_id ON public.billing_events(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON public.billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_provider ON public.billing_events(provider);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON public.billing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_idempotency_key ON public.billing_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access (for backend/admin use)
CREATE POLICY "Service role has full access to billing events"
    ON public.billing_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.entitlements IS 'Single source of truth for subscription/plan status across Shopify and Stripe';
COMMENT ON COLUMN public.entitlements.shop_domain IS 'Shopify shop domain (for Shopify-billed merchants)';
COMMENT ON COLUMN public.entitlements.workspace_id IS 'Aiva workspace ID (for Stripe-billed or linked Shopify merchants)';
COMMENT ON COLUMN public.entitlements.provider IS 'Which billing provider manages this subscription';
COMMENT ON COLUMN public.entitlements.provider_subscription_id IS 'Subscription ID from the provider (Shopify GID or Stripe sub_id)';

COMMENT ON TABLE public.shopify_billing_plans IS 'Shopify-specific pricing for each plan tier';
COMMENT ON COLUMN public.shopify_billing_plans.shopify_amount_monthly IS 'Monthly price in USD (includes Shopify rev share markup)';

COMMENT ON TABLE public.billing_events IS 'Audit log of all billing-related events for debugging and compliance';

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT SELECT ON TABLE public.entitlements TO authenticated;
GRANT SELECT ON TABLE public.shopify_billing_plans TO authenticated;
GRANT SELECT ON TABLE public.shopify_billing_plans TO anon;
