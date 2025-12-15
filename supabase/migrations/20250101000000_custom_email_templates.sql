/**
 * Custom Email Templates Migration
 * 
 * This migration is a placeholder. Custom email templates are configured
 * directly in the Supabase Dashboard, not via SQL migrations.
 * 
 * To configure custom email templates in Supabase:
 * 1. Go to Project Settings > Authentication > Email Templates
 * 2. For each email type (Signup, Magic Link, Password Reset, etc.):
 *    - Click "Edit Template"
 *    - Paste the HTML from the generated templates in supabase-email-templates/
 *    - Use Supabase template variables like {{ .ConfirmationURL }}, {{ .Token }}, etc.
 * 3. Save each template
 * 
 * To generate HTML templates from React Email components:
 * Run: pnpm tsx scripts/generate-supabase-email-templates.ts
 * 
 * To configure Resend SMTP in Supabase:
 * 1. Go to Project Settings > Auth > SMTP Settings
 * 2. Enable Custom SMTP
 * 3. Use Resend SMTP settings:
 *    - Host: smtp.resend.com
 *    - Port: 465 (or 587)
 *    - Username: resend
 *    - Password: Your Resend API Key (re_...)
 *    - Sender email: Your verified domain email (e.g., noreply@tryaiva.io)
 *    - Sender name: Aiva.io
 */

-- This migration doesn't modify any database structure
-- Email templates are configured in Supabase Dashboard, not via SQL
COMMENT ON SCHEMA public IS 
'Custom email templates are configured in Supabase Dashboard → Authentication → Email Templates. ' ||
'Run scripts/generate-supabase-email-templates.ts to generate HTML templates from React Email components.';

