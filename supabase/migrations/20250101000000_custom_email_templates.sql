/**
 * Custom Email Templates Migration
 * 
 * This migration sets up infrastructure for sending custom email templates
 * via Resend instead of Supabase's default email templates.
 * 
 * Note: Supabase will still send its default emails unless you:
 * 1. Configure Supabase to use Resend SMTP in the Supabase Dashboard
 * 2. OR disable email sending in Supabase and handle it manually via webhooks
 * 
 * To configure Resend SMTP in Supabase:
 * 1. Go to Project Settings > Auth > SMTP Settings
 * 2. Enable Custom SMTP
 * 3. Use Resend SMTP settings:
 *    - Host: smtp.resend.com
 *    - Port: 587
 *    - Username: resend
 *    - Password: Your Resend API Key (re_...)
 *    - Sender email: Your verified domain email (e.g., noreply@tryaiva.io)
 */

-- Create a function to send welcome email (called via webhook/API, not directly from DB)
-- This is a placeholder - actual email sending happens via Next.js API routes
CREATE OR REPLACE FUNCTION public.send_welcome_email_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function doesn't send emails directly
  -- Instead, it logs that a welcome email should be sent
  -- The actual email sending is handled by Next.js API routes/webhooks
  
  -- You can add logic here to call an external webhook if needed
  -- For now, we'll rely on the application layer to send welcome emails
  
  RETURN NEW;
END;
$$;

-- Note: We don't create a trigger here because Supabase's built-in email
-- system will handle the initial email. To fully customize, you need to:
-- 1. Configure Resend SMTP in Supabase Dashboard
-- 2. Use the webhook endpoint at /api/webhooks/supabase-email
-- 3. OR modify auth actions to send custom emails after Supabase operations

COMMENT ON FUNCTION public.send_welcome_email_webhook() IS 
'Placeholder function for custom email templates. Actual email sending is handled by Next.js API routes using Resend.';

