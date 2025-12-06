/**
 * AI Reply Generator
 * Generates reply drafts for messages using OpenAI
 */

"use server";

import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { supabaseAdminClient } from "@/supabase-clients/admin/supabaseAdminClient";
import { OpenAI } from "openai";

// Lazy-load OpenAI client to avoid crashes on missing API key
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn(
        "[AI Reply] OPENAI_API_KEY not configured - AI features disabled",
      );
      return null;
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

interface ReplyOptions {
  tone?: "formal" | "casual" | "friendly" | "professional";
  includeQuote?: boolean;
  maxLength?: number;
  context?: string;
  useAdminClient?: boolean; // Use admin client for background jobs
  skipFeatureCheck?: boolean; // Skip feature check for cron jobs
}

interface ToneReason {
  factor: string;
  description: string;
  weight: number;
}

interface ToneReasoning {
  tone: string;
  reasons: ToneReason[];
  previousInteractionCount: number;
  confidenceInTone: number;
}

interface ReplyDraftResult {
  body: string;
  bodyHtml?: string;
  confidenceScore: number;
  tone: string;
  toneReasoning?: ToneReasoning;
  error?: string;
}

/**
 * Generate reply draft for a message
 * @param options.useAdminClient - Use admin client for background jobs (cron, webhooks)
 * @param options.skipFeatureCheck - Skip feature check for cron jobs
 */
