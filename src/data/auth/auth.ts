"use server";
import { actionClient } from "@/lib/safe-action";
import { supabaseAdminClient } from "@/supabase-clients/admin/supabaseAdminClient";
import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { getUserDisplayName, sendAuthEmail } from "@/utils/email-service";
import {
  handleSupabaseAuthMagicLinkErrors,
  handleSupabaseAuthPasswordSignUpErrors,
  handleSupabaseAuthResetPasswordErrors,
  handleSupabaseAuthSignInErrors,
} from "@/utils/errorMessage";
import { toSiteURL } from "@/utils/helpers";
import {
  resetPasswordSchema,
  signInWithMagicLinkSchema,
  signInWithPasswordSchema,
  signInWithProviderSchema,
  signUpWithPasswordSchema,
} from "@/utils/zod-schemas/auth";
import { returnValidationErrors } from "next-safe-action";

/**
 * Signs up a new user with email and password.
 * Uses custom email templates via Resend for email confirmation.
 * @param {Object} params - The parameters for sign up.
 * @param {string} params.email - The user's email address.
 * @param {string} params.password - The user's password (minimum 8 characters).
 * @returns {Promise<Object>} The data returned from the sign-up process.
 * @throws {Error} If there's an error during sign up.
 */
export const signUpWithPasswordAction = actionClient
  .schema(signUpWithPasswordSchema)
  .action(async ({ parsedInput: { email, password, next } }) => {
    const supabase = await createSupabaseUserServerActionClient();
    const emailRedirectTo = new URL(toSiteURL("/auth/callback"));
    if (next) {
      emailRedirectTo.searchParams.set("next", next);
    }

    // Sign up user (Supabase will still send confirmation email by default)
    // We'll also send our custom email after signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: emailRedirectTo.toString(),
      },
    });

    if (error) {
      const errorDetails = handleSupabaseAuthPasswordSignUpErrors(error);
      if (errorDetails.field) {
        returnValidationErrors(signUpWithPasswordSchema, {
          [email]: {
            _errors: [errorDetails.message],
          },
        });
      } else {
        returnValidationErrors(signUpWithPasswordSchema, {
          _errors: [errorDetails.message],
        });
      }
      return;
    }

    // If user was created and needs email confirmation, send custom confirmation email
    if (data?.user && !data.user.email_confirmed_at) {
      // Generate confirmation link (password required for signup type)
      const { data: linkData } =
        await supabaseAdminClient.auth.admin.generateLink({
          type: "signup",
          email,
          password,
          options: {
            redirectTo: emailRedirectTo.toString(),
          },
        });

      if (linkData?.properties?.action_link) {
        const userName = await getUserDisplayName(data.user.id, email);

        try {
          // Send custom confirmation email
          await sendAuthEmail({
            type: "email_confirmation",
            to: email,
            userName,
            confirmationLink: linkData.properties.action_link,
          });

          // Optionally send welcome email
          try {
            await sendAuthEmail({
              type: "welcome",
              to: email,
              userName,
              linkToApp: toSiteURL("/dashboard"),
            });
          } catch (welcomeError) {
            console.error("Failed to send welcome email:", welcomeError);
            // Non-critical, don't throw
          }
        } catch (emailError) {
          console.error(
            "Failed to send custom confirmation email:",
            emailError,
          );
          // Non-critical, Supabase will still send its default email
        }
      }
    }

    return data;
  });

/**
 * Signs in a user with email and password.
 * @param {Object} params - The parameters for sign in.
 * @param {string} params.email - The user's email address.
 * @param {string} params.password - The user's password.
 * @throws {Error} If there's an error during sign in.
 */
export const signInWithPasswordAction = actionClient
  .schema(signInWithPasswordSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    const supabase = await createSupabaseUserServerActionClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const errorDetails = handleSupabaseAuthSignInErrors(error);
      if (errorDetails.field === "email") {
        returnValidationErrors(signInWithPasswordSchema, {
          email: {
            _errors: [errorDetails.message],
          },
        });
      } else if (errorDetails.field === "password") {
        returnValidationErrors(signInWithPasswordSchema, {
          password: {
            _errors: [errorDetails.message],
          },
        });
      } else {
        returnValidationErrors(signInWithPasswordSchema, {
          _errors: [errorDetails.message],
        });
      }
    }

    return data;
  });

/**
 * Sends a magic link to the user's email for passwordless sign in.
 * Uses custom email templates via Resend instead of Supabase default emails.
 * @param {Object} params - The parameters for magic link sign in.
 * @param {string} params.email - The user's email address.
 * @param {string} [params.next] - The URL to redirect to after successful sign in.
 * @throws {Error} If there's an error sending the magic link.
 */
