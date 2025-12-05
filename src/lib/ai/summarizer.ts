/**
 * AI Message Summarizer
 * Lightweight summarizer for generating short message summaries for inbox list
 */

"use server";

import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { OpenAI } from "openai";

// Lazy-load OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("[Summarizer] OPENAI_API_KEY not configured");
      return null;
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate a short summary for inbox list display
 * Max 200 characters, focuses on the key point/action
 */
export async function generateShortSummary(
  subject: string | null,
  body: string | null,
  senderName: string | null
): Promise<string> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    // Fallback: return truncated body
    const fallback = body?.replace(/<[^>]*>/g, '').trim() || '';
    return fallback.substring(0, 197) + (fallback.length > 197 ? '...' : '');
  }

  const truncatedBody = body?.substring(0, 1000) || '';

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert email summarizer. Create a brief, human-readable summary for inbox display.

RULES:
- Maximum 180 characters (leave room for ellipsis)
- Focus on the KEY action or information
- Use natural, conversational language
- Start with the most important point
- No greetings or pleasantries
- If it's a request, summarize what they're asking for
- If it's informational, summarize the key info
- Never use "This email..." - be direct

Examples:
- "Requesting approval for Q4 budget increase of $15,000"
- "Your order #12345 has shipped and will arrive Monday"
- "Invitation to product launch event on Dec 15th at 2pm"
- "Asking for feedback on the new marketing proposal"
- "Confirmation of tomorrow's 3pm meeting with the team"`,
        },
        {
          role: "user",
          content: `Subject: ${subject || "(no subject)"}
From: ${senderName || "Unknown"}
Content: ${truncatedBody}

Generate a brief summary (max 180 chars):`,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const summary = completion.choices[0].message.content?.trim() || '';
    // Ensure max length
    return summary.substring(0, 197) + (summary.length > 197 ? '...' : '');
  } catch (error) {
    console.error("[Summarizer] Error generating summary:", error);
    // Fallback to truncated body
    const fallback = body?.replace(/<[^>]*>/g, '').trim() || '';
    return fallback.substring(0, 197) + (fallback.length > 197 ? '...' : '');
  }
}

/**
 * Generate and store short summary for a message
 */
export async function summarizeMessage(
  messageId: string,
  workspaceId: string
): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    const supabase = await createSupabaseUserServerActionClient();

    // Get the message
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("subject, body, sender_name, ai_summary_short")
      .eq("id", messageId)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !message) {
      return { success: false, error: "Message not found" };
    }

    // Skip if already has summary
    if (message.ai_summary_short) {
      return { success: true, summary: message.ai_summary_short };
    }

    // Generate summary
    const summary = await generateShortSummary(
      message.subject,
      message.body,
      message.sender_name
    );

    // Store in database
    const { error: updateError } = await supabase
      .from("messages")
      .update({ ai_summary_short: summary })
      .eq("id", messageId);

    if (updateError) {
      console.error("[Summarizer] Error storing summary:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, summary };
  } catch (error) {
    console.error("[Summarizer] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Batch summarize messages without summaries
 */
export async function batchSummarizeMessages(
  workspaceId: string,
  limit: number = 20
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const supabase = await createSupabaseUserServerActionClient();

  // Get messages without summaries
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, subject, body, sender_name")
    .eq("workspace_id", workspaceId)
    .is("ai_summary_short", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !messages) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const message of messages) {
    try {
      const summary = await generateShortSummary(
        message.subject,
        message.body,
        message.sender_name
      );

      const { error: updateError } = await supabase
        .from("messages")
        .update({ ai_summary_short: summary })
        .eq("id", message.id);

      if (updateError) {
        failed++;
      } else {
        succeeded++;
      }
    } catch {
      failed++;
    }
  }

  return { processed: messages.length, succeeded, failed };
}