export async function generateReplyDraft(
  messageId: string,
  workspaceId: string,
  options: ReplyOptions = {},
): Promise<ReplyDraftResult> {
  try {
    // Skip feature check for cron jobs
    if (!options.skipFeatureCheck) {
      // Check feature access - AI drafts require Pro plan
      const { getHasFeature } = await import("@/rsc-data/user/subscriptions");

      let hasAIDrafts = true;
      try {
        hasAIDrafts = await getHasFeature(workspaceId, "aiDrafts");
        console.log("[AI Reply] Feature check result:", {
          workspaceId,
          hasAIDrafts,
        });
      } catch (featureError) {
        // If feature check fails, allow access in development
        console.warn(
          "[AI Reply] Feature check failed, defaulting to allowed:",
          featureError,
        );
        hasAIDrafts = true;
      }

      if (!hasAIDrafts) {
        throw new Error(
          "AI reply drafts are a Pro feature. Upgrade your plan to access AI-powered reply generation.",
        );
      }
    }

    console.log("[AI Reply] Creating Supabase client...");
    const supabase = options.useAdminClient 
      ? supabaseAdminClient 
      : await createSupabaseUserServerActionClient();

    // Get the message with channel connection user_id
    console.log("[AI Reply] Fetching message:", { messageId, workspaceId });
    const { data: message, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        channel_connection:channel_connections(provider, provider_account_name, user_id)
      `,
      )
      .eq("id", messageId)
      .eq("workspace_id", workspaceId)
      .single();

    console.log("[AI Reply] Message fetch result:", {
      found: !!message,
      error: error?.message,
    });

    if (error || !message) {
      console.error("[AI Reply] Message not found:", {
        messageId,
        workspaceId,
        error,
      });
      throw new Error(
        `Message not found: ${error?.message || "No data returned"}`,
      );
    }

    console.log("[AI Reply] Message found:", {
      subject: message.subject,
      sender: message.sender_email,
    });

    const {
      tone = "professional",
      includeQuote = false,
      maxLength = 500,
      context = "",
    } = options;

    // Prepare conversation context and count previous interactions
    let conversationContext = "";
    let previousInteractionCount = 0;
    
    // Count previous interactions with this sender
    const { count: interactionCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("sender_email", message.sender_email);
    
    previousInteractionCount = interactionCount || 0;

    if (message.provider_thread_id) {
      // Get previous messages in thread
      const { data: threadMessages } = await supabase
        .from("messages")
        .select("sender_email, body, timestamp")
        .eq("provider_thread_id", message.provider_thread_id)
        .order("timestamp", { ascending: true })
        .limit(5);

      if (threadMessages && threadMessages.length > 0) {
        conversationContext = threadMessages
          .map(
            (m) =>
              `From ${m.sender_email} at ${new Date(m.timestamp).toLocaleString()}:\n${m.body.substring(0, 200)}`,
          )
          .join("\n\n");
      }
    }

    // Build prompt
    const prompt = `Generate a ${tone} email reply to the following message:

Subject: ${message.subject || "(no subject)"}
From: ${message.sender_name || message.sender_email}
Body:
${message.body}

${conversationContext ? `\n\nConversation Context:\n${conversationContext}` : ""}
${context ? `\n\nAdditional Context: ${context}` : ""}

REQUIREMENTS:
1. Tone: ${tone} (${tone === "formal" ? "Professional language, avoid contractions" : tone === "casual" ? "Friendly, conversational" : tone === "friendly" ? "Warm and approachable" : "Professional but approachable"})
2. Length: ~${maxLength} characters
3. ${includeQuote ? "Include relevant quote" : "No quoted text"}
4. Address main points from original
5. Be helpful and clear
6. End with appropriate closing
7. NO signature (added automatically)
8. NO "Dear/Hi" salutation - start directly with content

CONFIDENCE SCORE GUIDELINES (be realistic):
- 0.90-1.00: Clear question with obvious answer, straightforward acknowledgment
- 0.75-0.89: Most business replies with clear context
- 0.60-0.74: Some ambiguity in how to respond
- 0.45-0.59: Unclear what response is needed, sensitive topic
- Below 0.45: Very unclear context, might be wrong approach

AUTO-SEND CRITERIA (isAutoSendable):
- true: Simple acknowledgments, routine responses, non-sensitive
- false: Sensitive topics, financial matters, complaints, anything requiring human review

TONE REASONING:
Explain why you chose this tone based on:
- Sender relationship (is this a repeat contact or first-time?)
- Message content (what kind of request is it?)
- Context (what's the appropriate formality level?)

Format as JSON:
{
  "body": "<reply text>",
  "confidenceScore": <number 0.40-1.0>,
  "isAutoSendable": <boolean>,
  "toneReasoning": {
    "tone": "${tone}",
    "reasons": [
      { "factor": "sender_relationship", "description": "<why this tone fits the relationship>", "weight": <0.0-1.0> },
      { "factor": "message_content", "description": "<why this tone fits the content>", "weight": <0.0-1.0> },
      { "factor": "context", "description": "<why this tone fits the context>", "weight": <0.0-1.0> }
    ],
    "previousInteractionCount": ${previousInteractionCount},
    "confidenceInTone": <number 0.40-1.0>
  }
}`;

    const startTime = Date.now();

    // Call OpenAI
    const openai = getOpenAIClient();
    if (!openai) {
      console.log("[AI Reply] OpenAI not configured, returning fallback");
      return {
        body: "",
        confidenceScore: 0,
        tone: options.tone || "professional",
        error:
          "AI not configured. Please add OPENAI_API_KEY to enable AI features.",
      };
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert email assistant. Generate contextually appropriate replies.

CRITICAL: Confidence scores must be realistic and varied:
- Only use 0.90+ for simple, clear responses (thank you, confirmation, etc.)
- Use 0.70-0.89 for standard business replies with clear context
- Use 0.50-0.69 for ambiguous situations or sensitive topics
- Use below 0.50 when unsure about appropriate response

Be honest about uncertainty. Don't default to high confidence.
IMPORTANT: Always return valid, complete JSON. Keep replies concise.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5, // Moderate creativity for replies
      max_tokens: 1000, // Increased to ensure complete JSON response
      response_format: { type: "json_object" },
    });

    const processingTime = Date.now() - startTime;

    // Safely parse JSON with fallback
    let rawResult: any;
    const responseContent = completion.choices[0].message.content || "{}";
    
    try {
      rawResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("[AI Reply] JSON parse error, attempting to repair:", parseError);
      console.error("[AI Reply] Raw response:", responseContent.substring(0, 500));
      
      // Try to extract just the body if JSON is malformed
      const bodyMatch = responseContent.match(/"body"\s*:\s*"([^"]*(?:\\"[^"]*)*)"/);
      if (bodyMatch) {
        rawResult = {
          body: bodyMatch[1].replace(/\\"/g, '"'),
          confidenceScore: 0.6,
          isAutoSendable: false,
        };
        console.log("[AI Reply] Recovered body from malformed JSON");
      } else {
        // Last resort: return a generic error response
        return {
          body: "",
          confidenceScore: 0,
          tone: options.tone || "professional",
          error: "AI response was incomplete. Please try again.",
        };
      }
    }

    // Post-process confidence score to ensure realistic values
    let confidence = rawResult.confidenceScore;
    if (typeof confidence !== "number" || isNaN(confidence)) {
      confidence = 0.65; // Default to moderate confidence
    }
    confidence = Math.max(0.4, Math.min(1.0, confidence));

    // Adjust based on message characteristics
    const messageBody = message.body || "";
    const lowerBody = messageBody.toLowerCase();

    // Sensitive topics should reduce confidence
    const sensitiveKeywords = [
      "refund",
      "complaint",
      "legal",
      "urgent",
      "emergency",
      "angry",
      "disappointed",
      "terrible",
    ];
    if (sensitiveKeywords.some((kw) => lowerBody.includes(kw))) {
      confidence = Math.min(confidence, 0.7);
    }

    // Very short original messages are harder to respond to appropriately
    if (messageBody.length < 100) {
      confidence = Math.min(confidence, 0.75);
    }

    const result = {
      ...rawResult,
      confidenceScore: Math.round(confidence * 100) / 100,
    };

    // Build tone reasoning with defaults if not provided by AI
    const toneReasoning: ToneReasoning = result.toneReasoning || {
      tone,
      reasons: [
        { factor: "sender_relationship", description: previousInteractionCount > 0 ? "Existing contact relationship" : "First-time interaction", weight: 0.4 },
        { factor: "message_content", description: "Based on message intent and formality", weight: 0.35 },
        { factor: "context", description: "Appropriate for the conversation topic", weight: 0.25 },
      ],
      previousInteractionCount,
      confidenceInTone: result.confidenceScore,
    };

    // Get the user_id from the channel connection (the user who connected this channel)
    const connectionUserId = (message.channel_connection as any)?.user_id;
    
    // Store draft in database
    const draftInsert = {
        workspace_id: workspaceId,
        user_id: connectionUserId || workspaceId, // Use connection owner's user_id, fallback to workspace (may fail)
        message_id: messageId,
        body: result.body,
        tone,
        generated_by_ai: true,
        confidence_score: result.confidenceScore,
        is_auto_sendable: result.isAutoSendable || false,
      tone_reasoning: toneReasoning as any,
      context_data: {
        previousInteractionCount,
        hasThreadContext: !!conversationContext,
        senderEmail: message.sender_email,
        senderName: message.sender_name,
      } as any,
    };

    const { data: draft, error: draftError } = await supabase
      .from("message_drafts")
      .insert(draftInsert)
      .select()
      .single();

    if (draftError) {
      console.error("Failed to store draft:", draftError);
    }

    // Update message to indicate draft exists
    await supabase
      .from("messages")
      .update({
        has_draft_reply: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    // Log draft result for debugging
    console.log('[AI Reply] Draft result:', {
      draftSaved: !!draft,
      draftId: draft?.id,
      isAutoSendable: result.isAutoSendable,
      confidenceScore: result.confidenceScore,
    });

    // Check if draft is auto-sendable and queue for auto-send
    // We now check auto-send even if isAutoSendable is false, using confidence threshold as the main gate
    if (draft) {
      try {
        // Get workspace auto-send threshold (default 0.70 if not set)
        const { data: wsSettings } = await supabase
          .from('workspace_settings')
          .select('auto_send_enabled, auto_send_confidence_threshold')
          .eq('workspace_id', workspaceId)
          .single();

        const autoSendEnabled = wsSettings?.auto_send_enabled ?? false;
        const threshold = wsSettings?.auto_send_confidence_threshold ?? 0.70;
        
        console.log('[AI Reply] Auto-send check:', {
          enabled: autoSendEnabled,
          threshold,
          confidenceScore: result.confidenceScore,
          isAutoSendable: result.isAutoSendable,
          meetsThreshold: result.confidenceScore >= threshold,
        });

        // Queue for auto-send if:
        // 1. Auto-send is enabled for workspace
        // 2. Confidence meets threshold (primary gate)
        // 3. AI marked it as auto-sendable OR confidence is very high (>= 0.80)
        const shouldQueue = autoSendEnabled && 
          result.confidenceScore >= threshold && 
          (result.isAutoSendable || result.confidenceScore >= 0.80);

        if (shouldQueue) {
          const { queueAutoSend } = await import('@/lib/workers/auto-send-worker');
          const queueResult = await queueAutoSend(
            workspaceId,
            messageId,
            draft.id,
            message.channel_connection_id,
            result.confidenceScore
          );
          
          if (queueResult.queued) {
            console.log('[AI Reply] Draft queued for auto-send at:', queueResult.scheduledAt);
          } else {
            console.log('[AI Reply] Auto-send not queued:', queueResult.reason);
          }
        } else if (!autoSendEnabled) {
          console.log('[AI Reply] Auto-send disabled for workspace');
        } else if (result.confidenceScore < threshold) {
          console.log('[AI Reply] Confidence below threshold:', result.confidenceScore, '<', threshold);
        } else {
          console.log('[AI Reply] AI marked as not auto-sendable and confidence < 0.80');
        }
      } catch (autoSendError) {
        // Don't fail the whole operation if auto-send queueing fails
        console.error('[AI Reply] Failed to queue auto-send:', autoSendError);
      }
    } else {
      console.log('[AI Reply] Draft not saved, skipping auto-send queue');
    }

    // Log AI action
    await supabase.from("ai_action_logs").insert({
      workspace_id: workspaceId,
      user_id: connectionUserId || workspaceId, // Use connection owner's user_id
      action_type: "reply_draft",
      input_ref: messageId,
      output_ref: draft?.id,
      model_used: completion.model,
      prompt_tokens: completion.usage?.prompt_tokens,
      completion_tokens: completion.usage?.completion_tokens,
      total_tokens: completion.usage?.total_tokens,
      confidence_score: result.confidenceScore,
      input_data: {
        messageId,
        tone,
        maxLength,
      },
      output_data: {
        bodyLength: result.body.length,
        isAutoSendable: result.isAutoSendable,
      },
      success: true,
      processing_time_ms: processingTime,
    });

    return {
      body: result.body,
      confidenceScore: result.confidenceScore,
      tone,
      toneReasoning,
    };
  } catch (error) {
    console.error("[AI Reply] Generation error:", error);
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("OPENAI_API_KEY")) {
        throw new Error(
          "AI features are not configured. Please contact support.",
        );
      }
      throw error;
    }
    throw new Error("Failed to generate reply. Please try again.");
  }
}

/**
 * Generate multiple reply variations
 */
export async function generateReplyVariations(
  messageId: string,
  workspaceId: string,
): Promise<ReplyDraftResult[]> {
  // Check feature access - AI drafts require Pro plan
  const { getHasFeature } = await import("@/rsc-data/user/subscriptions");
  const hasAIDrafts = await getHasFeature(workspaceId, "aiDrafts");

  if (!hasAIDrafts) {
    throw new Error(
      "AI reply drafts are a Pro feature. Upgrade your plan to access AI-powered reply generation.",
    );
  }

  const tones: Array<"formal" | "casual" | "friendly" | "professional"> = [
    "professional",
    "friendly",
    "casual",
  ];

  const results = [];

  for (const tone of tones) {
    try {
      const result = await generateReplyDraft(messageId, workspaceId, { tone });
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate ${tone} reply:`, error);
    }
  }

  return results;
}

