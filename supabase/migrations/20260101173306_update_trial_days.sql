-- Update trial days from 14 to 7 for all plans
UPDATE public.shopify_billing_plans
SET trial_days = 7
WHERE trial_days = 14;
