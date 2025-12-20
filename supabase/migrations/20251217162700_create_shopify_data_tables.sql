-- =====================================================
-- Shopify Data Sync Tables
-- Stores synced Shopify orders, customers, and products
-- All tables are workspace-scoped with RLS for data isolation
-- =====================================================

-- =====================================================
-- SHOPIFY ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shopify_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workspace isolation (required)
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    shopify_store_id UUID NOT NULL REFERENCES public.shopify_stores(id) ON DELETE CASCADE,
    
    -- Shopify order data
    shopify_order_id BIGINT NOT NULL,
    order_number TEXT,  -- Display order number like "#1001"
    name TEXT,  -- Order name like "#1001"
    email TEXT,  -- Customer email
    customer_name TEXT,
    
    -- Financials
    total_price DECIMAL(12, 2),
    subtotal_price DECIMAL(12, 2),
    total_tax DECIMAL(12, 2),
    total_discounts DECIMAL(12, 2),
    currency TEXT,
    
    -- Status
    financial_status TEXT,  -- pending, paid, refunded, voided, partially_refunded
    fulfillment_status TEXT,  -- unfulfilled, partial, fulfilled
    cancelled_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Order details (JSONB for flexibility)
    line_items JSONB DEFAULT '[]'::jsonb,
    shipping_address JSONB,
    billing_address JSONB,
    discount_codes JSONB DEFAULT '[]'::jsonb,
    note TEXT,
    tags TEXT,
    
    -- Shopify timestamps
    created_at_shopify TIMESTAMPTZ,
    updated_at_shopify TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    
    -- Aiva timestamps
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per store
    UNIQUE(shopify_store_id, shopify_order_id)
);