/**
 * Check if a draft is suitable for auto-send
 * (Internal utility function - not exported as Server Action)
 */
function isAutoSendable(
  confidenceScore: number,
  messageCategory?: string,
  messagePriority?: string,
): boolean {
  // Auto-send criteria
  const minConfidenceScore = 0.85;

  // Don't auto-send high priority or sales leads
  const blockAutoSendCategories = ["sales_lead"];
  const blockAutoSendPriorities = ["high"];

  if (confidenceScore < minConfidenceScore) {
    return false;
  }

  if (messageCategory && blockAutoSendCategories.includes(messageCategory)) {
    return false;
  }

  if (messagePriority && blockAutoSendPriorities.includes(messagePriority)) {
    return false;
  }

  return true;
}

/**
 * Extract tasks from message content
 */
export async function extractTasks(
  messageId: string,
  workspaceId: string,
): Promise<Array<{ title: string; description?: string; dueDate?: string }>> {
  try {
    const supabase = await createSupabaseUserServerActionClient();

    // Get the message
    const { data: message, error } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !message) {
      throw new Error("Message not found");
    }

    const prompt = `Analyze this email and extract any actionable tasks:

Subject: ${message.subject || "(no subject)"}
From: ${message.sender_email}
Body:
${message.body}

Extract any tasks, action items, or to-dos mentioned in this message.
For each task:
1. Provide a clear, concise title (5-10 words)
2. Add description if needed
3. Identify due date if mentioned (return as ISO date string)

Respond ONLY with valid JSON array:
[
  {
    "title": "Task title",
    "description": "Optional description",
    "dueDate": "2024-12-31" (if mentioned)
  }
]

If no tasks found, return empty array: []`;

    const openai = getOpenAIClient();
    if (!openai) {
      console.log("[AI Reply] OpenAI not configured for task extraction");
      return [];
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting actionable tasks from emails. Be precise and conservative - only extract clear, actionable items.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      completion.choices[0].message.content || '{"tasks": []}',
    );
    const tasks = result.tasks || [];

    // Log AI action
    await supabase.from("ai_action_logs").insert({
      workspace_id: workspaceId,
      user_id: workspaceId, // Placeholder
      action_type: "task_extraction",
      input_ref: messageId,
      model_used: completion.model,
      prompt_tokens: completion.usage?.prompt_tokens,
      completion_tokens: completion.usage?.completion_tokens,
      total_tokens: completion.usage?.total_tokens,
      input_data: { messageId },
      output_data: { tasksFound: tasks.length, tasks },
      success: true,
    });

    return tasks;
  } catch (error) {
    console.error("Task extraction error:", error);
    throw error;
  }
}

