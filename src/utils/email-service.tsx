/**
 * Email Service
 * Maps Supabase auth email types to custom React Email templates
 */

import { renderAsync } from '@react-email/render';
import { sendEmail } from './api-routes/utils';
import { toSiteURL } from './helpers';

// Import email templates
import EmailConfirmation from '../../emails/email-confirmation';
import MagicLink from '../../emails/magic-link';
import MagicLinkLinkOnly from '../../emails/magic-link-link-only';
import ForgotPassword from '../../emails/forgot-password';
import PasswordUpdated from '../../emails/password-update';
import WelcomeEmail from '../../emails/welcome';

const APP_NAME = 'Aiva.io';
const SUPPORT_EMAIL = process.env.ADMIN_EMAIL || 'support@tryaiva.io';

export type EmailType =
  | 'email_confirmation'
  | 'magic_link'
  | 'magic_link_link_only'
  | 'password_reset'
  | 'password_updated'
  | 'welcome';

interface SendAuthEmailOptions {
  type: EmailType;
  to: string;
  userName?: string;
  confirmationLink?: string;
  magicLink?: string;
  resetLink?: string;
  signinPage?: string;
  passwordResetLink?: string;
  linkToApp?: string;
  purposeOfApp?: string;
  makerName?: string;
  positionInTeam?: string;
  socialMediaLinks?: {
    twitter: string;
    facebook: string;
  };
}

/**
 * Sends a custom auth email using React Email templates
 */
export async function sendAuthEmail(options: SendAuthEmailOptions) {
  const { type, to, userName = 'User' } = options;

  let subject = '';
  let html = '';

  try {
    switch (type) {
      case 'email_confirmation': {
        if (!options.confirmationLink) {
          throw new Error('confirmationLink is required for email_confirmation');
        }
        subject = `Confirm your email address - ${APP_NAME}`;
        html = await renderAsync(
          <EmailConfirmation
            appName={APP_NAME}
            userName={userName}
            supportEmail={SUPPORT_EMAIL}
            confirmationLink={options.confirmationLink}
          />
        );
        break;
      }

      case 'magic_link': {
        if (!options.magicLink) {
          throw new Error('magicLink is required for magic_link');
        }
        subject = `Sign in to ${APP_NAME}`;
        html = await renderAsync(
          <MagicLink
            appName={APP_NAME}
            userName={userName}
            supportEmail={SUPPORT_EMAIL}
            magicLink={options.magicLink}
          />
        );
        break;
      }

      case 'magic_link_link_only': {
        if (!options.magicLink) {
          throw new Error('magicLink is required for magic_link_link_only');
        }
        subject = `Your magic link from ${APP_NAME}`;
        html = await renderAsync(
          <MagicLinkLinkOnly
            appName={APP_NAME}
            magicLink={options.magicLink}
            supportEmail={SUPPORT_EMAIL}
          />
        );
        break;
      }

      case 'password_reset': {
        if (!options.resetLink) {
          throw new Error('resetLink is required for password_reset');
        }
        subject = `Reset your password - ${APP_NAME}`;
        html = await renderAsync(
          <ForgotPassword
            appName={APP_NAME}
            userName={userName}
            resetLink={options.resetLink}
          />
        );
        break;
      }

      case 'password_updated': {
        if (!options.signinPage || !options.passwordResetLink) {
          throw new Error('signinPage and passwordResetLink are required for password_updated');
        }
        subject = `Your password has been updated - ${APP_NAME}`;
        html = await renderAsync(
          <PasswordUpdated
            userName={userName}
            appName={APP_NAME}
            supportEmail={SUPPORT_EMAIL}
            passwordResetLink={options.passwordResetLink}
            signinPage={options.signinPage}
          />
        );
        break;
      }

      case 'welcome': {
        subject = `Welcome to ${APP_NAME}!`;
        html = await renderAsync(
          <WelcomeEmail
            appName={APP_NAME}
            userName={userName}
            purposeOfApp={options.purposeOfApp || 'streamline your communication'}
            makerName={options.makerName || 'The Aiva.io Team'}
            positionInTeam={options.positionInTeam || 'Founder'}
            linkToApp={options.linkToApp || toSiteURL('/dashboard')}
            supportEmail={SUPPORT_EMAIL}
            socialMediaLinks={
              options.socialMediaLinks || {
                twitter: 'https://twitter.com/aivaio',
                facebook: 'https://facebook.com/aivaio',
              }
            }
          />
        );
        break;
      }

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send email via Resend
    await sendEmail({
      to,
      from: process.env.ADMIN_EMAIL || 'noreply@tryaiva.io',
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error(`Failed to send ${type} email to ${to}:`, error);
    throw error;
  }
}

/**
 * Helper to extract user name from user profile or email
 */
export async function getUserDisplayName(
  userId: string,
  email: string
): Promise<string> {
  try {
    // Try to get user profile from database
    const { createSupabaseUserServerActionClient } = await import(
      '@/supabase-clients/user/createSupabaseUserServerActionClient'
    );
    const supabase = await createSupabaseUserServerActionClient();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    return profile?.full_name || email.split('@')[0] || 'User';
  } catch {
    return email.split('@')[0] || 'User';
  }
}

