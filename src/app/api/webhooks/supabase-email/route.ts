/**
 * Supabase Email Webhook
 * This webhook intercepts Supabase auth emails and sends custom templates via Resend
 *
 * To configure in Supabase:
 * 1. Go to Project Settings > Auth > Email Templates
 * 2. Configure custom SMTP (Resend) OR
 * 3. Set up a webhook URL pointing to this endpoint
 *
 * Note: Supabase doesn't have a direct webhook for email customization.
 * This endpoint can be used if Supabase adds webhook support, or
 * we can use it as a manual email sender after auth operations.
 */

import { getUserDisplayName, sendAuthEmail } from "@/utils/email-service";
import { toSiteURL } from "@/utils/helpers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SupabaseEmailWebhookPayload {
  type:
    | "email_confirmation"
    | "magic_link"
    | "password_reset"
    | "password_updated";
  user: {
    id: string;
    email: string;
    email_confirmed_at?: string | null;
  };
  confirmation_link?: string;
  magic_link?: string;
  reset_link?: string;
  redirect_to?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if needed (add SUPABASE_WEBHOOK_SECRET to env)
    const webhookSecret = request.headers.get("x-supabase-webhook-secret");
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;

    if (expectedSecret && webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload: SupabaseEmailWebhookPayload = await request.json();
    const { type, user, confirmation_link, magic_link, reset_link } = payload;

    if (!user?.email) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 },
      );
    }

    // Get user display name
    const userName = await getUserDisplayName(user.id, user.email);

    // Map Supabase email types to our custom templates
    switch (type) {
      case "email_confirmation": {
        if (!confirmation_link) {
          return NextResponse.json(
            { error: "confirmation_link is required for email_confirmation" },
            { status: 400 },
          );
        }
        await sendAuthEmail({
          type: "email_confirmation",
          to: user.email,
          userName,
          confirmationLink: confirmation_link,
        });
        break;
      }

      case "magic_link": {
        if (!magic_link) {
          return NextResponse.json(
            { error: "magic_link is required for magic_link" },
            { status: 400 },
          );
        }
        await sendAuthEmail({
          type: "magic_link",
          to: user.email,
          userName,
          magicLink: magic_link,
        });
        break;
      }

      case "password_reset": {
        if (!reset_link) {
          return NextResponse.json(
            { error: "reset_link is required for password_reset" },
            { status: 400 },
          );
        }
        await sendAuthEmail({
          type: "password_reset",
          to: user.email,
          userName,
          resetLink: reset_link,
        });
        break;
      }

      case "password_updated": {
        await sendAuthEmail({
          type: "password_updated",
          to: user.email,
          userName,
          signinPage: toSiteURL("/login"),
          passwordResetLink: toSiteURL("/forgot-password"),
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supabase email webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process email webhook" },
      { status: 500 },
    );
  }
}

// GET endpoint for webhook verification (if needed)
export async function GET() {
  return NextResponse.json({
    message: "Supabase Email Webhook is active",
    timestamp: new Date().toISOString(),
  });
}
