/**
 * Cleanup endpoint to auto-handle existing test messages
 * This fixes test messages that were created before the auto-handle logic was added
 */

import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getSoloWorkspace } from '@/data/user/workspaces';
import { NextRequest, NextResponse } from 'next/server';
import { handleNoActionNeeded } from '@/lib/inbox-zero/handler';

export async function GET(request: NextRequest) {
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
    // Use improved detection: raw_data.test, subject "test:" or "test", or snippet is "test"/"test 2"/"test 3"
    const { data: allMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id, subject, snippet, sender_email, requires_human_review, handled_by_aiva, raw_data')
      .eq('workspace_id', workspaceId)
      .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
      .order('timestamp', { ascending: false })
      .limit(200); // Get more messages to filter client-side
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    // Filter to test messages using improved detection logic
    const testMessages = (allMessages || []).filter((msg: any) => {
      const subjectLower = (msg.subject || "").toLowerCase();
      const snippetLower = (msg.snippet || "").toLowerCase().trim();
      return (
        msg.raw_data?.test === true ||
        msg.raw_data?.testType !== undefined ||
        subjectLower.includes('test:') ||
        subjectLower === 'test' ||
        snippetLower === 'test' ||
        /^test\s*\d*$/i.test(snippetLower) || // "test", "test 2", "test 3", etc.
        (subjectLower.includes('test') && msg.sender_email?.includes('example.com'))
      );
    });

    const results = {
      found: testMessages.length,
      handled: 0,
      errors: [] as any[],
    };

    // Auto-handle each test message
    for (const msg of testMessages || []) {
      try {
        // First, update requires_human_review to false (so handleNoActionNeeded doesn't block)
        await supabase
          .from('messages')
          .update({
            requires_human_review: false,
            review_reason: null,
            review_context: null,
          })
          .eq('id', msg.id);
        
        // Then mark as handled
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

    // Also directly mark test messages as handled if handleNoActionNeeded failed
    // This ensures they're marked as handled even if the handler has issues
    const { error: directUpdateError } = await supabase
      .from('messages')
      .update({
        handled_by_aiva: true,
        handled_at: new Date().toISOString(),
        handle_action: 'classified_no_action',
        requires_human_review: false,
        review_reason: null,
        review_context: null,
      })
      .eq('workspace_id', workspaceId)
      .in('id', testMessages.map((m: any) => m.id))
      .or('handled_by_aiva.is.null,handled_by_aiva.eq.false');

    if (directUpdateError) {
      console.error('[Cleanup] Failed to directly update test messages:', directUpdateError);
    }

    // Return HTML response for easy browser viewing
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Cleanup Test Messages</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
    .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 10px; }
    .button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <h1>🧹 Test Messages Cleanup</h1>
  
  <div class="info">
    <h2>Results</h2>
    <p><strong>Found:</strong> ${results.found} test messages</p>
    <p><strong>Handled:</strong> ${results.handled} messages</p>
    <p><strong>Errors:</strong> ${results.errors.length}</p>
  </div>

  ${results.errors.length > 0 ? `
    <div class="error">
      <h3>Errors</h3>
      <pre>${JSON.stringify(results.errors, null, 2)}</pre>
    </div>
  ` : ''}

  ${results.handled > 0 ? `
    <div class="success">
      <h3>✅ Success!</h3>
      <p>Successfully auto-handled ${results.handled} test message(s).</p>
      <p>These messages will no longer appear in "What needs your attention".</p>
    </div>
  ` : results.found === 0 ? `
    <div class="info">
      <h3>ℹ️ No Test Messages Found</h3>
      <p>All test messages have already been handled, or there are no test messages in your workspace.</p>
    </div>
  ` : ''}

  <div style="margin-top: 30px;">
    <a href="/api/debug/message-counts" class="button">📊 Check Message Counts</a>
    <a href="/en/dashboard" class="button" style="background: #28a745;">🏠 Go to Dashboard</a>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[Cleanup Test Messages] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

