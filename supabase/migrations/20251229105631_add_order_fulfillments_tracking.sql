-- ============================================================================
-- Add Order Fulfillments and Tracking
-- Stores fulfillment data including tracking numbers for orders
-- ============================================================================

-- Add fulfillments column to store tracking information
ALTER TABLE shopify_orders
ADD COLUMN IF NOT EXISTS fulfillments JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN shopify_orders.fulfillments IS 'Array of fulfillment objects containing tracking numbers, shipping companies, and tracking URLs';