-- Indexes for shopify_orders
CREATE INDEX IF NOT EXISTS idx_shopify_orders_workspace ON public.shopify_orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store ON public.shopify_orders(shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_email ON public.shopify_orders(email);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created ON public.shopify_orders(created_at_shopify DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_financial_status ON public.shopify_orders(financial_status);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_fulfillment_status ON public.shopify_orders(fulfillment_status);

-- =====================================================
-- SHOPIFY CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shopify_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workspace isolation (required)
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    shopify_store_id UUID NOT NULL REFERENCES public.shopify_stores(id) ON DELETE CASCADE,
    
    -- Shopify customer data
    shopify_customer_id BIGINT NOT NULL,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    
    -- Customer stats
    orders_count INTEGER DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    currency TEXT,
    
    -- Additional data
    accepts_marketing BOOLEAN DEFAULT false,
    accepts_marketing_updated_at TIMESTAMPTZ,
    tags TEXT[],
    note TEXT,
    
    -- Address (default address)
    default_address JSONB,
    
    -- Verification
    verified_email BOOLEAN DEFAULT false,
    tax_exempt BOOLEAN DEFAULT false,
    
    -- Shopify timestamps
    created_at_shopify TIMESTAMPTZ,
    updated_at_shopify TIMESTAMPTZ,
    
    -- Aiva timestamps
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per store
    UNIQUE(shopify_store_id, shopify_customer_id)
);

-- Indexes for shopify_customers
CREATE INDEX IF NOT EXISTS idx_shopify_customers_workspace ON public.shopify_customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_store ON public.shopify_customers(shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_email ON public.shopify_customers(email);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_orders_count ON public.shopify_customers(orders_count DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_total_spent ON public.shopify_customers(total_spent DESC);

-- =====================================================
-- SHOPIFY PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shopify_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workspace isolation (required)
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    shopify_store_id UUID NOT NULL REFERENCES public.shopify_stores(id) ON DELETE CASCADE,
    
    -- Shopify product data
    shopify_product_id BIGINT NOT NULL,
    title TEXT NOT NULL,
    handle TEXT,
    body_html TEXT,
    vendor TEXT,
    product_type TEXT,
    
    -- Status
    status TEXT DEFAULT 'active',  -- active, draft, archived
    published_at TIMESTAMPTZ,
    
    -- Variants and images (JSONB for flexibility)
    variants JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    options JSONB DEFAULT '[]'::jsonb,
    
    -- Categorization
    tags TEXT[],
    template_suffix TEXT,
    
    -- Shopify timestamps
    created_at_shopify TIMESTAMPTZ,
    updated_at_shopify TIMESTAMPTZ,
    
    -- Aiva timestamps
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per store
    UNIQUE(shopify_store_id, shopify_product_id)
);

-- Indexes for shopify_products
CREATE INDEX IF NOT EXISTS idx_shopify_products_workspace ON public.shopify_products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_store ON public.shopify_products(shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_title ON public.shopify_products(title);
CREATE INDEX IF NOT EXISTS idx_shopify_products_status ON public.shopify_products(status);
CREATE INDEX IF NOT EXISTS idx_shopify_products_handle ON public.shopify_products(handle);

-- =====================================================
-- SHOPIFY SYNC LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shopify_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workspace isolation (required)
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    shopify_store_id UUID NOT NULL REFERENCES public.shopify_stores(id) ON DELETE CASCADE,
    
    -- Sync details
    sync_type TEXT NOT NULL,  -- 'orders', 'customers', 'products', 'full'
    records_synced INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'running',  -- 'running', 'completed', 'failed'
    errors JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Aiva timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for shopify_sync_logs
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_workspace ON public.shopify_sync_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_store ON public.shopify_sync_logs(shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_status ON public.shopify_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_started ON public.shopify_sync_logs(started_at DESC);

-- =====================================================
-- ADD SYNC SETTINGS TO SHOPIFY_STORES TABLE
-- =====================================================
ALTER TABLE public.shopify_stores
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_orders_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_customers_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_products_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS orders_sync_cursor TEXT,
ADD COLUMN IF NOT EXISTS customers_sync_cursor TEXT,
ADD COLUMN IF NOT EXISTS products_sync_cursor TEXT;

-- Add comments for sync columns
COMMENT ON COLUMN public.shopify_stores.sync_enabled IS 'Master toggle for Shopify data sync';
COMMENT ON COLUMN public.shopify_stores.last_orders_sync_at IS 'Timestamp of last successful orders sync';
COMMENT ON COLUMN public.shopify_stores.last_customers_sync_at IS 'Timestamp of last successful customers sync';
COMMENT ON COLUMN public.shopify_stores.last_products_sync_at IS 'Timestamp of last successful products sync';

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sync_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR SHOPIFY_ORDERS
-- =====================================================

-- Service role has full access (for cron jobs)
CREATE POLICY "Service role has full access to shopify_orders"
    ON public.shopify_orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Workspace members can view their orders
CREATE POLICY "Workspace members can view shopify_orders"
    ON public.shopify_orders
    FOR SELECT
    TO authenticated
    USING (is_workspace_member(auth.uid(), workspace_id));

-- Workspace admins can manage orders
CREATE POLICY "Workspace admins can manage shopify_orders"
    ON public.shopify_orders
    FOR ALL
    TO authenticated
    USING (is_workspace_admin(auth.uid(), workspace_id))
    WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

-- =====================================================
-- RLS POLICIES FOR SHOPIFY_CUSTOMERS
-- =====================================================

-- Service role has full access (for cron jobs)
CREATE POLICY "Service role has full access to shopify_customers"
    ON public.shopify_customers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Workspace members can view their customers
CREATE POLICY "Workspace members can view shopify_customers"
    ON public.shopify_customers
    FOR SELECT
    TO authenticated
    USING (is_workspace_member(auth.uid(), workspace_id));

-- Workspace admins can manage customers
CREATE POLICY "Workspace admins can manage shopify_customers"
    ON public.shopify_customers
    FOR ALL
    TO authenticated
    USING (is_workspace_admin(auth.uid(), workspace_id))
    WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

-- =====================================================
-- RLS POLICIES FOR SHOPIFY_PRODUCTS
-- =====================================================

-- Service role has full access (for cron jobs)
CREATE POLICY "Service role has full access to shopify_products"
    ON public.shopify_products
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Workspace members can view their products
CREATE POLICY "Workspace members can view shopify_products"
    ON public.shopify_products
    FOR SELECT
    TO authenticated
    USING (is_workspace_member(auth.uid(), workspace_id));

-- Workspace admins can manage products
CREATE POLICY "Workspace admins can manage shopify_products"
    ON public.shopify_products
    FOR ALL
    TO authenticated
    USING (is_workspace_admin(auth.uid(), workspace_id))
    WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

-- =====================================================
-- RLS POLICIES FOR SHOPIFY_SYNC_LOGS
-- =====================================================

-- Service role has full access (for cron jobs)
CREATE POLICY "Service role has full access to shopify_sync_logs"
    ON public.shopify_sync_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Workspace admins can view sync logs
CREATE POLICY "Workspace admins can view shopify_sync_logs"
    ON public.shopify_sync_logs
    FOR SELECT
    TO authenticated
    USING (is_workspace_admin(auth.uid(), workspace_id));

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

-- Trigger for shopify_orders
CREATE OR REPLACE FUNCTION update_shopify_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopify_orders_updated_at
    BEFORE UPDATE ON public.shopify_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_orders_updated_at();

-- Trigger for shopify_customers
CREATE OR REPLACE FUNCTION update_shopify_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopify_customers_updated_at
    BEFORE UPDATE ON public.shopify_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_customers_updated_at();

-- Trigger for shopify_products
CREATE OR REPLACE FUNCTION update_shopify_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopify_products_updated_at
    BEFORE UPDATE ON public.shopify_products
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_products_updated_at();

-- =====================================================
-- TABLE COMMENTS
-- =====================================================
COMMENT ON TABLE public.shopify_orders IS 'Synced Shopify orders, workspace-scoped for data isolation';
COMMENT ON TABLE public.shopify_customers IS 'Synced Shopify customers, workspace-scoped for data isolation';
COMMENT ON TABLE public.shopify_products IS 'Synced Shopify products, workspace-scoped for data isolation';
COMMENT ON TABLE public.shopify_sync_logs IS 'Audit log of Shopify sync operations';

-- =====================================================
-- ROLLBACK (DOWN migration)
-- =====================================================
-- To rollback this migration:
-- DROP TABLE IF EXISTS public.shopify_sync_logs;
-- DROP TABLE IF EXISTS public.shopify_products;
-- DROP TABLE IF EXISTS public.shopify_customers;
-- DROP TABLE IF EXISTS public.shopify_orders;
-- ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS sync_enabled;
-- ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS last_orders_sync_at;
-- ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS last_customers_sync_at;
-- ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS last_products_sync_at;
-- ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS orders_sync_cursor;
-- ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS customers_sync_cursor;
-- ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS products_sync_cursor;



