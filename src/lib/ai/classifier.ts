/**
 * AI Message Classifier
 * Uses OpenAI to classify messages by priority, category, sentiment, etc.
 */

"use server";

import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { supabaseAdminClient } from "@/supabase-clients/admin/supabaseAdminClient";
import {
  MessageActionability,
  MessageCategory,
  MessagePriority,
  MessageSentiment,
} from "@/utils/zod-schemas/aiva-schemas";
import { OpenAI } from "openai";
import { getPriorityFromCategory } from "./priority-mapper";

// Valid category enum values
const VALID_CATEGORIES: MessageCategory[] = [
  'customer_inquiry',
  'customer_complaint',
  'sales_lead',
  'client_support',
  'bill',
  'invoice',
  'payment_confirmation',
  'authorization_code',
  'sign_in_code',
  'security_alert',
  'marketing',
  'junk_email',
  'newsletter',
  'internal',
  'meeting_request',
  'personal',
  'social',
  'notification',
  'other',
];

// Map AI responses (which might use group names) to valid enum values
const CATEGORY_MAPPING: Record<string, MessageCategory> = {
  // Direct matches (lowercase)
  'customer_inquiry': 'customer_inquiry',
  'customer_complaint': 'customer_complaint',
  'sales_lead': 'sales_lead',
  'client_support': 'client_support',
  'bill': 'bill',
  'invoice': 'invoice',
  'payment_confirmation': 'payment_confirmation',
  'authorization_code': 'authorization_code',
  'sign_in_code': 'sign_in_code',
  'security_alert': 'security_alert',
  'marketing': 'marketing',
  'junk_email': 'junk_email',
  'newsletter': 'newsletter',
  'internal': 'internal',
  'meeting_request': 'meeting_request',
  'personal': 'personal',
  'social': 'social',
  'notification': 'notification',
  'other': 'other',
  
  // Group names -> default category in that group
  'business/customer': 'customer_inquiry',
  'business': 'customer_inquiry',
  'customer': 'customer_inquiry',
  'financial': 'bill',
  'finance': 'bill',
  'security/auth': 'security_alert',
  'security': 'security_alert',
  'auth': 'authorization_code',
  'promotional/updates': 'marketing',
  'promotional': 'marketing',
  'updates': 'notification',
  'promo': 'marketing',
  'communication': 'internal',
  'comms': 'internal',
  
  // Common AI variations
  'security_auth': 'security_alert',
  'securityauth': 'security_alert',
  'promo_updates': 'marketing',
  'spam': 'junk_email',
  'junk': 'junk_email',
  'otp': 'authorization_code',
  'code': 'authorization_code',
  'verification': 'authorization_code',
  'alert': 'notification',
  'update': 'notification',
  'receipt': 'payment_confirmation',
  'payment': 'payment_confirmation',
};

/**
 * Normalize AI-returned category to valid database enum value
 */
function normalizeCategory(aiCategory: string | undefined | null): MessageCategory {
  if (!aiCategory) return 'other';
  
  // Convert to lowercase and remove extra spaces
  const normalized = aiCategory.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Check if it's already a valid category
  if (VALID_CATEGORIES.includes(normalized as MessageCategory)) {
    return normalized as MessageCategory;
  }
  
  // Try the mapping
  const mapped = CATEGORY_MAPPING[normalized];
  if (mapped) return mapped;
  
  // Try without underscores
  const withoutUnderscores = normalized.replace(/_/g, '');
  const mappedNoUnderscore = CATEGORY_MAPPING[withoutUnderscores];
  if (mappedNoUnderscore) return mappedNoUnderscore;
  
  // Try to match partial strings
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Default fallback
  console.warn(`Unknown category "${aiCategory}", defaulting to "other"`);
  return 'other';
}

// Lazy-load OpenAI client to avoid crashes on missing API key
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Please add it to your .env.local file to enable AI features.",
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

interface ClassificationResult {
  priority: MessagePriority;
  category: MessageCategory;
  sentiment: MessageSentiment;
  actionability: MessageActionability;
  summary?: string;
  summaryShort?: string; // Short summary for inbox list (max 180 chars)
  keyPoints?: string[];
  confidenceScore: number;
}

/**
 * Classify a message using AI
 * @param useAdminClient - Use admin client for background jobs (cron, webhooks)
 */
