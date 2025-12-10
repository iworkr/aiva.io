/**
 * Voice Preferences API Route
 * Manages user voice preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { getHasFeature } from '@/rsc-data/user/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VoicePreferencesBody {
  workspaceId: string;
  voiceId?: string;
  speed?: number;
  volume?: number;
  autoPlay?: boolean;
  enabled?: boolean;
}

/**
 * GET - Fetch user's voice preferences
 */
export async function GET(req: NextRequest) {
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

    // Get workspace ID from query params
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Check if user has voice access
    const hasVoiceAccess = await getHasFeature(workspaceId, 'voiceChat');
    if (!hasVoiceAccess) {
      return NextResponse.json(
        { error: 'Voice chat requires a Pro subscription' },
        { status: 403 }
      );
    }

    // Fetch preferences
    const { data: preferences, error } = await supabase
      .from('voice_preferences')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error fetching voice preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return default values if no preferences exist
    return NextResponse.json({
      preferences: preferences || {
        voice_id: '21m00Tcm4TlvDq8ikWAM',
        speed: 1.0,
        volume: 1.0,
        auto_play: true,
        enabled: true,
      },
    });
  } catch (error) {
    console.error('Voice preferences GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save/update user's voice preferences
 */
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

    // Parse request body
    const body: VoicePreferencesBody = await req.json();
    const { workspaceId, voiceId, speed, volume, autoPlay, enabled } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Check if user has voice access
    const hasVoiceAccess = await getHasFeature(workspaceId, 'voiceChat');
    if (!hasVoiceAccess) {
      return NextResponse.json(
        { error: 'Voice chat requires a Pro subscription' },
        { status: 403 }
      );
    }

    // Prepare data for upsert
    const preferencesData = {
      workspace_id: workspaceId,
      user_id: user.id,
      voice_id: voiceId,
      speed,
      volume,
      auto_play: autoPlay,
      enabled,
      updated_at: new Date().toISOString(),
    };

    // Upsert preferences
    const { data, error } = await supabase
      .from('voice_preferences')
      .upsert(preferencesData, {
        onConflict: 'workspace_id,user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving voice preferences:', error);
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: data,
    });
  } catch (error) {
    console.error('Voice preferences POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save preferences' },
      { status: 500 }
    );
  }
}

