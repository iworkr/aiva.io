/**
 * Speech-to-Text Service
 * Uses OpenAI Whisper API for real-time transcription
 */

import OpenAI from 'openai';
import { toFile } from 'openai';

// Lazy-loaded OpenAI client to prevent crashes if API key is missing
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not configured. Please add it to your .env.local file to enable voice features.'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

export interface TranscriptionOptions {
  language?: string; // ISO-639-1 format (e.g., 'en', 'es', 'fr')
  prompt?: string; // Optional context to guide transcription
}

/**
 * Transcribe audio using OpenAI Whisper API
 * @param audioBuffer - Audio data buffer (WebM, MP3, WAV, etc.)
 * @param options - Transcription options
 * @returns Transcription result with text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const client = getOpenAIClient();

  try {
    // Create a file object from the buffer
    // Whisper supports various formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
    const file = await toFile(audioBuffer, 'audio.webm', {
      type: 'audio/webm',
    });

    const response = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      response_format: 'verbose_json',
    });

    return {
      text: response.text,
      duration: response.duration,
      language: response.language,
    };
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error(
      error instanceof Error
        ? `Transcription failed: ${error.message}`
        : 'Transcription failed'
    );
  }
}

/**
 * Transcribe audio from a base64 encoded string
 * @param base64Audio - Base64 encoded audio data
 * @param mimeType - MIME type of the audio (default: audio/webm)
 * @param options - Transcription options
 * @returns Transcription result with text
 */
export async function transcribeBase64Audio(
  base64Audio: string,
  mimeType: string = 'audio/webm',
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  // Remove data URL prefix if present
  const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
  const audioBuffer = Buffer.from(base64Data, 'base64');

  const client = getOpenAIClient();

  try {
    // Determine file extension from MIME type
    const extension = mimeType.split('/')[1] || 'webm';
    const file = await toFile(audioBuffer, `audio.${extension}`, {
      type: mimeType,
    });

    const response = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      response_format: 'verbose_json',
    });

    return {
      text: response.text,
      duration: response.duration,
      language: response.language,
    };
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error(
      error instanceof Error
        ? `Transcription failed: ${error.message}`
        : 'Transcription failed'
    );
  }
}

/**
 * Check if STT service is properly configured
 */
export function isSTTConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

