/**
 * Voice Test API Route
 * Tests voice synthesis with a sample text
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { textToSpeech, isTTSConfigured } from '@/lib/voice/tts-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TestRequest {
  voiceId: string;
  text?: string;
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

    // Check if TTS is configured
    if (!isTTSConfigured()) {
      return NextResponse.json(
        { error: 'Voice service is not configured' },
        { status: 503 }
      );
    }

    // Parse request
    const body: TestRequest = await req.json();
    const { voiceId, text = 'Hello! I am Aiva, your AI assistant. How can I help you today?' } = body;

    if (!voiceId) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }

    // Generate test audio
    const result = await textToSpeech(text, { voiceId });

    return NextResponse.json({
      audio: result.audioBuffer.toString('base64'),
      contentType: result.contentType,
    });
  } catch (error) {
    console.error('Voice test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Voice test failed' },
      { status: 500 }
    );
  }
}

