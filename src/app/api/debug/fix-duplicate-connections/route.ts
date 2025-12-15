/**
 * Debug endpoint to fix duplicate channel connections
 * This removes duplicate connections keeping only the one in the workspace with auto-send enabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Only allow in development or with auth header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = supabaseAdminClient;

    // Find all active connections grouped by provider_account_id
    const { data: connections, error: connError } = await supabase
      .from('channel_connections')
      .select('id, workspace_id, provider, provider_account_id, provider_account_name, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (connError) {
      return NextResponse.json({ error: connError.message }, { status: 500 });
    }

    // Group by provider + provider_account_id to find duplicates
    const accountGroups: Record<string, typeof connections> = {};
    for (const conn of connections || []) {
      const key = `${conn.provider}:${conn.provider_account_id}`;
      if (!accountGroups[key]) {
        accountGroups[key] = [];
      }
      accountGroups[key].push(conn);
    }

    // Find duplicates (accounts connected to multiple workspaces)
    const duplicates = Object.entries(accountGroups).filter(([, conns]) => conns.length > 1);

    console.log(`Found ${duplicates.length} accounts with duplicate connections`);

    const results: any[] = [];

    for (const [accountKey, conns] of duplicates) {
      console.log(`\nProcessing duplicate: ${accountKey}`);
      console.log(`  Connected to ${conns.length} workspaces:`);
      
      // Get workspace settings for each connection to find which has auto-send enabled
      const workspaceIds = conns.map(c => c.workspace_id);
      const { data: wsSettings } = await supabase
        .from('workspace_settings')
        .select('workspace_id, auto_send_enabled')
        .in('workspace_id', workspaceIds);

      const wsSettingsMap = new Map((wsSettings || []).map(ws => [ws.workspace_id, ws.auto_send_enabled]));

      // Find which connection to keep (prefer the one with auto-send enabled)
      let keepConnection = conns[0]; // Default to oldest
      for (const conn of conns) {
        if (wsSettingsMap.get(conn.workspace_id)) {
          keepConnection = conn;
          console.log(`  → Keeping: workspace ${conn.workspace_id} (auto-send enabled)`);
          break;
        }
      }

      // Revoke all other connections
      for (const conn of conns) {
        if (conn.id !== keepConnection.id) {
          console.log(`  → Revoking: workspace ${conn.workspace_id}`);
          
          const { error: revokeError } = await supabase
            .from('channel_connections')
            .update({
              status: 'revoked',
              updated_at: new Date().toISOString(),
            })
            .eq('id', conn.id);

          results.push({
            accountKey,
            action: 'revoked',
            connectionId: conn.id,
            workspaceId: conn.workspace_id,
            error: revokeError?.message,
          });
        } else {
          results.push({
            accountKey,
            action: 'kept',
            connectionId: conn.id,
            workspaceId: conn.workspace_id,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalConnections: connections?.length || 0,
      duplicateAccounts: duplicates.length,
      results,
    });
  } catch (error) {
    console.error('Fix duplicate connections error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

