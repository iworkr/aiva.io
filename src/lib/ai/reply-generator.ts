/**
 * AI Reply Generator
 * Generates reply drafts for messages using OpenAI
 */

'use server';

import { OpenAI } from 'openai';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';

// Lazy-load OpenAI client to avoid crashes on missing API key
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[AI Reply] OPENAI_API_KEY not configured - AI features disabled');
      return null;
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

interface ReplyOptions {
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  includeQuote?: boolean;
  maxLength?: number;
  context?: string;
}

interface ReplyDraftResult {
  body: string;
  bodyHtml?: string;
  confidenceScore: number;
  tone: string;
  error?: string;
}

/**
 * Generate reply draft for a message
 */
export async function generateReplyDraft(
  messageId: string,
  workspaceId: string,
  options: ReplyOptions = {}
): Promise<ReplyDraftResult> {
  try {
    // Check feature access - AI drafts require Pro plan
    // In development mode (no Stripe), this should return true
    const { getHasFeature } = await import('@/rsc-data/user/subscriptions');
    
    let hasAIDrafts = true;
    try {
      hasAIDrafts = await getHasFeature(workspaceId, 'aiDrafts');
      console.log('[AI Reply] Feature check result:', { workspaceId, hasAIDrafts });
    } catch (featureError) {
      // If feature check fails, allow access in development
      console.warn('[AI Reply] Feature check failed, defaulting to allowed:', featureError);
      hasAIDrafts = true;
    }
    
    if (!hasAIDrafts) {
      throw new Error(
        'AI reply drafts are a Pro feature. Upgrade your plan to access AI-powered reply generation.'
      );
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Get the message
    const { data: message, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        channel_connection:channel_connections(provider, provider_account_name)
      `
      )
      .eq('id', messageId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !message) {
      throw new Error('Message not found');
    }

    const {
      tone = 'professional',
      includeQuote = false,
      maxLength = 500,
      context = '',
    } = options;

    // Prepare conversation context
    let conversationContext = '';
    if (message.provider_thread_id) {
      // Get previous messages in thread
      const { data: threadMessages } = await supabase
        .from('messages')
        .select('sender_email, body, timestamp')
        .eq('provider_thread_id', message.provider_thread_id)
        .order('timestamp', { ascending: true })
        .limit(5);

      if (threadMessages && threadMessages.length > 0) {
        conversationContext = threadMessages
          .map(
            (m) =>
              `From ${m.sender_email} at ${new Date(m.timestamp).toLocaleString()}:\n${m.body.substring(0, 200)}`
          )
          .join('\n\n');
      }
    }

    // Build prompt
    const prompt = `Generate a ${tone} email reply to the following message:

Subject: ${message.subject || '(no subject)'}
From: ${message.sender_name || message.sender_email}
Body:
${message.body}

${conversationContext ? `\n\nConversation Context:\n${conversationContext}` : ''}
${context ? `\n\nAdditional Context: ${context}` : ''}

Requirements:
1. Tone: ${tone} (${tone === 'formal' ? 'Use professional language, avoid contractions' : tone === 'casual' ? 'Use friendly, conversational language' : tone === 'friendly' ? 'Warm and approachable' : 'Professional but approachable'})
2. Length: Approximately ${maxLength} characters
3. ${includeQuote ? 'Include a relevant quote from the original message' : 'Do not include quoted text'}
4. Address the main points from the original message
5. Be helpful and clear
6. End with appropriate closing
7. Do NOT include a signature (it will be added automatically)

Respond with ONLY the email body text, no subject line, no "Dear/Hi", start directly with the content.

Also provide:
- A confidence score (0-1) indicating how confident you are in this reply
- Whether this reply is suitable for auto-send (true/false)

Format your response as JSON:
{
  "body": "The reply text here...",
  "confidenceScore": 0.85,
  "isAutoSendable": false
}`;

    const startTime = Date.now();

    // Call OpenAI
    const openai = getOpenAIClient();
    if (!openai) {
      console.log('[AI Reply] OpenAI not configured, returning fallback');
      return {
        body: '',
        confidenceScore: 0,
        tone: options.tone || 'professional',
        error: 'AI not configured. Please add OPENAI_API_KEY to enable AI features.',
      };
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert email assistant. Generate professional, contextually appropriate email replies. Match the tone and style requested. Be concise and helpful.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: Math.ceil(maxLength / 2),
      response_format: { type: 'json_object' },
    });

    const processingTime = Date.now() - startTime;

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    // Store draft in database
    const { data: draft, error: draftError } = await supabase
      .from('message_drafts')
      .insert({
        workspace_id: workspaceId,
        user_id: workspaceId, // Placeholder
        message_id: messageId,
        body: result.body,
        tone,
        generated_by_ai: true,
        confidence_score: result.confidenceScore,
        is_auto_sendable: result.isAutoSendable || false,
      })
      .select()
      .single();

    if (draftError) {
      console.error('Failed to store draft:', draftError);
    }

    // Update message to indicate draft exists
    await supabase
      .from('messages')
      .update({
        has_draft_reply: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    // Log AI action
    await supabase.from('ai_action_logs').insert({
      workspace_id: workspaceId,
      user_id: workspaceId, // Placeholder
      action_type: 'reply_draft',
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
    };
  } catch (error) {
    console.error('[AI Reply] Generation error:', error);
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        throw new Error('AI features are not configured. Please contact support.');
      }
      throw error;
    }
    throw new Error('Failed to generate reply. Please try again.');
  }
}

/**
 * Generate multiple reply variations
 */
export async function generateReplyVariations(
  messageId: string,
  workspaceId: string
): Promise<ReplyDraftResult[]> {
  // Check feature access - AI drafts require Pro plan
  const { getHasFeature } = await import('@/rsc-data/user/subscriptions');
  const hasAIDrafts = await getHasFeature(workspaceId, 'aiDrafts');
  
  if (!hasAIDrafts) {
    throw new Error(
      'AI reply drafts are a Pro feature. Upgrade your plan to access AI-powered reply generation.'
    );
  }

  const tones: Array<'formal' | 'casual' | 'friendly' | 'professional'> = [
    'professional',
    'friendly',
    'casual',
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
  messagePriority?: string
): boolean {
  // Auto-send criteria
  const minConfidenceScore = 0.85;

  // Don't auto-send high priority or sales leads
  const blockAutoSendCategories = ['sales_lead'];
  const blockAutoSendPriorities = ['high'];

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
  workspaceId: string
): Promise<Array<{ title: string; description?: string; dueDate?: string }>> {
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

    const prompt = `Analyze this email and extract any actionable tasks:

Subject: ${message.subject || '(no subject)'}
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
      console.log('[AI Reply] OpenAI not configured for task extraction');
      return [];
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at extracting actionable tasks from emails. Be precise and conservative - only extract clear, actionable items.',
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

    const result = JSON.parse(completion.choices[0].message.content || '{"tasks": []}');
    const tasks = result.tasks || [];

    // Log AI action
    await supabase.from('ai_action_logs').insert({
      workspace_id: workspaceId,
      user_id: workspaceId, // Placeholder
      action_type: 'task_extraction',
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
    console.error('Task extraction error:', error);
    throw error;
  }
}

/**
 * Detect scheduling intent
 */
export async function detectSchedulingIntent(
  messageId: string,
  workspaceId: string
): Promise<{
  hasIntent: boolean;
  proposedTimes?: string[];
  duration?: number;
  location?: string;
}> {
  try {
    const supabase = await createSupabaseUserServerActionClient();

    const { data: message, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !message) {
      throw new Error('Message not found');
    }

    const prompt = `Analyze this email for scheduling or meeting intent:

Subject: ${message.subject || '(no subject)'}
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
      console.log('[AI Reply] OpenAI not configured for scheduling detection');
      return { hasIntent: false };
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at detecting scheduling intent in emails. Be accurate and extract specific details.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    // Log AI action
    await supabase.from('ai_action_logs').insert({
      workspace_id: workspaceId,
      user_id: workspaceId,
      action_type: 'scheduling_detection',
      input_ref: messageId,
      model_used: completion.model,
      input_data: { messageId },
      output_data: result,
      success: true,
    });

    return result;
  } catch (error) {
    console.error('Scheduling detection error:', error);
    throw error;
  }
}

