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
Body: ${message.body.substring(0, 1500)} ${message.body.length > 1500 ? '...' : ''}

Classify this message into the following categories:

1. Category (choose the MOST SPECIFIC category):
   - customer_inquiry: Customer questions, order status ("where is my order", "when will it arrive", "tracking number")
   - customer_complaint: Customer complaints, issues, problems, refund requests
   - sales_lead: New business opportunities, prospects, potential clients
   - client_support: Technical support, help requests, troubleshooting
   - bill: Bills, payment requests, statements
   - invoice: Invoices, receipts, billing documents
   - payment_confirmation: Payment confirmations, transaction receipts
   - authorization_code: 2FA codes, verification codes, OTP codes (usually 4-6 digits)
   - sign_in_code: Sign-in codes, login codes, authentication codes
   - security_alert: Security notifications, login alerts, account changes
   - marketing: Promotional emails, sales offers, discounts
   - junk_email: Spam, junk mail, unwanted promotional, obvious spam
   - newsletter: Newsletters, company updates, regular updates
   - internal: Team communications, company updates, internal messages
   - meeting_request: Meeting invitations, scheduling requests
   - personal: Personal correspondence, friends, family
   - social: Social invites, personal messages, social media notifications
   - notification: Automated notifications, system messages, alerts
   - other: Doesn't fit above categories

2. Priority (urgent, high, medium, low, noise):
   - urgent: Time-sensitive codes (authorization/sign-in codes), urgent customer issues requiring immediate response
   - high: Customer inquiries, complaints, sales leads, security alerts, client support
   - medium: Bills, invoices, payment confirmations, meeting requests, internal communications
   - low: Personal, social, notifications, newsletters
   - noise: Marketing, junk_email (spam)

3. Sentiment (neutral, positive, negative, urgent):
   - neutral: Normal tone
   - positive: Appreciative, friendly, thank you messages
   - negative: Complaints, concerns, frustration, anger
   - urgent: Requires immediate attention, time-sensitive

4. Actionability (question, request, fyi, scheduling_intent, task, none):
   - question: Asking for information
   - request: Requesting action or response
   - fyi: Informational only, no action needed
   - scheduling_intent: Mentions meeting/scheduling
   - task: Contains actionable task
   - none: No action needed (codes, confirmations, notifications)

5. Provide a brief summary (1-2 sentences)

6. Extract 2-3 key points if applicable

IMPORTANT PRIORITY RULES:
- authorization_code or sign_in_code → ALWAYS "urgent" priority
- customer_inquiry or customer_complaint → "urgent" if sentiment is urgent/negative, otherwise "high"
- marketing or junk_email → ALWAYS "noise" priority
- bills, invoices → "medium" priority
- sales_lead, client_support → "high" priority

Respond ONLY with valid JSON in this exact format:
{
  "category": "customer_inquiry|customer_complaint|sales_lead|client_support|bill|invoice|payment_confirmation|authorization_code|sign_in_code|security_alert|marketing|junk_email|newsletter|internal|meeting_request|personal|social|notification|other",
  "priority": "urgent|high|medium|low|noise",
  "sentiment": "neutral|positive|negative|urgent",
  "actionability": "question|request|fyi|scheduling_intent|task|none",
  "summary": "Brief summary here",
  "keyPoints": ["Point 1", "Point 2"],
  "confidenceScore": 0.85
}`;

    const startTime = Date.now();

    // Call OpenAI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert email classifier. Analyze emails and provide accurate classifications in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const processingTime = Date.now() - startTime;

    const result = JSON.parse(
      completion.choices[0].message.content || '{}'
    ) as ClassificationResult;

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

