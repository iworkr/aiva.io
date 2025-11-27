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
  // Use multiple methods to get the env var (handles different deployment platforms)
  const resendApiKey =
    process.env.RESEND_API_KEY?.trim() ||
    process.env.RESEND_API_KEY?.replace(/\s/g, "") ||
    null;

  if (!resendApiKey || resendApiKey.length === 0) {
    const errorMsg =
      "RESEND_API_KEY is not configured. Please set it in your environment variables (Vercel/Render dashboard).";
    console.error("❌", errorMsg);
    console.error("Environment check:", {
      NODE_ENV: process.env.NODE_ENV,
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
      resendKeyPreview:
        process.env.RESEND_API_KEY?.substring(0, 10) || "undefined",
    });

    // In production, log but don't throw - allow auth flow to continue
    // The user will see the error in logs and can fix the env var
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "⚠️ Email sending disabled due to missing RESEND_API_KEY. Auth flow will continue.",
      );
      // Return a mock success so auth doesn't break
      return {
        id: "skipped",
        message: "Email sending skipped - RESEND_API_KEY not configured",
      };
    }

    throw new Error(errorMsg);
  }

  // Validate API key format (should start with 're_')
  if (!resendApiKey.startsWith("re_")) {
    console.error(
      "❌ RESEND_API_KEY format is invalid. Should start with 're_'",
    );
    throw new Error(
      "RESEND_API_KEY format is invalid. Should start with 're_'",
    );
  }

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send(options);

    // Check if Resend returned an error in the response
    if (result.error) {
      console.error("❌ Resend API returned an error:", result.error);
      throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
    }

    // Verify we got a successful response with an ID
    if (!result.data?.id) {
      console.error("❌ Resend API response missing email ID:", result);
      throw new Error("Resend API did not return a valid email ID");
    }

    console.log("📧 Resend email sent successfully:", {
      emailId: result.data.id,
      to: options.to,
      subject: options.subject,
    });

    return result;
  } catch (error: any) {
    // If it's the "Missing API key" error, provide helpful message
    if (
      error?.message?.includes("Missing API key") ||
      error?.message?.includes("API key")
    ) {
      console.error("❌ Resend API key error:", error.message);
      console.error(
        "Current RESEND_API_KEY value:",
        resendApiKey ? `${resendApiKey.substring(0, 10)}...` : "undefined",
      );
      throw new Error(
        "RESEND_API_KEY is not properly configured in your production environment. " +
          "Please add it in Vercel/Render dashboard → Environment Variables → RESEND_API_KEY = re_U3wbepDx_8jGmrWhM5JZhvy2UmebYBMDa",
      );
    }
    console.error("❌ Failed to send email via Resend:", {
      error: error.message,
      errorDetails: error,
      to: options.to,
      subject: options.subject,
    });
    errors.add(error);
    throw error; // Re-throw so caller knows email failed
  }
}
