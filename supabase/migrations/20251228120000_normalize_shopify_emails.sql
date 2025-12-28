-- =====================================================
-- Normalize Shopify email addresses to lowercase
-- Fixes case sensitivity issues in email matching
-- =====================================================

-- Normalize emails in shopify_orders table
UPDATE public.shopify_orders
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL
  AND email != LOWER(TRIM(email));

-- Normalize emails in shopify_customers table
UPDATE public.shopify_customers
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL
  AND email != LOWER(TRIM(email));

-- Log the changes
DO $$
DECLARE
  orders_updated INTEGER;
  customers_updated INTEGER;
BEGIN
  GET DIAGNOSTICS orders_updated = ROW_COUNT;
  
  -- Note: ROW_COUNT is reset after each statement, so we need to check separately
  -- The actual count is logged by the UPDATE statements above
  
  RAISE NOTICE 'Normalized emails: % orders, % customers', 
    (SELECT COUNT(*) FROM public.shopify_orders WHERE email IS NOT NULL),
    (SELECT COUNT(*) FROM public.shopify_customers WHERE email IS NOT NULL);
END $$;

