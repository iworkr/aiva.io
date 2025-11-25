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
Body: ${message.body.substring(0, 1000)} ${message.body.length > 1000 ? '...' : ''}

Classify this message into the following categories:

1. Priority (high, medium, low, noise):
   - high: Urgent, time-sensitive, from important contacts
   - medium: Regular correspondence, moderately important
   - low: Can wait, routine updates
   - noise: Marketing, spam, automated notifications

2. Category (sales_lead, client_support, internal, social, marketing, personal, other):
   - sales_lead: New business opportunities, prospects
   - client_support: Customer inquiries, support requests
   - internal: Team communications, company updates
   - social: Personal messages, social invites
   - marketing: Promotional content, newsletters
   - personal: Personal correspondence
   - other: Doesn't fit above categories

3. Sentiment (neutral, positive, negative, urgent):
   - neutral: Normal tone
   - positive: Appreciative, friendly
   - negative: Complaints, concerns
   - urgent: Requires immediate attention

4. Actionability (question, request, fyi, scheduling_intent, task, none):
   - question: Asking for information
   - request: Requesting action
   - fyi: Informational only
   - scheduling_intent: Mentions meeting/scheduling
   - task: Contains actionable task
   - none: No action needed

5. Provide a brief summary (1-2 sentences)

6. Extract 2-3 key points if applicable

Respond ONLY with valid JSON in this exact format:
{
  "priority": "high|medium|low|noise",
  "category": "sales_lead|client_support|internal|social|marketing|personal|other",
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

    // Update message with classification
    await supabase
      .from('messages')
      .update({
        priority: result.priority,
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

