/**
 * Generate Supabase Email Templates
 * 
 * This script renders our React Email templates to HTML
 * and provides the HTML for use in Supabase Auth email templates.
 * 
 * Run: pnpm tsx scripts/generate-supabase-email-templates.ts
 */

import { renderAsync } from '@react-email/render';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Import email templates
import EmailConfirmation from '../emails/email-confirmation';
import ForgotPassword from '../emails/forgot-password';
import MagicLink from '../emails/magic-link';
import MagicLinkLinkOnly from '../emails/magic-link-link-only';
import PasswordUpdated from '../emails/password-update';
import WelcomeEmail from '../emails/welcome';

const APP_NAME = 'Aiva.io';
const SUPPORT_EMAIL = 'admin@tryaiva.io';

// Supabase template placeholders that will be replaced at runtime
const SUPABASE_PLACEHOLDERS = {
  email_confirmation: {
    confirmation_link: '{{ .ConfirmationURL }}',
    user_email: '{{ .Email }}',
    user_name: '{{ .Email }}', // Supabase doesn't provide user name, use email
  },
  magic_link: {
    magic_link: '{{ .Token }}', // Supabase provides token, we need to construct URL
    user_email: '{{ .Email }}',
    user_name: '{{ .Email }}',
  },
  password_reset: {
    reset_link: '{{ .ConfirmationURL }}',
    user_email: '{{ .Email }}',
    user_name: '{{ .Email }}',
  },
  password_updated: {
    signin_page: 'https://www.tryaiva.io/en/login',
    password_reset_link: 'https://www.tryaiva.io/en/forgot-password',
    user_email: '{{ .Email }}',
    user_name: '{{ .Email }}',
  },
  welcome: {
    link_to_app: 'https://www.tryaiva.io/en/dashboard',
    user_email: '{{ .Email }}',
    user_name: '{{ .Email }}',
  },
};

async function generateTemplate(
  name: string,
  component: React.ComponentType<any>,
  props: any,
) {
  const html = await renderAsync(component(props));
  
  // Write to file
  const outputDir = join(process.cwd(), 'supabase-email-templates');
  mkdirSync(outputDir, { recursive: true });
  
  const filePath = join(outputDir, `${name}.html`);
  writeFileSync(filePath, html, 'utf-8');
  
  console.log(`✅ Generated: ${filePath}`);
  return html;
}

async function main() {
  console.log('📧 Generating Supabase email templates...\n');

  // Generate email confirmation template
  await generateTemplate(
    'email_confirmation',
    EmailConfirmation,
    {
      appName: APP_NAME,
      userName: SUPABASE_PLACEHOLDERS.email_confirmation.user_name,
      supportEmail: SUPPORT_EMAIL,
      confirmationLink: SUPABASE_PLACEHOLDERS.email_confirmation.confirmation_link,
    },
  );

  // Generate magic link template
  // Supabase provides {{ .Token }} and {{ .ConfirmationURL }}
  // Use {{ .ConfirmationURL }} which Supabase generates automatically with correct redirect
  await generateTemplate(
    'magic_link',
    MagicLink,
    {
      appName: APP_NAME,
      userName: SUPABASE_PLACEHOLDERS.magic_link.user_name,
      supportEmail: SUPPORT_EMAIL,
      // Use ConfirmationURL which Supabase generates - it includes the redirect_to parameter
      magicLink: `{{ .ConfirmationURL }}`,
    },
  );

  // Generate password reset template
  await generateTemplate(
    'password_reset',
    ForgotPassword,
    {
      appName: APP_NAME,
      userName: SUPABASE_PLACEHOLDERS.password_reset.user_name,
      resetLink: SUPABASE_PLACEHOLDERS.password_reset.reset_link,
    },
  );

  // Generate password updated template
  await generateTemplate(
    'password_updated',
    PasswordUpdated,
    {
      userName: SUPABASE_PLACEHOLDERS.password_updated.user_name,
      appName: APP_NAME,
      supportEmail: SUPPORT_EMAIL,
      passwordResetLink: SUPABASE_PLACEHOLDERS.password_updated.password_reset_link,
      signinPage: SUPABASE_PLACEHOLDERS.password_updated.signin_page,
    },
  );

  // Generate welcome email template
  await generateTemplate(
    'welcome',
    WelcomeEmail,
    {
      appName: APP_NAME,
      userName: SUPABASE_PLACEHOLDERS.welcome.user_name,
      purposeOfApp: 'streamline your communication',
      makerName: 'The Aiva.io Team',
      positionInTeam: 'Founder',
      linkToApp: SUPABASE_PLACEHOLDERS.welcome.link_to_app,
      supportEmail: SUPPORT_EMAIL,
      socialMediaLinks: {
        twitter: 'https://twitter.com/aivaio',
        facebook: 'https://facebook.com/aivaio',
      },
    },
  );

  console.log('\n✅ All templates generated successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Go to Supabase Dashboard → Authentication → Email Templates');
  console.log('2. Copy the HTML from each file in supabase-email-templates/');
  console.log('3. Paste into the corresponding Supabase email template');
  console.log('4. Update the placeholders as needed (Supabase uses {{ .Placeholder }} syntax)');
}

main().catch(console.error);

