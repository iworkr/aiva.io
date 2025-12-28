/**
 * Cleanup endpoint to auto-handle existing test messages
 * This fixes test messages that were created before the auto-handle logic was added
 */

import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getSoloWorkspace } from '@/data/user/workspaces';
import { NextRequest, NextResponse } from 'next/server';
import { handleNoActionNeeded } from '@/lib/inbox-zero/handler';

export async function POST(request: NextRequest) {
  try {
    const userSupabase = await createSupabaseUserRouteHandlerClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-detect workspace
    let workspaceId: string;
    try {
      const soloWorkspace = await getSoloWorkspace();
      workspaceId = soloWorkspace.id;
    } catch (error) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    const supabase = await createSupabaseUserRouteHandlerClient();

    // Find all test messages that haven't been handled
    const { data: testMessages, error: testError } = await supabase
      .from('messages')
      .select('id, subject, sender_email, requires_human_review, handled_by_aiva')
      .eq('workspace_id', workspaceId)
      .or('raw_data->test.eq.true,subject.ilike.%test:%')
      .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (testError) {
      return NextResponse.json({ error: testError.message }, { status: 500 });
    }

    const results = {
      found: testMessages?.length || 0,
      handled: 0,
      errors: [] as any[],
    };

    // Auto-handle each test message
    for (const msg of testMessages || []) {
      try {
        await handleNoActionNeeded(msg.id, workspaceId);
        results.handled++;
        console.log(`[Cleanup] Auto-handled test message: ${msg.id} - ${msg.subject}`);
      } catch (error) {
        results.errors.push({
          messageId: msg.id,
          subject: msg.subject,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`[Cleanup] Failed to handle test message ${msg.id}:`, error);
      }
    }

    // Also update requires_human_review to false for any remaining test messages
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        requires_human_review: false,
        review_reason: null,
        review_context: null,
      })
      .eq('workspace_id', workspaceId)
      .or('raw_data->test.eq.true,subject.ilike.%test:%')
      .eq('requires_human_review', true);

    if (updateError) {
      console.error('[Cleanup] Failed to update test messages:', updateError);
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Found ${results.found} test messages, handled ${results.handled}, ${results.errors.length} errors`,
    }, { status: 200 });
  } catch (error) {
    console.error('[Cleanup Test Messages] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