/**
 * Detect scheduling intent
 */
export async function detectSchedulingIntent(
  messageId: string,
  workspaceId: string,
): Promise<{
  hasIntent: boolean;
  proposedTimes?: string[];
  duration?: number;
  location?: string;
}> {
  try {
    const supabase = await createSupabaseUserServerActionClient();

    const { data: message, error } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !message) {
      throw new Error("Message not found");
    }

    const prompt = `Analyze this email for scheduling or meeting intent:

Subject: ${message.subject || "(no subject)"}
Body:
${message.body}

Determine:
1. Does this message contain intent to schedule a meeting/call?
2. Are specific times proposed?
3. Is duration mentioned?
4. Is location/platform mentioned?

Respond with JSON:
{
  "hasIntent": true/false,
  "proposedTimes": ["ISO date strings"],
  "duration": minutes (number),
  "location": "string or null"
}`;

    const openai = getOpenAIClient();
    if (!openai) {
      console.log("[AI Reply] OpenAI not configured for scheduling detection");
      return { hasIntent: false };
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at detecting scheduling intent in emails. Be accurate and extract specific details.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    // Log AI action
    await supabase.from("ai_action_logs").insert({
      workspace_id: workspaceId,
      user_id: workspaceId,
      action_type: "scheduling_detection",
      input_ref: messageId,
      model_used: completion.model,
      input_data: { messageId },
      output_data: result,
      success: true,
    });

    return result;
  } catch (error) {
    console.error("Scheduling detection error:", error);
    throw error;
  }
}