export const signInWithMagicLinkAction = actionClient
  .schema(signInWithMagicLinkSchema)
  .action(async ({ parsedInput: { email, next, shouldCreateUser } }) => {
    const redirectUrl = new URL(toSiteURL("/auth/callback"));
    if (next) {
      redirectUrl.searchParams.set("next", next);
    }

    // Generate magic link using admin API (this doesn't send email automatically)
    const { data: linkData, error: linkError } =
      await supabaseAdminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: redirectUrl.toString(),
        },
      });

    if (linkError) {
      const errorDetails = handleSupabaseAuthMagicLinkErrors(linkError);
      returnValidationErrors(signInWithMagicLinkSchema, {
        email: {
          _errors: [errorDetails.message],
        },
      });
      return;
    }

    if (!linkData?.properties?.action_link) {
      returnValidationErrors(signInWithMagicLinkSchema, {
        email: {
          _errors: ["Failed to generate magic link"],
        },
      });
      return;
    }

    // Get user ID if user exists, or use email as fallback
    const userId = linkData.user?.id || email;

    // Send custom email using our email service (non-blocking)
    // We do this in a fire-and-forget manner so it doesn't block the response
    sendAuthEmail({
      type: "magic_link",
      to: email,
      userName: await getUserDisplayName(userId, email),
      magicLink: linkData.properties.action_link,
    }).catch((emailError) => {
      // Log error but don't throw - email sending failure shouldn't break auth flow
      console.error("⚠️ Failed to send custom magic link email:", emailError);
      console.log(
        "📧 Magic link generated successfully. Link:",
        linkData.properties.action_link,
      );
    });

    // Return success immediately - email is sent asynchronously
    // No need to return anything if the operation is successful
  });

/**
 * Initiates OAuth sign in with a specified provider.
 * @param {Object} params - The parameters for OAuth sign in.
 * @param {('google'|'github'|'gitlab'|'bitbucket')} params.provider - The OAuth provider.
 * @param {string} [params.next] - The URL to redirect to after successful sign in.
 * @returns {Promise<{url: string}>} The URL to redirect the user to for OAuth sign in.
 * @throws {Error} If there's an error initiating OAuth sign in.
 */
export const signInWithProviderAction = actionClient
  .schema(signInWithProviderSchema)
  .action(async ({ parsedInput: { provider, next } }) => {
    const supabase = await createSupabaseUserServerActionClient();
    const redirectToURL = new URL(toSiteURL("/auth/callback"));
    if (next) {
      redirectToURL.searchParams.set("next", next);
    }
    const { error, data } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectToURL.toString(),
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return { url: data.url };
  });

/**
 * Initiates the password reset process for a user.
 * Uses custom email templates via Resend instead of Supabase default emails.
 * @param {Object} params - The parameters for password reset.
 * @param {string} params.email - The email address of the user requesting password reset.
 * @throws {Error} If there's an error initiating the password reset.
 */
export const resetPasswordAction = actionClient
  .schema(resetPasswordSchema)
  .action(async ({ parsedInput: { email } }) => {
    const redirectToURL = new URL(toSiteURL("/auth/callback"));
    redirectToURL.searchParams.set("next", "/update-password");

    // Generate password reset link using admin API (this doesn't send email automatically)
    const { data: linkData, error: linkError } =
      await supabaseAdminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: redirectToURL.toString(),
        },
      });

    if (linkError) {
      const errorDetails = handleSupabaseAuthResetPasswordErrors(linkError);
      if (errorDetails.field === "email") {
        returnValidationErrors(resetPasswordSchema, {
          email: { _errors: [errorDetails.message] },
        });
      } else {
        returnValidationErrors(resetPasswordSchema, {
          _errors: [errorDetails.message],
        });
      }
      return;
    }

    if (!linkData?.properties?.action_link) {
      returnValidationErrors(resetPasswordSchema, {
        email: { _errors: ["Failed to generate password reset link"] },
      });
      return;
    }

    // Get user ID if user exists, or use email as fallback
    const userId = linkData.user?.id || email;
    const userName = await getUserDisplayName(userId, email);

    // Send custom email using our email service
    try {
      await sendAuthEmail({
        type: "password_reset",
        to: email,
        userName,
        resetLink: linkData.properties.action_link,
      });
    } catch (emailError) {
      console.error("Failed to send custom password reset email:", emailError);
      // Don't fail the entire operation if email sending fails
      // The link was generated successfully, user can request another email
    }

    // No need to return anything if the operation is successful
  });
