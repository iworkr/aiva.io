/**
 * AI Message Classifier
 * Uses OpenAI to classify messages by priority, category, sentiment, etc.
 */

'use server';

import { OpenAI } from 'openai';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import {
  MessagePriority,
  MessageCategory,
  MessageSentiment,
  MessageActionability,
} from '@/utils/zod-schemas/aiva-schemas';
import { getPriorityFromCategory } from './priority-mapper';

// Lazy-load OpenAI client to avoid crashes on missing API key
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not configured. Please add it to your .env.local file to enable AI features.'
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
  keyPoints?: string[];
  confidenceScore: number;
}

/**
 * Classify a message using AI
 */
export async function classifyMessage(
  messageId: string,
  workspaceId: string
): Promise<ClassificationResult> {
  try {
    const supabase = await createSupabaseUserServerActionClient();

    // Get the message
    const { data: message, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !message) {
      throw new Error('Message not found');
    }

    // Prepare prompt for OpenAI
    const prompt = `Analyze this email message and classify it:

Subject: ${message.subject || '(no subject)'}
From: ${message.sender_name || message.sender_email}
Body: ${message.body?.substring(0, 1500) || ''} ${(message.body?.length || 0) > 1500 ? '...' : ''}

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
  "keyPoints": ["<key point 1>", "<key point 2>"],
  "confidenceScore": <number between 0.35 and 1.0>
}`;

    const startTime = Date.now();

    // Call OpenAI with low temperature for consistent results
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
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
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Very low for consistency
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const processingTime = Date.now() - startTime;

    const rawResult = JSON.parse(
      completion.choices[0].message.content || '{}'
    ) as ClassificationResult;
    
    // Post-process confidence score to ensure realistic values
    let confidence = rawResult.confidenceScore;
    
    // Validate confidence is in range
    if (typeof confidence !== 'number' || isNaN(confidence)) {
      confidence = 0.5;
    }
    confidence = Math.max(0.35, Math.min(1.0, confidence));
    
    // Adjust confidence based on message characteristics
    const bodyLength = message.body?.length || 0;
    const subjectLength = (message.subject || '').length;
    
    // Very short messages should have lower confidence
    if (bodyLength < 50 && subjectLength < 20) {
      confidence = Math.min(confidence, 0.60);
    }
    
    // Generic test-like messages should have low confidence
    const lowerBody = (message.body || '').toLowerCase();
    const lowerSubject = (message.subject || '').toLowerCase();
    if (
      lowerSubject.includes('test') || 
      lowerBody.includes('test message') ||
      lowerBody.match(/^test\s*\d*$/i)
    ) {
      confidence = Math.min(confidence, 0.55);
    }
    
    const result: ClassificationResult = {
      ...rawResult,
      confidenceScore: Math.round(confidence * 100) / 100, // Round to 2 decimals
    };

    // Ensure priority is correctly assigned based on category
    // Override AI priority with our priority mapping logic for consistency
    const finalPriority = getPriorityFromCategory(
      result.category,
      result.sentiment,
      result.actionability
    );

    // Update message with classification
    await supabase
      .from('messages')
      .update({
        priority: finalPriority, // Use mapped priority for consistency
        category: result.category,
        sentiment: result.sentiment,
        actionability: result.actionability,
        summary: result.summary,
        key_points: result.keyPoints || [],
        confidence_score: result.confidenceScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    // Log AI action
    await supabase.from('ai_action_logs').insert({
      workspace_id: workspaceId,
      user_id: message.workspace_id, // Placeholder - should be actual user
      action_type: 'classification',
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
    console.error('Message classification error:', error);
    throw error;
  }
}

/**
 * Batch classify multiple messages
 */
export async function batchClassifyMessages(
  messageIds: string[],
  workspaceId: string
): Promise<{ successful: number; failed: number; results: any[] }> {
  const results = [];
  let successful = 0;
  let failed = 0;

  for (const messageId of messageIds) {
    try {
      const result = await classifyMessage(messageId, workspaceId);
      results.push({ messageId, success: true, result });
      successful++;
    } catch (error) {
      results.push({
        messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
  limit: number = 10
) {
  const supabase = await createSupabaseUserServerActionClient();

  // Get unclassified messages
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .is('priority', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !messages || messages.length === 0) {
    return {
      success: true,
      message: 'No unclassified messages found',
      classifiedCount: 0,
    };
  }

  const messageIds = messages.map((m) => m.id);
  const result = await batchClassifyMessages(messageIds, workspaceId);

  return {
    success: true,
    ...result,
  };
}

