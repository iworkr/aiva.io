/**
 * Debug endpoint to check if a message exists and why it might not have gotten an auto-reply
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const sender = searchParams.get('sender');
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    let query = supabase
      .from('messages')
      .select(`
        id,
        subject,
        sender_email,
        sender_name,
        body,
        snippet,
        timestamp,
        actionability,
        category,
        priority,
        confidence_score,
        has_draft_reply,
        requires_human_review,
        labels,
        created_at,
        channel_connection:channel_connections(provider, provider_account_name)
      `)
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (subject) {
      query = query.ilike('subject', `%${subject}%`);
    }
    if (sender) {
      query = query.ilike('sender_email', `%${sender}%`);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check for drafts and auto-send queue status
    const messageIds = messages?.map(m => m.id) || [];
    let drafts: any[] = [];
    let queueItems: any[] = [];

    if (messageIds.length > 0) {
      const { data: draftsData } = await supabase
        .from('message_drafts')
        .select('*')
        .in('message_id', messageIds);

      const { data: queueData } = await supabase
        .from('auto_send_queue')
        .select('*')
        .in('message_id', messageIds);

      drafts = draftsData || [];
      queueItems = queueData || [];
    }

    // Get workspace settings
    const { data: settings } = await supabase
      .from('workspace_settings')
      .select('auto_send_enabled, auto_send_confidence_threshold')
      .eq('workspace_id', workspaceId)
      .single();

    // Analyze each message
    const analyzed = messages?.map(msg => {
      const messageDrafts = drafts.filter(d => d.message_id === msg.id);
      const queueItem = queueItems.find(q => q.message_id === msg.id);

      const reasons: string[] = [];

      // Check if it would be eligible for draft generation
      if (!msg.actionability || msg.actionability === 'none') {
        reasons.push(`Actionability is '${msg.actionability || 'null'}' (needs: question, request, fyi, scheduling_intent, or task)`);
      }

      if (msg.has_draft_reply) {
        reasons.push('Already has a draft');
      }

      if (msg.requires_human_review) {
        reasons.push('Flagged for human review');
      }

      if (messageDrafts.length > 0) {
        const latestDraft = messageDrafts[0];
        const meetsThreshold = (latestDraft.confidence_score || 0) >= (settings?.auto_send_confidence_threshold || 0.7);
        if (!meetsThreshold) {
          reasons.push(`Draft confidence (${latestDraft.confidence_score}) below threshold (${settings?.auto_send_confidence_threshold || 0.7})`);
        }
        if (!queueItem) {
          reasons.push('Draft exists but not queued for auto-send');
        }
      } else {
        reasons.push('No draft generated yet');
      }

      return {
        ...msg,
        drafts: messageDrafts,
        queueItem,
        reasons,
        wouldGetReply: reasons.length === 0,
      };
    });

    return NextResponse.json({
      workspaceId,
      autoSendEnabled: settings?.auto_send_enabled || false,
      confidenceThreshold: settings?.auto_send_confidence_threshold || 0.7,
      messages: analyzed,
      total: messages?.length || 0,
    });
  } catch (error) {
    console.error('Debug check message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

