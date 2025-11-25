/**
 * Manual Channel Sync API
 * Triggers manual sync for channel connections
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { syncGmailMessages } from '@/lib/gmail/sync';
import { isWorkspaceMember } from '@/data/user/workspaces';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createSupabaseUserServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, workspaceId, maxMessages, query } = body;

    if (!connectionId || !workspaceId) {
      return NextResponse.json(
        { error: 'connectionId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const isMember = await isWorkspaceMember(user.id, workspaceId);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not a workspace member' },
        { status: 403 }
      );
    }

    // Get connection to verify ownership
    const { data: connection, error } = await supabase
      .from('channel_connections')
      .select('provider, user_id')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: 'Channel connection not found' },
        { status: 404 }
      );
    }

    // Verify user owns the connection or is workspace admin
    if (connection.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to sync this connection' },
        { status: 403 }
      );
    }

    // Use universal sync orchestrator
    const { syncChannelConnection } = await import('@/lib/sync/orchestrator');
    
    const result = await syncChannelConnection(connectionId, workspaceId, {
      maxMessages: maxMessages || 50,
      autoClassify: body.autoClassify !== false, // Default true
      autoCreateTasks: body.autoCreateTasks === true, // Default false
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Channel sync error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sync status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const isMember = await isWorkspaceMember(user.id, workspaceId);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not a workspace member' },
        { status: 403 }
      );
    }

    // Get all connections for the workspace
    const { data: connections, error } = await supabase
      .from('channel_connections')
      .select('id, provider, provider_account_name, last_sync_at, status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .order('last_sync_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      connections: connections || [],
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

