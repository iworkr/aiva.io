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

    // First, get ALL recent messages from this sender (last 7 days) to see what we have
    // This helps diagnose if the email was synced at all
    const { data: allRecentFromSender, error: recentError } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        sender_email,
        sender_name,
        timestamp,
        created_at,
        channel_connection:channel_connections(provider, provider_account_name)
      `)
      .eq('workspace_id', workspaceId)
      .ilike('sender_email', sender || '%')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(50);

    // Now try to find the exact message
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
        handled_by_aiva,
        channel_connection:channel_connections(provider, provider_account_name, provider_account_id)
      `)
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(100);

    // Use more flexible matching - search for subject OR sender
    if (subject && sender) {
      // Search for messages matching either subject or sender
      query = query.or(`subject.ilike.%${subject}%,sender_email.ilike.%${sender}%`);
    } else if (subject) {
      query = query.ilike('subject', `%${subject}%`);
    } else if (sender) {
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

    // Get workspace settings (will be fetched again below with more fields)

    // Get workspace smart filter settings
    const { data: workspaceSettings } = await supabase
      .from('workspace_settings')
      .select('auto_send_excluded_categories, auto_send_excluded_senders, auto_send_enabled, auto_send_confidence_threshold')
      .eq('workspace_id', workspaceId)
      .single();

    const excludedCategories = (workspaceSettings?.auto_send_excluded_categories as string[]) || [];
    const excludedSenders = (workspaceSettings?.auto_send_excluded_senders as string[]) || [];

    // Analyze each message
    const analyzed = messages?.map(msg => {
      const messageDrafts = drafts.filter(d => d.message_id === msg.id);
      const queueItem = queueItems.find(q => q.message_id === msg.id);

      const reasons: string[] = [];
      const checks: Record<string, boolean> = {};

      // Check 1: Actionability
      const validActionability = ['question', 'request', 'fyi', 'scheduling_intent', 'task'];
      const hasValidActionability = !!(msg.actionability && validActionability.includes(msg.actionability));
      checks.actionability = hasValidActionability;
      if (!hasValidActionability) {
        reasons.push(`Actionability is '${msg.actionability || 'null'}' (needs: ${validActionability.join(', ')})`);
      }

      // Check 2: Already has draft
      checks.hasDraft = !msg.has_draft_reply;
      if (msg.has_draft_reply) {
        reasons.push('Already has a draft');
      }

      // Check 3: Human review flag
      checks.notFlaggedForReview = !msg.requires_human_review;
      if (msg.requires_human_review) {
        reasons.push('Flagged for human review');
      }

      // Check 4: Time window (last 24 hours)
      const messageAge = Date.now() - new Date(msg.timestamp).getTime();
      const isRecent = messageAge < 24 * 60 * 60 * 1000;
      checks.isRecent = isRecent;
      if (!isRecent) {
        const hoursAgo = Math.round(messageAge / (60 * 60 * 1000));
        reasons.push(`Message is ${hoursAgo} hours old (needs to be < 24 hours)`);
      }

      // Check 5: Excluded categories
      const isExcludedCategory = excludedCategories.includes(msg.category || '');
      checks.notExcludedCategory = !isExcludedCategory;
      if (isExcludedCategory) {
        reasons.push(`Category '${msg.category}' is excluded`);
      }

      // Check 6: Excluded senders
      const senderEmail = (msg.sender_email || '').toLowerCase();
      const isExcludedSender = excludedSenders.some(excluded => 
        senderEmail.includes(excluded.toLowerCase()) || excluded.toLowerCase().includes(senderEmail)
      );
      checks.notExcludedSender = !isExcludedSender;
      if (isExcludedSender) {
        reasons.push(`Sender '${msg.sender_email}' is excluded`);
      }

      // Check 7: SENT label (should not reply to sent messages)
      const labels = (msg.labels as string[]) || [];
      const hasSentLabel = labels.some(l => l.toUpperCase() === 'SENT');
      checks.notSentMessage = !hasSentLabel;
      if (hasSentLabel) {
        reasons.push('Message has SENT label (outgoing message)');
      }

      // Check 8: Draft confidence threshold (unified threshold for auto-send and review)
      if (messageDrafts.length > 0) {
        const latestDraft = messageDrafts[0];
        const unifiedThreshold = workspaceSettings?.auto_send_confidence_threshold || 0.85;
        const meetsThreshold = (latestDraft.confidence_score || 0) >= unifiedThreshold;
        checks.meetsConfidenceThreshold = meetsThreshold;
        if (!meetsThreshold) {
          reasons.push(`Draft confidence (${latestDraft.confidence_score}) below unified threshold (${unifiedThreshold})`);
        }
        if (!queueItem) {
          reasons.push('Draft exists but not queued for auto-send');
        }
      } else {
        checks.hasDraft = false;
        if (hasValidActionability && !msg.has_draft_reply && !msg.requires_human_review && isRecent && !isExcludedCategory && !isExcludedSender && !hasSentLabel) {
          reasons.push('No draft generated yet (should be eligible for draft generation)');
        }
      }

      const wouldGetReply = Object.values(checks).every(v => v === true) && messageDrafts.length > 0 && queueItem;

      return {
        ...msg,
        drafts: messageDrafts,
        queueItem,
        reasons,
        checks,
        wouldGetReply,
        messageAgeHours: Math.round(messageAge / (60 * 60 * 1000)),
      };
    });

    return NextResponse.json({
      workspaceId,
      autoSendEnabled: workspaceSettings?.auto_send_enabled || false,
      confidenceThreshold: workspaceSettings?.auto_send_confidence_threshold || 0.85, // Unified threshold
      excludedCategories,
      excludedSenders,
      messages: analyzed,
      total: messages?.length || 0,
      // Include all recent messages from sender for debugging
      recentMessagesFromSender: allRecentFromSender || [],
      searchCriteria: {
        subject: subject || 'not provided',
        sender: sender || 'not provided',
        searchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Debug check message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

