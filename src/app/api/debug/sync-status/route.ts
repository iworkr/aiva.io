/**
 * Debug endpoint to check sync status and database state
 * This helps diagnose why syncs might not be working
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export async function GET(request: NextRequest) {
  // Only allow in development or with secret
  const authHeader = request.headers.get('authorization');
  const debugSecret = process.env.CRON_SECRET || process.env.DEBUG_SECRET;
  
  const isAuthorized = 
    process.env.NODE_ENV !== 'production' ||
    (debugSecret && authHeader === `Bearer ${debugSecret}`);
    
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = supabaseAdminClient;

    // Get all workspaces
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, created_at');

    // Get all channel connections
    const { data: connections, error: connError } = await supabase
      .from('channel_connections')
      .select(`
        id,
        workspace_id,
        provider,
        provider_account_name,
        status,
        last_sync_at,
        created_at,
        access_token,
        refresh_token
      `);

    // Get workspace settings
    const { data: settings, error: settingsError } = await supabase
      .from('workspace_settings')
      .select('*');

    // Get recent messages count
    const { count: messageCount, error: msgError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    // Prepare connection info (hide sensitive data)
    const connectionInfo = connections?.map(c => ({
      id: c.id,
      workspace_id: c.workspace_id,
      provider: c.provider,
      provider_account_name: c.provider_account_name,
      status: c.status,
      last_sync_at: c.last_sync_at,
      created_at: c.created_at,
      has_access_token: !!c.access_token,
      access_token_length: c.access_token?.length || 0,
      has_refresh_token: !!c.refresh_token,
    }));

    // Group connections by status
    const connectionsByStatus = connections?.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group connections by provider
    const connectionsByProvider = connections?.reduce((acc, c) => {
      acc[c.provider] = (acc[c.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalWorkspaces: workspaces?.length || 0,
        totalConnections: connections?.length || 0,
        activeConnections: connections?.filter(c => c.status === 'active').length || 0,
        totalMessages: messageCount || 0,
        connectionsByStatus,
        connectionsByProvider,
      },
      workspaces: workspaces?.map(w => ({
        id: w.id,
        name: w.name,
        created_at: w.created_at,
      })),
      connections: connectionInfo,
      workspaceSettings: settings?.map(s => ({
        workspace_id: s.workspace_id,
        has_settings: !!s.workspace_settings,
        auto_send_enabled: s.auto_send_enabled,
        auto_send_paused: s.auto_send_paused,
      })),
      errors: {
        workspaces: wsError?.message,
        connections: connError?.message,
        settings: settingsError?.message,
        messages: msgError?.message,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

