/**
 * Text-to-Speech Service
 * Uses ElevenLabs API for high-quality voice synthesis
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Lazy-loaded ElevenLabs client to prevent crashes if API key is missing
let elevenLabsClientInstance: ElevenLabsClient | null = null;

function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenLabsClientInstance) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ELEVENLABS_API_KEY is not configured. Please add it to your .env.local file to enable voice features.'
      );
    }
    elevenLabsClientInstance = new ElevenLabsClient({ apiKey });
  }
  return elevenLabsClientInstance;
}

// Default voice ID - Rachel (neutral, professional voice)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number; // 0-1, higher = more stable/consistent
  similarityBoost?: number; // 0-1, higher = more similar to original voice
  style?: number; // 0-1, style exaggeration
  useSpeakerBoost?: boolean;
}

export interface TTSResult {
  audioBuffer: Buffer;
  contentType: string;
}

/**
 * Convert text to speech using ElevenLabs API
 * @param text - Text to convert to speech
 * @param options - TTS options
 * @returns Audio buffer with content type
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const client = getElevenLabsClient();
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;

  try {
    const response = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: options.modelId || 'eleven_turbo_v2_5', // Fast, low-latency model
      voiceSettings: {
        stability: options.stability ?? 0.5,
        similarityBoost: options.similarityBoost ?? 0.75,
        style: options.style ?? 0,
        useSpeakerBoost: options.useSpeakerBoost ?? true,
      },
    });

    // Convert the response stream to a buffer
    const chunks: Uint8Array[] = [];
    const reader = response.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    const audioBuffer = Buffer.concat(chunks);

    return {
      audioBuffer,
      contentType: 'audio/mpeg', // ElevenLabs returns MP3 by default
    };
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    throw new Error(
      error instanceof Error
        ? `Text-to-speech failed: ${error.message}`
        : 'Text-to-speech failed'
    );
  }
}

/**
 * Stream text to speech - returns async iterator of audio chunks
 * This is better for real-time playback as it starts streaming immediately
 * @param text - Text to convert to speech
 * @param options - TTS options
 * @yields Audio chunks as Uint8Array
 */
export async function* streamTextToSpeech(
  text: string,
  options: TTSOptions = {}
): AsyncGenerator<Uint8Array, void, unknown> {
  const client = getElevenLabsClient();
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;

  try {
    // Use the stream method for real-time streaming
    const response = await client.textToSpeech.stream(voiceId, {
      text,
      modelId: options.modelId || 'eleven_turbo_v2_5',
      voiceSettings: {
        stability: options.stability ?? 0.5,
        similarityBoost: options.similarityBoost ?? 0.75,
        style: options.style ?? 0,
        useSpeakerBoost: options.useSpeakerBoost ?? true,
      },
    });

    const reader = response.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) yield value;
    }
  } catch (error) {
    console.error('ElevenLabs streaming TTS error:', error);
    throw new Error(
      error instanceof Error
        ? `Streaming text-to-speech failed: ${error.message}`
        : 'Streaming text-to-speech failed'
    );
  }
}

/**
 * Get available voices from ElevenLabs
 */
export async function getAvailableVoices() {
  const client = getElevenLabsClient();

  try {
    const voices = await client.voices.getAll();
    return voices.voices?.map((voice) => ({
      id: voice.voiceId,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      previewUrl: voice.previewUrl,
      labels: voice.labels,
    })) || [];
  } catch (error) {
    console.error('ElevenLabs get voices error:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to get voices: ${error.message}`
        : 'Failed to get voices'
    );
  }
}

/**
 * Check if TTS service is properly configured
 */
export function isTTSConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

/**
 * Get the default voice ID
 */
export function getDefaultVoiceId(): string {
  return DEFAULT_VOICE_ID;
}

