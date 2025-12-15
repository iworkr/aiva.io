/**
 * Voice Chat Orchestrator
 * Coordinates the STT → LLM → TTS pipeline for voice conversations
 */

import { transcribeBase64Audio, type TranscriptionResult } from './stt-service';
import { streamTextToSpeech, textToSpeech, type TTSOptions, type TTSResult } from './tts-service';
import { openai } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';

export interface VoiceChatMessage {
  role: 'user' | 'assistant';
  content: string;
  audioData?: string; // Base64 encoded audio for assistant responses
  timestamp: Date;
}

export interface VoiceChatContext {
  workspaceId: string;
  workspaceName: string;
  recentMessages: string;
  upcomingEvents: string;
}

export interface VoiceChatOptions {
  ttsOptions?: TTSOptions;
  streaming?: boolean; // Whether to stream TTS output
  language?: string; // Language for STT
}

/**
 * Get workspace context for the voice chat
 */
export async function getVoiceChatContext(userId: string): Promise<VoiceChatContext | null> {
  const supabase = await createSupabaseUserServerComponentClient();

  // Get workspace from membership
  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_member_id', userId)
    .limit(1)
    .single();

  if (!workspaceMembers) {
    return null;
  }

  // Get workspace info
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceMembers.workspace_id)
    .single();

  if (!workspace) {
    return null;
  }

  // Get recent messages and events for context
  const [messagesResult, eventsResult] = await Promise.all([
    supabase
      .from('messages')
      .select('id, subject, sender_name, sender_email, body, priority, created_at')
      .eq('workspace_id', workspace.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('events')
      .select('id, title, description, start_time, end_time, location')
      .eq('workspace_id', workspace.id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
  ]);

  const recentMessages = (messagesResult.data || [])
    .map(
      (msg) =>
        `Message: ${msg.subject || 'No subject'} from ${msg.sender_name || msg.sender_email} - ${msg.body?.substring(0, 100)}...`
    )
    .join('\n');

  const upcomingEvents = (eventsResult.data || [])
    .map(
      (event) =>
        `Event: ${event.title}${event.start_time ? ` (${new Date(event.start_time).toLocaleString()})` : ''} - ${event.description || 'No description'}`
    )
    .join('\n');

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name || 'Your workspace',
    recentMessages,
    upcomingEvents,
  };
}

/**
 * Build the system prompt for voice conversations
 */
function buildVoiceSystemPrompt(context: VoiceChatContext): string {
  return `You are Aiva, a friendly and helpful AI voice assistant for ${context.workspaceName}.

IMPORTANT: You are speaking out loud, so your responses should be:
- Conversational and natural sounding
- Concise (aim for 1-3 sentences when possible)
- Free of markdown, bullet points, or formatting
- Easy to understand when heard rather than read

You have access to:

Recent Unread Messages:
${context.recentMessages || 'No unread messages'}

Upcoming Events:
${context.upcomingEvents || 'No upcoming events'}

You can help with:
- Summarizing messages and events
- Answering questions about the user's communications
- Providing schedule information
- General assistance

Keep responses brief and conversational. Speak naturally as if having a real conversation.`;
}

/**
 * Process voice input and generate a response
 * @param audioBase64 - Base64 encoded audio from the user
 * @param conversationHistory - Previous messages in the conversation
 * @param context - Workspace context
 * @param options - Processing options
 * @returns The transcription and generated response
 */
export async function processVoiceInput(
  audioBase64: string,
  conversationHistory: VoiceChatMessage[],
  context: VoiceChatContext,
  options: VoiceChatOptions = {}
): Promise<{
  transcription: TranscriptionResult;
  response: string;
  audioBuffer?: Buffer;
}> {
  // Step 1: Transcribe the audio
  const transcription = await transcribeBase64Audio(audioBase64, 'audio/webm', {
    language: options.language,
  });

  if (!transcription.text.trim()) {
    throw new Error('No speech detected');
  }

  // Step 2: Generate response using LLM
  const systemPrompt = buildVoiceSystemPrompt(context);
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: transcription.text },
  ];

  const result = await generateText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxTokens: 300, // Keep responses concise for voice
  });

  const responseText = result.text;

  // Step 3: Convert response to speech
  let audioBuffer: Buffer | undefined;
  if (!options.streaming) {
    const ttsResult = await textToSpeech(responseText, options.ttsOptions);
    audioBuffer = ttsResult.audioBuffer;
  }

  return {
    transcription,
    response: responseText,
    audioBuffer,
  };
}

/**
 * Stream voice response - generates TTS audio as the LLM generates text
 * This provides lower perceived latency
 */
export async function* streamVoiceResponse(
  userText: string,
  conversationHistory: VoiceChatMessage[],
  context: VoiceChatContext,
  options: VoiceChatOptions = {}
): AsyncGenerator<{
  type: 'text' | 'audio';
  data: string | Uint8Array;
}, void, unknown> {
  const systemPrompt = buildVoiceSystemPrompt(context);
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userText },
  ];

  // Stream text from LLM
  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxTokens: 300,
  });

  let fullText = '';
  let sentenceBuffer = '';
  const sentenceEndings = /[.!?]\s*/;

  for await (const delta of result.textStream) {
    fullText += delta;
    sentenceBuffer += delta;
    
    // Yield text chunks for display
    yield { type: 'text', data: delta };

    // When we have a complete sentence, convert it to speech
    const sentences = sentenceBuffer.split(sentenceEndings);
    if (sentences.length > 1) {
      // We have at least one complete sentence
      const completeSentence = sentences[0];
      sentenceBuffer = sentences.slice(1).join(''); // Keep incomplete part

      if (completeSentence.trim()) {
        // Stream TTS for this sentence
        for await (const audioChunk of streamTextToSpeech(completeSentence, options.ttsOptions)) {
          yield { type: 'audio', data: audioChunk };
        }
      }
    }
  }

  // Handle any remaining text
  if (sentenceBuffer.trim()) {
    for await (const audioChunk of streamTextToSpeech(sentenceBuffer, options.ttsOptions)) {
      yield { type: 'audio', data: audioChunk };
    }
  }
}

/**
 * Simple voice response without streaming
 * Transcribes audio, generates response, converts to speech
 */
export async function getVoiceResponse(
  audioBase64: string,
  conversationHistory: VoiceChatMessage[],
  userId: string,
  options: VoiceChatOptions = {}
): Promise<{
  userText: string;
  responseText: string;
  audioBase64: string;
}> {
  // Get context
  const context = await getVoiceChatContext(userId);
  if (!context) {
    throw new Error('No workspace found for user');
  }

  // Process voice input
  const result = await processVoiceInput(
    audioBase64,
    conversationHistory,
    context,
    { ...options, streaming: false }
  );

  return {
    userText: result.transcription.text,
    responseText: result.response,
    audioBase64: result.audioBuffer?.toString('base64') || '',
  };
}

