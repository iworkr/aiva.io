// import sendgrid from '@sendgrid/mail';
import { Resend } from "resend";
import { errors } from "../errors";
import { sendEmailInbucket } from "../sendEmailInbucket";

type EmailOptions = {
  to: string;
  from: string;
  subject: string;
  html: string;
};

const isDevOrTestEnvironment =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

export async function sendEmail(options: EmailOptions) {
  if (isDevOrTestEnvironment) {
    // In development, try Inbucket first, but don't fail if it's not running
    try {
      await sendEmailInbucket(options);
      return;
    } catch (error) {
      // If Inbucket fails, log the email details for debugging
      console.log("📧 Development email (Inbucket unavailable):", {
        to: options.to,
        subject: options.subject,
        from: options.from,
      });
      return;
    }
  }

  // Check for API key BEFORE creating Resend instance
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("❌ RESEND_API_KEY is not set. Cannot send email.");
    console.error("Environment variables:", {
      NODE_ENV: process.env.NODE_ENV,
      hasResendKey: !!process.env.RESEND_API_KEY,
    });
    throw new Error(
      "RESEND_API_KEY is not configured. Please set it in your environment variables.",
    );
  }

  try {
    const resend = new Resend(resendApiKey);
    // return sendgrid.send(options);
    return await resend.emails.send(options);
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    errors.add(error);
    throw error; // Re-throw so caller knows email failed
  }
}