export async function classifyMessage(
  messageId: string,
  workspaceId: string,
  options: { useAdminClient?: boolean } = {},
): Promise<ClassificationResult> {
  try {
    const supabase = options.useAdminClient 
      ? supabaseAdminClient 
      : await createSupabaseUserServerActionClient();

    // Get the message with channel connection user_id
    const { data: message, error } = await supabase
      .from("messages")
      .select("*, channel_connection:channel_connections(user_id)")
      .eq("id", messageId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !message) {
      throw new Error("Message not found");
    }
    
    // Get the user_id from the channel connection
    const connectionUserId = (message.channel_connection as any)?.user_id;

    // Prepare prompt for OpenAI
    const prompt = `Analyze this email message and classify it:

Subject: ${message.subject || "(no subject)"}
From: ${message.sender_name || message.sender_email}
Body: ${message.body?.substring(0, 1500) || ""} ${(message.body?.length || 0) > 1500 ? "..." : ""}

CLASSIFICATION CATEGORIES (choose the MOST SPECIFIC match):

BUSINESS/CUSTOMER:
- customer_inquiry: Direct questions from customers (order status, shipping, product info)
- customer_complaint: Complaints, refund requests, negative feedback about service/product
- sales_lead: New business opportunities, prospects wanting info, potential clients
- client_support: Technical help requests, troubleshooting, how-to questions

FINANCIAL:
- bill: Bills, payment due notices, statements requesting payment
- invoice: Invoices, receipts, formal billing documents
- payment_confirmation: Payment successful confirmations, transaction receipts

SECURITY/AUTH:
- authorization_code: 2FA/OTP codes (usually 4-8 digits for verification)
- sign_in_code: Login codes, magic links, authentication codes
- security_alert: Login notifications, password changes, suspicious activity alerts

PROMOTIONAL/UPDATES:
- marketing: Sales promotions, discounts, product launches
- junk_email: Obvious spam, phishing attempts, unwanted mass emails
- newsletter: Regular newsletters, blog digests, periodic updates

COMMUNICATION:
- internal: Team/workplace messages, company announcements
- meeting_request: Calendar invites, scheduling requests
- personal: Friends, family, personal matters
- social: Social media notifications, event invites

OTHER:
- notification: Automated system alerts, app notifications, delivery updates
- other: Only if nothing else fits

PRIORITY RULES (strict):
- urgent: Auth codes, sign-in codes, security alerts, time-critical customer issues
- high: Customer inquiries/complaints, sales leads, client support
- medium: Bills, invoices, meetings, internal comms
- low: Personal, social, newsletters, notifications
- noise: Marketing, junk email

SENTIMENT:
- positive: Grateful, happy, appreciative tone
- neutral: Standard business tone, informational
- negative: Frustrated, angry, disappointed
- urgent: Time-sensitive, requires immediate action

ACTIONABILITY:
- question: Directly asking for information
- request: Asking for action/response
- fyi: Information only, no response needed
- scheduling_intent: About meetings/scheduling
- task: Contains clear task/to-do
- none: No action needed (confirmations, notifications)

CONFIDENCE SCORE CALCULATION (be realistic and varied):
Calculate based on these factors:
- 0.95-1.00: Crystal clear category (e.g., "Your code is 123456" = authorization_code)
- 0.85-0.94: Very clear with strong indicators
- 0.70-0.84: Clear but some ambiguity exists
- 0.55-0.69: Moderate ambiguity, could fit 2+ categories
- 0.40-0.54: High ambiguity, weak signals
- Below 0.40: Very unclear, essentially guessing

Short/vague messages like "Test", "Hi", or single words should have LOW confidence (0.40-0.60).
Generic messages without clear business context should be "notification" or "personal" with moderate confidence.

Respond with ONLY valid JSON:
{
  "category": "<category>",
  "priority": "<priority>",
  "sentiment": "<sentiment>",
  "actionability": "<actionability>",
  "summary": "<1-2 sentence summary>",
  "summaryShort": "<concise 1-line summary max 180 chars for inbox list - focus on key action/info, no greetings>",
  "keyPoints": ["<key point 1>", "<key point 2>"],
  "confidenceScore": <number between 0.35 and 1.0>
}`;

    const startTime = Date.now();

    // Call OpenAI with low temperature for consistent results
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert email classifier. Analyze emails accurately and provide realistic confidence scores.

CRITICAL: Confidence scores must reflect actual certainty:
- Only use 0.95+ for obvious cases (verification codes, clear customer complaints)
- Use 0.70-0.85 for most clear business emails
- Use 0.50-0.69 for ambiguous cases
- Use below 0.50 for unclear/vague messages

Short test messages, single-word emails, or vague content should ALWAYS have confidence below 0.60.
Be consistent: similar messages should get similar classifications.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Very low for consistency
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const processingTime = Date.now() - startTime;

    const rawResult = JSON.parse(
      completion.choices[0].message.content || "{}",
    ) as ClassificationResult;

    // Post-process confidence score to ensure realistic values
    let confidence = rawResult.confidenceScore;

    // Validate confidence is in range
    if (typeof confidence !== "number" || isNaN(confidence)) {
      confidence = 0.5;
    }
    confidence = Math.max(0.35, Math.min(1.0, confidence));

    // Adjust confidence based on message characteristics
    const bodyLength = message.body?.length || 0;
    const subjectLength = (message.subject || "").length;

    // Very short messages should have lower confidence
    if (bodyLength < 50 && subjectLength < 20) {
      confidence = Math.min(confidence, 0.6);
    }

    // Generic test-like messages should have low confidence
    const lowerBody = (message.body || "").toLowerCase();
    const lowerSubject = (message.subject || "").toLowerCase();
    if (
      lowerSubject.includes("test") ||
      lowerBody.includes("test message") ||
      lowerBody.match(/^test\s*\d*$/i)
    ) {
      confidence = Math.min(confidence, 0.55);
    }

    // Normalize category to valid enum value (AI sometimes returns group names or mixed case)
    const normalizedCategory = normalizeCategory(rawResult.category);
    
    const result: ClassificationResult = {
      ...rawResult,
      category: normalizedCategory,
      confidenceScore: Math.round(confidence * 100) / 100, // Round to 2 decimals
    };

    // Ensure priority is correctly assigned based on category
    // Override AI priority with our priority mapping logic for consistency
    const finalPriority = getPriorityFromCategory(
      normalizedCategory,
      result.sentiment,
      result.actionability,
    );

    // Generate short summary if not provided by AI
    let shortSummary = result.summaryShort;
    if (!shortSummary && result.summary) {
      // Truncate the regular summary to 180 chars
      shortSummary = result.summary.substring(0, 177) + (result.summary.length > 177 ? '...' : '');
    }

    // Update message with classification
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        priority: finalPriority, // Use mapped priority for consistency
        category: normalizedCategory, // Use normalized category
        sentiment: result.sentiment,
        actionability: result.actionability,
        summary: result.summary,
        ai_summary_short: shortSummary, // Short summary for inbox list
        key_points: result.keyPoints || [],
        confidence_score: result.confidenceScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (updateError) {
      console.error(`❌ Failed to update message ${messageId}:`, updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Log AI action
    await supabase.from("ai_action_logs").insert({
      workspace_id: workspaceId,
      user_id: connectionUserId || workspaceId, // Use connection owner's user_id
      action_type: "classification",
      input_ref: messageId,
      model_used: completion.model,
      prompt_tokens: completion.usage?.prompt_tokens,
      completion_tokens: completion.usage?.completion_tokens,
      total_tokens: completion.usage?.total_tokens,
      confidence_score: result.confidenceScore,
      input_data: {
        subject: message.subject,
        sender: message.sender_email,
        bodyLength: message.body.length,
      } as any,
      output_data: result as any,
      success: true,
      processing_time_ms: processingTime,
    });

    return result;
  } catch (error) {
    console.error("Message classification error:", error);
    throw error;
  }
}

/**
 * Batch classify multiple messages
 */
export async function batchClassifyMessages(
  messageIds: string[],
  workspaceId: string,
  options: { useAdminClient?: boolean } = {},
): Promise<{ successful: number; failed: number; results: any[] }> {
  const results = [];
  let successful = 0;
  let failed = 0;

  for (const messageId of messageIds) {
    try {
      const result = await classifyMessage(messageId, workspaceId, options);
      results.push({ messageId, success: true, result });
      successful++;
    } catch (error) {
      results.push({
        messageId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      failed++;
    }
  }

  return { successful, failed, results };
}

/**
 * Auto-classify new messages for a workspace
 */
export async function autoClassifyNewMessages(
  workspaceId: string,
  limit: number = 10,
  options: { useAdminClient?: boolean } = {},
) {
  const supabase = options.useAdminClient 
    ? supabaseAdminClient 
    : await createSupabaseUserServerActionClient();

  // Get unclassified messages
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("priority", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !messages || messages.length === 0) {
    return {
      success: true,
      message: "No unclassified messages found",
      classifiedCount: 0,
    };
  }

  const messageIds = messages.map((m) => m.id);
  const result = await batchClassifyMessages(messageIds, workspaceId, options);

  return {
    success: true,
    ...result,
  };
}
