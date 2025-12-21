-- =====================================================
-- Add link_method column to shopify_stores
-- Tracks how the Aiva account was linked to the Shopify store
-- =====================================================

-- Create enum type for link methods
CREATE TYPE public.shopify_link_method AS ENUM (
    'shopify',          -- Account created/linked via "Continue with Shopify"
    'existing_account'  -- Linked to existing Aiva account via manual login
);

-- Add link_method column to shopify_stores
ALTER TABLE public.shopify_stores 
ADD COLUMN IF NOT EXISTS link_method public.shopify_link_method;

-- Add comment for documentation
COMMENT ON COLUMN public.shopify_stores.link_method IS 'How the Aiva account was linked: shopify (auto-created from Shopify email) or existing_account (manually linked)';

-- =====================================================
-- Rollback (DOWN migration)
-- =====================================================
-- To rollback this migration:
-- ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS link_method;
-- DROP TYPE IF EXISTS public.shopify_link_method;




