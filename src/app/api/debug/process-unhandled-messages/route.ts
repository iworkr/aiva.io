/**
 * Debug endpoint to process unhandled messages
 * This will classify and auto-handle messages that haven't been processed yet
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { classifyMessage } from '@/lib/ai/classifier';
import { handleNoActionNeeded } from '@/lib/inbox-zero/handler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const supabase = supabaseAdminClient;

    // Get unhandled messages that are unread
    // Priority: messages that are missing classification OR have actionability = 'none' but aren't handled
    const { data: unhandledMessages, error: unhandledError } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        sender_email,
        is_read,
        handled_by_aiva,
        priority,
        category,
        actionability,
        requires_human_review,
        reviewed_at
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_read', false)
      .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (unhandledError) {
      return NextResponse.json({ error: unhandledError.message }, { status: 500 });
    }

    const results = {
      totalFound: unhandledMessages?.length || 0,
      classified: 0,
      autoHandled: 0,
      requiresReview: 0,
      errors: [] as any[],
      processed: [] as any[],
    };

    // Process each message
    for (const msg of unhandledMessages || []) {
      try {
        // Check if message needs classification
        const needsClassification = !msg.priority || !msg.category || !msg.actionability;
        
        if (needsClassification) {
          // Classify the message
          console.log(`[Process] Classifying message ${msg.id}: ${msg.subject?.substring(0, 30)}`);
          const classification = await classifyMessage(msg.id, workspaceId, { useAdminClient: true });
          results.classified++;
          
          // Check if it should be auto-handled (actionability = 'none' and doesn't require review)
          if (classification.actionability === 'none' && !classification.requiresHumanReview) {
            console.log(`[Process] Auto-handling no-action message ${msg.id}`);
            await handleNoActionNeeded(msg.id, workspaceId);
            results.autoHandled++;
            results.processed.push({
              id: msg.id,
              subject: msg.subject,
              action: 'auto_handled',
              reason: 'no_action_needed',
            });
          } else if (classification.requiresHumanReview) {
            results.requiresReview++;
            results.processed.push({
              id: msg.id,
              subject: msg.subject,
              action: 'requires_review',
              reason: classification.reviewReason,
            });
          } else {
            results.processed.push({
              id: msg.id,
              subject: msg.subject,
              action: 'classified',
              actionability: classification.actionability,
            });
          }
        } else {
          // Message is already classified, check if it should be auto-handled
          if (msg.actionability === 'none' && !msg.requires_human_review) {
            console.log(`[Process] Auto-handling already-classified no-action message ${msg.id}`);
            await handleNoActionNeeded(msg.id, workspaceId);
            results.autoHandled++;
            results.processed.push({
              id: msg.id,
              subject: msg.subject,
              action: 'auto_handled',
              reason: 'no_action_needed',
            });
          } else if (msg.requires_human_review) {
            results.requiresReview++;
            results.processed.push({
              id: msg.id,
              subject: msg.subject,
              action: 'requires_review',
              reason: 'already_flagged',
            });
          } else {
            results.processed.push({
              id: msg.id,
              subject: msg.subject,
              action: 'skipped',
              reason: 'already_classified_and_actionable',
            });
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Process] Error processing message ${msg.id}:`, errorMsg);
        results.errors.push({
          id: msg.id,
          subject: msg.subject,
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      workspaceId,
      summary: {
        totalFound: results.totalFound,
        classified: results.classified,
        autoHandled: results.autoHandled,
        requiresReview: results.requiresReview,
        errors: results.errors.length,
      },
      processed: results.processed.slice(0, 20), // Limit response size
      errors: results.errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Process unhandled messages error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


