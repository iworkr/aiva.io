/**
 * Voice Chat API Route
 * Handles voice input transcription and generates streaming audio responses
 * 
 * POST /api/voice
 * - Accepts base64 encoded audio
 * - Returns streaming response with transcription, text, and audio
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { transcribeBase64Audio } from '@/lib/voice/stt-service';
import { streamTextToSpeech, textToSpeech } from '@/lib/voice/tts-service';
import { getVoiceChatContext, type VoiceChatMessage } from '@/lib/voice/voice-chat-orchestrator';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getHasFeature } from '@/rsc-data/user/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VoiceRequestBody {
  audio: string; // Base64 encoded audio
  mimeType?: string;
  conversationHistory?: VoiceChatMessage[];
  voiceId?: string;
  streaming?: boolean;
}

/**
 * Build the system prompt for voice conversations
 */
function buildVoiceSystemPrompt(workspaceName: string, recentMessages: string, upcomingEvents: string): string {
  return `You are Aiva, a friendly and helpful AI voice assistant for ${workspaceName}.

IMPORTANT: You are speaking out loud, so your responses should be:
- Conversational and natural sounding
- Concise (aim for 1-3 sentences when possible)
- Free of markdown, bullet points, or formatting
- Easy to understand when heard rather than read

You have access to:

Recent Unread Messages:
${recentMessages || 'No unread messages'}

Upcoming Events:
${upcomingEvents || 'No upcoming events'}

You can help with:
- Summarizing messages and events
- Answering questions about the user's communications
- Providing schedule information
- General assistance

Keep responses brief and conversational. Speak naturally as if having a real conversation.`;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createSupabaseUserServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace context
    const context = await getVoiceChatContext(user.id);
    if (!context) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Check Pro subscription for voice feature
    const hasVoiceAccess = await getHasFeature(context.workspaceId, 'voiceChat');
    if (!hasVoiceAccess) {
      return NextResponse.json(
        { error: 'Voice chat is a Pro feature. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: VoiceRequestBody = await req.json();
    const { audio, mimeType = 'audio/webm', conversationHistory = [], voiceId, streaming = true } = body;

    if (!audio) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    // Step 1: Transcribe audio
    const transcription = await transcribeBase64Audio(audio, mimeType);

    if (!transcription.text.trim()) {
      return NextResponse.json({ error: 'No speech detected' }, { status: 400 });
    }

    // Build messages for LLM
    const systemPrompt = buildVoiceSystemPrompt(
      context.workspaceName,
      context.recentMessages,
      context.upcomingEvents
    );

    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: transcription.text },
    ];

    if (streaming) {
      // Streaming response using Server-Sent Events format
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send transcription first
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'transcription', text: transcription.text })}\n\n`
              )
            );

            // Stream LLM response
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

              // Send text delta
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'text_delta', text: delta })}\n\n`
                )
              );

              // When we have a complete sentence, convert it to speech
              const sentences = sentenceBuffer.split(sentenceEndings);
              if (sentences.length > 1) {
                const completeSentence = sentences[0];
                sentenceBuffer = sentences.slice(1).join('');

                if (completeSentence.trim()) {
                  // Stream TTS for this sentence
                  const chunks: Uint8Array[] = [];
                  for await (const audioChunk of streamTextToSpeech(completeSentence, { voiceId })) {
                    chunks.push(audioChunk);
                  }
                  
                  if (chunks.length > 0) {
                    const audioBuffer = Buffer.concat(chunks);
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ 
                          type: 'audio_chunk', 
                          audio: audioBuffer.toString('base64'),
                          contentType: 'audio/mpeg'
                        })}\n\n`
                      )
                    );
                  }
                }
              }
            }

            // Handle remaining text
            if (sentenceBuffer.trim()) {
              const chunks: Uint8Array[] = [];
              for await (const audioChunk of streamTextToSpeech(sentenceBuffer, { voiceId })) {
                chunks.push(audioChunk);
              }
              
              if (chunks.length > 0) {
                const audioBuffer = Buffer.concat(chunks);
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ 
                      type: 'audio_chunk', 
                      audio: audioBuffer.toString('base64'),
                      contentType: 'audio/mpeg'
                    })}\n\n`
                  )
                );
              }
            }

            // Send completion message
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'done', fullText })}\n\n`
              )
            );

            controller.close();
          } catch (error) {
            console.error('Voice streaming error:', error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'error', 
                  error: error instanceof Error ? error.message : 'An error occurred' 
                })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const result = await streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages,
        temperature: 0.7,
        maxTokens: 300,
      });

      // Collect full text
      let responseText = '';
      for await (const chunk of result.textStream) {
        responseText += chunk;
      }

      // Generate TTS for full response
      const ttsResult = await textToSpeech(responseText, { voiceId });

      return NextResponse.json({
        transcription: transcription.text,
        response: responseText,
        audio: ttsResult.audioBuffer.toString('base64'),
        contentType: ttsResult.contentType,
      });
    }
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Voice processing failed' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check voice service status
 */
export async function GET() {
  const sttConfigured = !!process.env.OPENAI_API_KEY;
  const ttsConfigured = !!process.env.ELEVENLABS_API_KEY;

  return NextResponse.json({
    available: sttConfigured && ttsConfigured,
    stt: sttConfigured ? 'configured' : 'missing OPENAI_API_KEY',
    tts: ttsConfigured ? 'configured' : 'missing ELEVENLABS_API_KEY',
  });
}

