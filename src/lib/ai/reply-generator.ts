/**
 * AI Reply Generator
 * Generates reply drafts for messages using OpenAI
 */

"use server";

import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { supabaseAdminClient } from "@/supabase-clients/admin/supabaseAdminClient";
import { OpenAI } from "openai";
import { verifySchedulingConfirmation, isSchedulingConfirmation, CalendarVerificationResult } from './calendar-verifier';
import { getCustomerOrderHistory, formatCustomerHistoryForAI } from '@/lib/shopify/context';

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
  isManualDraft?: boolean; // If true, this is a manual draft from user clicking "Draft with AI" - should NEVER auto-send
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
  // Human review fields
  holdForReview?: boolean;
  reviewReason?: string;
  calendarContext?: CalendarVerificationResult;
  aiUncertaintyNotes?: string;
}

/**
 * Generate reply draft for a message
 * @param options.useAdminClient - Use admin client for background jobs (cron, webhooks)
 */
export async function generateReplyDraft(
  messageId: string,
  workspaceId: string,
  options: ReplyOptions = {},
): Promise<ReplyDraftResult> {
  try {
    // Check feature access - AI drafts require Pro plan
    // FAIL CLOSED: Always check, no bypass
    const { getHasFeature } = await import("@/rsc-data/user/subscriptions");

    const hasAIDrafts = await getHasFeature(workspaceId, "aiDrafts");
    console.log("[AI Reply] Feature check result:", {
      workspaceId,
      hasAIDrafts,
    });

    if (!hasAIDrafts) {
      return {
        body: "",
        confidenceScore: 0,
        tone: "professional",
        error: "AI reply drafts require a Professional or Enterprise plan. Please upgrade to access AI-powered reply generation.",
      };
    }

    console.log("[AI Reply] Creating Supabase client...");
    const supabase = options.useAdminClient 
      ? supabaseAdminClient 
      : await createSupabaseUserServerActionClient();

    // CRITICAL: Check if a draft already exists for this message to prevent duplicates
    // This prevents race conditions when multiple syncs process the same message
    const { data: existingDrafts } = await supabase
      .from("message_drafts")
      .select("id, body, is_auto_sendable, auto_sent, hold_for_review")
      .eq("message_id", messageId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingDrafts && existingDrafts.length > 0) {
      const existingDraft = existingDrafts[0];
      console.log("[AI Reply] Draft already exists for this message:", {
        draftId: existingDraft.id,
        hasBody: !!existingDraft.body,
        isAutoSendable: existingDraft.is_auto_sendable,
        autoSent: existingDraft.auto_sent,
        holdForReview: existingDraft.hold_for_review,
      });
      
      // Return existing draft info instead of creating a duplicate
      // If draft was already sent, return error. Otherwise return the existing draft body.
      if (existingDraft.auto_sent) {
        return {
          body: existingDraft.body ?? "",
          confidenceScore: 0.9,
          tone: "professional",
          error: "Draft already sent",
        };
      }
      
      if (existingDraft.hold_for_review) {
        return {
          body: existingDraft.body ?? "",
          confidenceScore: 0.9,
          tone: "professional",
          holdForReview: true,
          error: "Draft held for review",
        };
      }
      
      // Draft exists but not sent - return it
      return {
        body: existingDraft.body ?? "",
        confidenceScore: 0.9,
        tone: "professional",
      };
    }

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

    // ============================================
    // CHECK THREAD REPLY LIMIT (before generating draft)
    // ============================================
    // This check must happen here so it applies to both manual and automatic draft generation
    let threadLimitReached = false;
    if (message.provider_thread_id && message.channel_connection) {
      try {
        // Get workspace settings for max replies per thread
        const { data: wsSettings } = await supabase
          .from('workspace_settings')
          .select('auto_send_max_replies_per_thread')
          .eq('workspace_id', workspaceId)
          .single();

        const maxRepliesPerThread = wsSettings?.auto_send_max_replies_per_thread ?? 2;
        
        // Get connection email
        const connectionEmail = (message.channel_connection as any)?.provider_account_name || 
                               (message.channel_connection as any)?.provider_account_id || '';
        
        if (connectionEmail) {
          const { hasRepliedToThread } = await import('@/lib/workers/auto-send-worker');
          const threadCheck = await hasRepliedToThread(
            message.provider_thread_id,
            workspaceId,
            connectionEmail,
            maxRepliesPerThread
          );
          
          if (threadCheck.hasReplied) {
            threadLimitReached = true;
            console.log('[AI Reply] Thread reply limit reached:', {
              replyCount: threadCheck.replyCount,
              maxReplies: maxRepliesPerThread,
              threadId: message.provider_thread_id,
            });
            
            // Mark message as requiring human review if not already marked
            if (!message.requires_human_review) {
              await supabase
                .from('messages')
                .update({
                  requires_human_review: true,
                  review_reason: 'thread_reply_limit_reached',
                  review_context: {
                    reason: `Thread reply limit reached (${threadCheck.replyCount}/${maxRepliesPerThread})`,
                    threadId: message.provider_thread_id,
                    replyCount: threadCheck.replyCount,
                    maxReplies: maxRepliesPerThread,
                    markedAt: new Date().toISOString(),
                  },
                })
                .eq('id', messageId);
              
              // Update message object for later use
              message.requires_human_review = true;
              message.review_reason = 'thread_reply_limit_reached';
            }
          }
        }
      } catch (threadCheckError) {
        console.warn('[AI Reply] Error checking thread reply limit:', threadCheckError);
        // Continue with draft generation even if check fails
      }
    }

    // ============================================
    // HUMAN REVIEW DETECTION
    // ============================================
    let needsHumanReview = false;
    let reviewReason: string | undefined;
    let calendarContext: CalendarVerificationResult | undefined;
    let aiUncertaintyNotes: string | undefined;

    // Check if message was already flagged for review by classifier or thread limit
    if (message.requires_human_review) {
      needsHumanReview = true;
      reviewReason = message.review_reason || 'flagged_by_classifier';
      aiUncertaintyNotes = (message.review_context as any)?.reason || 'Message flagged during classification';
      console.log('[AI Reply] Message flagged for human review:', reviewReason);
    }

    // Check for scheduling confirmation (even if not flagged by classifier)
    const schedulingCheck = await isSchedulingConfirmation(
      message.subject || '',
      message.body || ''
    );

    if (schedulingCheck.isConfirmation && schedulingCheck.confidence >= 0.6) {
      console.log('[AI Reply] Detected scheduling confirmation, verifying calendar...');
      
      try {
        calendarContext = await verifySchedulingConfirmation(
          messageId,
          workspaceId,
          message.sender_email,
          message.sender_name || undefined,
          { useAdminClient: options.useAdminClient }
        );

        console.log('[AI Reply] Calendar verification result:', {
          hasMatchingEvent: calendarContext.hasMatchingEvent,
          suggestedAction: calendarContext.suggestedAction,
          confidence: calendarContext.confidence,
        });

        // If no matching event found, require human review
        if (!calendarContext.hasMatchingEvent || calendarContext.suggestedAction === 'ask_human') {
          needsHumanReview = true;
          reviewReason = 'calendar_mismatch';
          aiUncertaintyNotes = calendarContext.context;
        } else if (calendarContext.suggestedAction === 'no_calendar') {
          needsHumanReview = true;
          reviewReason = 'no_calendar_connected';
          aiUncertaintyNotes = 'No calendar connected to verify this scheduling confirmation';
        }
      } catch (calError) {
        console.error('[AI Reply] Calendar verification error:', calError);
        // Don't block on calendar errors, just flag for review
        needsHumanReview = true;
        reviewReason = 'calendar_check_failed';
        aiUncertaintyNotes = 'Could not verify calendar for scheduling confirmation';
      }
    }
    // ============================================

    // Prepare conversation context and count previous interactions
    let conversationContext = "";
    let previousInteractionCount = 0;
    let shopifyCustomerContext = "";
    
    // Count previous interactions with this sender
    const { count: interactionCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("sender_email", message.sender_email);
    
    previousInteractionCount = interactionCount || 0;

    // Fetch Shopify customer order history if sender email exists
    // SECURITY: Only fetch data for the sender's email - never for other customers
    if (message.sender_email) {
      try {
        // Validate: Only use the sender's email for context retrieval
        const senderEmail = message.sender_email.toLowerCase().trim();
        if (!senderEmail || !senderEmail.includes('@')) {
          console.warn("[AI Reply] Invalid sender email, skipping Shopify context");
        } else {
          console.log("[AI Reply] Fetching Shopify order history for sender:", senderEmail);
          // Extract order number from message if mentioned
          const messageText = `${message.subject || ''} ${message.body || ''}`;
          const customerHistory = await getCustomerOrderHistory(
            workspaceId,
            senderEmail, // Always use sender's email - never accept email from message body
            { 
              useAdminClient: options.useAdminClient,
              messageText: messageText, // Pass message text to extract order number
            }
          );
          
          if (customerHistory.orderCount > 0) {
            shopifyCustomerContext = formatCustomerHistoryForAI(customerHistory);
            console.log("[AI Reply] ✅ Found Shopify customer with", customerHistory.orderCount, "orders for", senderEmail);
            console.log("[AI Reply] Order details:", JSON.stringify(customerHistory.orders.slice(0, 2).map(o => ({
              orderNumber: o.orderNumber,
              status: `${o.financialStatus}/${o.fulfillmentStatus}`,
              total: o.totalPrice
            }))));
          } else {
            console.log("[AI Reply] ⚠️ No orders found for sender:", senderEmail);
          }
        }
      } catch (shopifyError) {
        console.error("[AI Reply] ❌ Failed to fetch Shopify context:", shopifyError);
        // Don't block on Shopify errors, just continue without context
      }
    } else {
      console.log("[AI Reply] No sender email, skipping Shopify context");
    }

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

    // Get workspace AI context and rules
    let workspaceAIContext = "";
    let workspaceAIRules = "";
    
    try {
      const { data: wsSettings } = await supabase
        .from('workspace_settings')
        .select('workspace_settings')
        .eq('workspace_id', workspaceId)
        .single();

      if (wsSettings?.workspace_settings) {
        const aiSettings = (wsSettings.workspace_settings as any)?.ai || {};
        workspaceAIContext = aiSettings.context || "";
        workspaceAIRules = aiSettings.rules || "";
      }
    } catch (error) {
      console.warn('[AI Reply] Failed to fetch workspace AI settings:', error);
    }

    // Build prompt
    const prompt = `Generate a ${tone} email reply to the following message:

Subject: ${message.subject || "(no subject)"}
From: ${message.sender_name || message.sender_email}
Body:
${message.body}

${conversationContext ? `\n\nConversation Context:\n${conversationContext}` : ""}
${shopifyCustomerContext ? `\n\n🛒 CUSTOMER ORDER INFORMATION (USE THIS TO ANSWER ORDER QUESTIONS):
${shopifyCustomerContext}

⚠️ IMPORTANT: If the sender is asking about their order status, shipping, or delivery, you MUST use the order information above to provide a specific answer. Do NOT say "I'll check on that" if you have their order data - tell them the actual status, order number, and details from the information above.` : ""}
${context ? `\n\nAdditional Context: ${context}` : ""}
${workspaceAIContext ? `\n\nWORKSPACE CONTEXT (CRITICAL - Refer to this for understanding your role and the business):\n${workspaceAIContext}` : ""}
${workspaceAIRules ? `\n\nWORKSPACE RULES (CRITICAL - You MUST follow these strictly):\n${workspaceAIRules}` : ""}

${workspaceAIContext || workspaceAIRules ? `\n\n⚠️ CRITICAL INSTRUCTIONS:
${workspaceAIContext ? `- REFER TO WORKSPACE CONTEXT above to understand your role, the business, products, and context before replying.` : ''}
${workspaceAIRules ? `- FOLLOW WORKSPACE RULES above STRICTLY. These rules override default behavior.` : ''}
` : ''}
${calendarContext ? `
📅 CALENDAR CONTEXT (scheduling – follow strictly):
${calendarContext.hasMatchingEvent
  ? `- The person emailing (${message.sender_name || message.sender_email}) IS the attendee of the matching event. Confirm clearly that the meeting/plan is still on with them (e.g. "Yes, we're still on for Tuesday 3pm" or "Yes, I have it on with you"). They can cancel or reschedule if they need to. You may reference the event specifically.`
  : calendarContext.hasEventInRangeButNotWithSender
    ? `- You have an event in this time range but the person emailing is NOT the attendee. Do NOT disclose who the meeting is with or any details. Reply vaguely that you have plans / are not available (e.g. "I have something on then", "I'm not available", "I have plans"). Never reveal the other person's name or that it's a meeting with someone else.`
    : `- No matching event with this sender. ${calendarContext.context}`}
` : ''}

REQUIREMENTS:
1. Tone: ${tone} (${tone === "formal" ? "Professional language, avoid contractions" : tone === "casual" ? "Friendly, conversational" : tone === "friendly" ? "Warm and approachable" : "Professional but approachable"})
2. Length: ~${maxLength} characters
3. ${includeQuote ? "Include relevant quote" : "No quoted text"}
4. Address main points from original
5. Be helpful and clear
6. End with appropriate closing
7. NO signature (added automatically)
8. NO "Dear/Hi" salutation - start directly with content
9. DO NOT FABRICATE INFORMATION: Only use information explicitly provided in the context. If asked about policies, product details, or other information not in the context, acknowledge you don't have that information rather than making it up.
10. MISSING INFORMATION HANDLING: 
    - For ROUTINE questions (policies, shipping times, return policies, general info): You can still auto-reply with a helpful acknowledgment like "Let me check on that for you" or "I'll get back to you with that information". Set "hasMissingInformation" to true but "isAutoSendable" to true if confidence is good (>= 0.60).
    - For CRITICAL information (pricing quotes, delivery commitments, deadlines, availability for specific dates): Set "hasMissingInformation" to true and "isAutoSendable" to false. These require human verification.
    - Only mark as missing critical information if it could cause problems if auto-replied incorrectly (pricing, commitments, deadlines).
    - For routine policy/shipping questions, you can still auto-send a helpful acknowledgment.
${workspaceAIRules ? `11. STRICTLY follow the WORKSPACE RULES provided above` : ''}

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
  "hasMissingInformation": <boolean - true if you're missing critical information needed to answer>,
  "missingInformationType": "<string - optional: 'policy', 'product', 'pricing', 'availability', 'other', or null>",
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

    // Build system message with context and rules
    let systemMessage = `You are an expert email assistant. Generate contextually appropriate replies.

CRITICAL: Confidence scores must be realistic and varied:
- Only use 0.90+ for simple, clear responses (thank you, confirmation, etc.)
- Use 0.70-0.89 for standard business replies with clear context
- Use 0.50-0.69 for ambiguous situations or sensitive topics
- Use below 0.50 when unsure about appropriate response

🚨 CRITICAL: DO NOT FABRICATE INFORMATION
- ONLY use information explicitly provided in the context below
- DO NOT make up policies, product categories, return policies, shipping details, or any other information
- If information is not available in the context, respond with "Let me check on that for you" or "I'll get back to you with that information"
- DO NOT infer or assume details that aren't explicitly stated
- For ROUTINE questions (policies, shipping, returns): You can auto-reply with a helpful acknowledgment - set "isAutoSendable" to true if confidence is good (>= 0.60)
- For CRITICAL information (pricing, commitments, deadlines): Mark as not auto-sendable and require human review
- Only mark as "missing critical information" if it's truly critical (pricing, commitments, deadlines) - not for routine policy questions`;

    // Add workspace context to system message (CRITICAL - AI must understand its role)
    if (workspaceAIContext) {
      systemMessage += `\n\nWORKSPACE CONTEXT (Your role and business context - refer to this before replying):\n${workspaceAIContext}`;
    }

    // Add workspace rules to system message (CRITICAL - AI must follow these strictly)
    if (workspaceAIRules) {
      systemMessage += `\n\nWORKSPACE RULES (You MUST follow these rules strictly when replying):\n${workspaceAIRules}`;
    }

    if (shopifyCustomerContext) {
      systemMessage += `\n\nSHOPIFY CONTEXT: When the sender is a known Shopify customer, you can reference their order history to provide personalized responses. Mention specific order numbers, products, or purchase dates when relevant to the inquiry. ONLY use information from the order history provided - do not make up details.

🚨 CRITICAL SECURITY RULES FOR SHOPIFY DATA:
- ONLY reference orders that belong to the SENDER (the person who sent this email)
- NEVER reveal information about other customers' orders, addresses, phone numbers, or personal details
- If the sender asks about an order number that is NOT in their order history, do NOT provide information about it - instead say "I don't see that order in your account, could you verify the order number?"
- NEVER mention other customers' names, emails, addresses, or any personal information
- The order history provided is ONLY for the sender - if they mention another customer's name or email, do NOT look up or reveal that customer's data
- If asked about someone else's order, politely decline: "I can only access information about your own orders for privacy reasons"`;
    }

    // Add final instructions
    systemMessage += `\n\nBe honest about uncertainty. Don't default to high confidence.
IMPORTANT: Always return valid, complete JSON. Keep replies concise.
REMEMBER: Missing information handling:
- ROUTINE questions (policies, shipping, returns): Can auto-reply with acknowledgment - set "isAutoSendable" to true if confidence >= 0.60
- CRITICAL information (pricing, commitments, deadlines): Mark "isAutoSendable" to false - requires human review
- Only mark as "missing critical information" for truly critical info that could cause problems if auto-replied incorrectly`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemMessage,
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
    
    // Check if AI indicated missing information
    const hasMissingInfo = rawResult.hasMissingInformation === true;
    const missingInfoType = rawResult.missingInformationType || 'unknown';
    
    // Critical missing information types that should always hold for review
    // These are things that could cause problems if auto-replied incorrectly
    const criticalMissingInfoTypes = ['pricing', 'commitment', 'availability', 'deadline', 'delivery_date'];
    const isCriticalMissingInfo = hasMissingInfo && criticalMissingInfoTypes.includes(missingInfoType);
    
    // Check if message is a complaint - complaints should always require human review
    const isComplaint = message.category === 'customer_complaint';
    
    // Get excluded categories from workspace settings
    // Bills/invoices should only require review if they're in excluded categories
    // Otherwise, they can auto-send if confidence is high (especially for Shopify orders with data)
    const { data: wsSettingsForExcluded } = await supabase
      .from('workspace_settings')
      .select('auto_send_excluded_categories')
      .eq('workspace_id', workspaceId)
      .single();
    
    const excludedCategories = Array.isArray(wsSettingsForExcluded?.auto_send_excluded_categories)
      ? wsSettingsForExcluded.auto_send_excluded_categories.map((c: string) => c.toLowerCase())
      : [];
    
    // Check if bills/invoices are excluded by user settings
    const isBillOrInvoice = message.category === 'bill' || message.category === 'invoice';
    const isBillInvoiceExcluded = isBillOrInvoice && message.category && excludedCategories.includes(message.category.toLowerCase());
    
    // Categories that should always require human review (regardless of excluded settings)
    // Bills/invoices are NOT in this list - they can auto-send if not excluded and confidence is high
    const alwaysReviewCategories = [
      'customer_complaint',  // Complaints need human handling
      'sales_lead',          // Business opportunities need human follow-up
      // REMOVED: 'bill' and 'invoice' - they can auto-send if not excluded and confidence is high
    ];
    const isAlwaysReviewCategory = message.category && alwaysReviewCategories.includes(message.category);
    
    // Check for high-priority messages that should always get human attention
    // These are important messages that shouldn't be auto-replied
    const isHighPriority = message.priority === 'high' || message.priority === 'urgent';
    
    // If AI marked as not auto-sendable, it should require human review
    // (unless it was already auto-sent, which is handled separately)
    const shouldRequireReviewIfNotAutoSendable = !result.isAutoSendable;
    
    // Get workspace settings to check unified confidence threshold
    // This determines both auto-send eligibility and review requirements
    const { data: wsSettings } = await supabase
      .from('workspace_settings')
      .select('auto_send_enabled, auto_send_confidence_threshold, human_review_for_scheduling, human_review_for_commitments, human_review_for_sensitive, auto_schedule_meeting_requests')
      .eq('workspace_id', workspaceId)
      .single();

    const autoSendEnabled = wsSettings?.auto_send_enabled ?? false;
    const unifiedThreshold = wsSettings?.auto_send_confidence_threshold ?? 0.85;
    const reviewForScheduling = wsSettings?.human_review_for_scheduling ?? true;
    const reviewForCommitments = wsSettings?.human_review_for_commitments ?? true;
    const reviewForSensitive = wsSettings?.human_review_for_sensitive ?? true;
    const autoScheduleMeetingRequests = wsSettings?.auto_schedule_meeting_requests ?? false;

    // Check if confidence is below unified threshold (always hold for review if below)
    const confidenceBelowThreshold = result.confidenceScore < unifiedThreshold;

    // Check review triggers based on workspace settings
    // Calendar mismatch = no matching event found OR low confidence match (suggestedAction is 'ask_human')
    const hasCalendarMismatch = calendarContext && (!calendarContext.hasMatchingEvent || calendarContext.suggestedAction === 'ask_human');
    // When "Allow auto-schedule" is on and confidence is high, scheduling/booking drafts can auto-send; event is created after send (cron or sendReplyAction)
    const allowAutoScheduleForThisDraft = autoScheduleMeetingRequests && result.confidenceScore >= unifiedThreshold;
    const shouldReviewForScheduling = reviewForScheduling && (needsHumanReview || hasCalendarMismatch) && !allowAutoScheduleForThisDraft;
    const shouldReviewForCommitments = reviewForCommitments && isCriticalMissingInfo;
    // Bills/invoices only require review if they're in excluded categories OR if review for sensitive is enabled
    // Otherwise, they can auto-send if confidence is high (especially for Shopify orders with order data)
    const shouldReviewForSensitive = reviewForSensitive && (
      isComplaint || 
      isAlwaysReviewCategory || 
      (isBillOrInvoice && isBillInvoiceExcluded) // Only review bills/invoices if user excluded them
    );

    // Check if message was marked for review due to thread reply limit
    const isThreadLimitReached = message.requires_human_review && 
      (message.review_reason === 'thread_reply_limit_reached' || 
       (message.review_context as any)?.reason?.includes('Thread reply limit'));

    // Determine if draft should be held for human review
    // Hold if: 
    // 1. This is a MANUAL draft (user clicked "Draft with AI") - NEVER auto-send manual drafts
    // 2. Auto-send is disabled (always require review when disabled)
    // 3. Confidence is below unified threshold
    // 4. Message explicitly flagged for review (including thread limit reached)
    // 5. Calendar mismatch detected (if review for scheduling enabled)
    // 6. Critical missing information (pricing, commitments, etc.) (if review for commitments enabled)
    // 7. Message is a complaint or sensitive category (if review for sensitive enabled)
    // 8. Message is in a category that always requires review (sales_lead, customer_complaint)
    // 9. Bills/invoices that are in excluded categories (user chose to exclude them)
    // 10. AI marked as not auto-sendable (should always require review)
    // Note: High priority messages can still auto-send if confidence is above threshold and auto-sendable
    // Note: Bills/invoices can auto-send if NOT excluded and confidence is high (especially Shopify orders with data)
    // Note: Routine missing info (policy, shipping) with good confidence can still auto-send
    const isManualDraft = options.isManualDraft ?? false;
    const shouldHoldForReview = isManualDraft || // CRITICAL: Manual drafts should NEVER auto-send
      !autoSendEnabled || // Always review if auto-send disabled
      confidenceBelowThreshold || // Always review if below unified threshold
      needsHumanReview || 
      isThreadLimitReached || // Always review if thread limit reached
      shouldReviewForScheduling ||
      shouldReviewForCommitments ||
      shouldReviewForSensitive ||
      isAlwaysReviewCategory ||
      // Bills/invoices only require review if user excluded them in settings
      (isBillOrInvoice && isBillInvoiceExcluded) ||
      // REMOVED: isHighPriority - high priority messages can auto-send if confidence is good
      shouldRequireReviewIfNotAutoSendable ||
      (hasMissingInfo && !result.isAutoSendable && result.confidenceScore < 0.70);
    
    const finalReviewReason = reviewReason || 
      (isThreadLimitReached ? 'thread_reply_limit_reached' :
       !autoSendEnabled ? 'auto_send_disabled' :
       confidenceBelowThreshold ? `low_confidence_below_threshold_${Math.round(unifiedThreshold * 100)}%` :
       shouldReviewForScheduling ? 'scheduling_review_required' :
       shouldReviewForCommitments ? `missing_information_${missingInfoType}` :
       shouldReviewForSensitive ? (isComplaint ? 'customer_complaint' : (isBillOrInvoice && isBillInvoiceExcluded ? `${message.category}_excluded_by_user` : `${message.category}_requires_review`)) :
       isAlwaysReviewCategory ? `${message.category}_requires_review` :
       (isBillOrInvoice && isBillInvoiceExcluded) ? `${message.category}_excluded_by_user` :
       // REMOVED: isHighPriority - high priority messages can auto-send if confidence is good
       shouldRequireReviewIfNotAutoSendable ? 'not_auto_sendable' :
       hasMissingInfo && !result.isAutoSendable ? `missing_information_${missingInfoType}` :
       undefined);
    
    const finalUncertaintyNotes = aiUncertaintyNotes || 
      (isManualDraft ? 'Manual draft - requires your review before sending' :
       isThreadLimitReached ? 'Thread reply limit reached - this conversation has exceeded the maximum number of auto-replies. Human review required.' :
       !autoSendEnabled ? 'Auto-send is disabled - all drafts require review' :
       confidenceBelowThreshold ? `AI confidence is ${Math.round(result.confidenceScore * 100)}% - below threshold of ${Math.round(unifiedThreshold * 100)}%` :
       shouldReviewForScheduling ? 'Scheduling confirmation requires calendar verification' :
       shouldReviewForCommitments ? `AI is missing critical information (${missingInfoType}) - human follow-up required` :
       shouldReviewForSensitive ? (isComplaint ? 'Customer complaint requires human review' : `${message.category} messages require human review for proper handling`) :
       isAlwaysReviewCategory ? `${message.category} messages require human review for proper handling` :
       // REMOVED: isHighPriority - high priority messages can auto-send if confidence is good
       shouldRequireReviewIfNotAutoSendable ? 'AI marked this message as not suitable for auto-send - human review required' :
       hasMissingInfo && !result.isAutoSendable ? `AI is missing information (${missingInfoType}) and marked as not auto-sendable` :
       undefined);

    console.log('[AI Reply] Human review check:', {
      needsHumanReview,
      reviewReason: finalReviewReason,
      confidenceScore: result.confidenceScore,
      shouldHoldForReview,
      hasMissingInfo,
      missingInfoType: hasMissingInfo ? missingInfoType : null,
      isComplaint,
      isAlwaysReviewCategory,
      isHighPriority,
      category: message.category,
      priority: message.priority,
      isAutoSendable: result.isAutoSendable,
      shouldRequireReviewIfNotAutoSendable,
    });

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
        hasMissingInformation: hasMissingInfo,
        missingInformationType: hasMissingInfo ? missingInfoType : null,
      } as any,
      // Human review fields
      hold_for_review: shouldHoldForReview,
      review_reason: finalReviewReason || null,
      calendar_context: calendarContext ? {
        hasMatchingEvent: calendarContext.hasMatchingEvent,
        hasEventInRangeButNotWithSender: calendarContext.hasEventInRangeButNotWithSender,
        matchedEventTitle: calendarContext.matchedEvent?.title,
        suggestedAction: calendarContext.suggestedAction,
        context: calendarContext.context,
        searchedDateRange: calendarContext.searchedDateRange,
      } : null,
      ai_uncertainty_notes: finalUncertaintyNotes || null,
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
    // If draft is held for review, also mark message as requiring human review
    const messageUpdate: any = {
      has_draft_reply: true,
      updated_at: new Date().toISOString(),
    };

    if (shouldHoldForReview) {
      messageUpdate.requires_human_review = true;
      messageUpdate.review_reason = finalReviewReason || 'draft_held_for_review';
      messageUpdate.review_context = {
        draftId: draft?.id,
        confidenceScore: result.confidenceScore,
        calendarContext: calendarContext,
        aiUncertaintyNotes: finalUncertaintyNotes,
        heldAt: new Date().toISOString(),
      };
    }

    // CRITICAL: Always update requires_human_review when draft is held
    // Retry logic to ensure the update succeeds
    let messageUpdateError: any = null;
    let updatedMessage: any = null;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      const { error, data } = await supabase
        .from("messages")
        .update(messageUpdate)
        .eq("id", messageId)
        .select('requires_human_review, review_reason, reviewed_at, handled_by_aiva')
        .single();

      messageUpdateError = error;
      updatedMessage = data;

      if (!error && data) {
        // Verify the update actually worked
        if (shouldHoldForReview && !data.requires_human_review) {
          console.warn(`[AI Reply] WARNING: Message update did not set requires_human_review=true (attempt ${retries + 1}/${maxRetries}). Retrying...`);
          retries++;
          // Wait 100ms before retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        break; // Success
      } else if (error && retries < maxRetries - 1) {
        console.warn(`[AI Reply] Message update failed (attempt ${retries + 1}/${maxRetries}), retrying...`, error);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      break; // Give up after max retries
    }

    if (messageUpdateError) {
      console.error('[AI Reply] Failed to update message with draft info after retries:', messageUpdateError);
      // Even if update fails, the draft is still held for review, so it will be caught by the held drafts query
    } else {
      console.log('[AI Reply] Message updated successfully:', {
        messageId,
        hasDraft: true,
        requiresHumanReview: shouldHoldForReview,
        reviewReason: shouldHoldForReview ? (finalReviewReason || 'draft_held_for_review') : undefined,
        actualRequiresHumanReview: updatedMessage?.requires_human_review,
        actualReviewReason: updatedMessage?.review_reason,
        reviewedAt: updatedMessage?.reviewed_at,
        handledByAiva: updatedMessage?.handled_by_aiva,
      });
      
      // Final verification
      if (shouldHoldForReview && !updatedMessage?.requires_human_review) {
        console.error('[AI Reply] CRITICAL: Message update failed to set requires_human_review=true after all retries. This message may not appear in the review queue.');
      }
    }

    // Log draft result for debugging
    console.log('[AI Reply] Draft result:', {
      draftSaved: !!draft,
      draftId: draft?.id,
      isAutoSendable: result.isAutoSendable,
      confidenceScore: result.confidenceScore,
    });

    // Check if draft is auto-sendable and queue for auto-send
    // Use unified threshold: if confidence >= threshold and not held for review, queue for auto-send
    if (draft) {
      try {
        console.log('[AI Reply] Auto-send check:', {
          enabled: autoSendEnabled,
          threshold: unifiedThreshold,
          confidenceScore: result.confidenceScore,
          isAutoSendable: result.isAutoSendable,
          meetsThreshold: result.confidenceScore >= unifiedThreshold,
          shouldHoldForReview,
        });

        // Queue for auto-send if:
        // 1. Auto-send is enabled for workspace
        // 2. NOT held for human review
        // 3. Confidence meets unified threshold (primary gate)
        // 4. AI marked it as auto-sendable OR confidence is very high (>= 0.80)
        const shouldQueue = autoSendEnabled && 
          !shouldHoldForReview &&
          result.confidenceScore >= unifiedThreshold && 
          (result.isAutoSendable || result.confidenceScore >= 0.80);

        if (shouldHoldForReview) {
          console.log('[AI Reply] Draft held for human review, not auto-sending:', finalReviewReason);
        } else if (shouldQueue) {
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
          console.log('[AI Reply] Auto-send disabled for workspace - draft requires review');
        } else if (result.confidenceScore < unifiedThreshold) {
          console.log('[AI Reply] Confidence below unified threshold:', result.confidenceScore, '<', unifiedThreshold);
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
      // Human review fields
      holdForReview: shouldHoldForReview,
      reviewReason: finalReviewReason,
      calendarContext,
      aiUncertaintyNotes: finalUncertaintyNotes,
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
