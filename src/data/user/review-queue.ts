/**
 * Review Queue Server Actions
 * Manage messages and drafts that need human review
 */

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isWorkspaceMember } from '@/data/user/workspaces';

// Types
export interface ReviewQueueItem {
  id: string;
  type: 'message' | 'draft';
  messageId: string;
  draftId?: string;
  subject: string;
  senderEmail: string;
  senderName?: string;
  reviewReason: string;
  reviewContext?: any;
  calendarContext?: any;
  aiUncertaintyNotes?: string;
  draftBody?: string;
  confidenceScore?: number;
  timestamp: string;
  createdAt: string;
}

// Schemas
const getReviewQueueSchema = z.object({
  workspaceId: z.string().uuid(),
  limit: z.number().min(1).max(100).optional().default(50),
});

const reviewActionSchema = z.object({
  workspaceId: z.string().uuid(),
  messageId: z.string().uuid(),
  draftId: z.string().uuid().optional(),
  action: z.enum(['approve', 'reject', 'edit_and_send', 'handle_manually']),
  editedBody: z.string().optional(),
  notes: z.string().optional(),
});

const markReviewedSchema = z.object({
  workspaceId: z.string().uuid(),
  messageId: z.string().uuid(),
  action: z.enum(['approved', 'rejected', 'handled_manually']),
});

/**
 * Get all items in the review queue for a workspace
 */
export async function getReviewQueue(
  workspaceId: string,
  userId: string,
  options: { limit?: number } = {}
): Promise<ReviewQueueItem[]> {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();
  const limit = options.limit || 50;

  // Get messages that need review
  const { data: messagesNeedingReview, error: msgError } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      sender_email,
      sender_name,
      review_reason,
      review_context,
      timestamp,
      created_at,
      message_drafts (
        id,
        body,
        confidence_score,
        hold_for_review,
        review_reason,
        calendar_context,
        ai_uncertainty_notes
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('requires_human_review', true)
    .is('reviewed_at', null)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (msgError) {
    console.error('Error fetching messages for review:', msgError);
    throw new Error(msgError.message);
  }

  // Get drafts that need review but their messages weren't flagged
  const { data: draftsNeedingReview, error: draftError } = await supabase
    .from('message_drafts')
    .select(`
      id,
      message_id,
      body,
      confidence_score,
      hold_for_review,
      review_reason,
      calendar_context,
      ai_uncertainty_notes,
      created_at,
      message:messages (
        id,
        subject,
        sender_email,
        sender_name,
        timestamp,
        requires_human_review,
        reviewed_at
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('hold_for_review', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (draftError) {
    console.error('Error fetching drafts for review:', draftError);
  }

  // Build review queue items
  const items: ReviewQueueItem[] = [];

  // Add messages that need review
  for (const msg of messagesNeedingReview || []) {
    const draft = (msg.message_drafts as any)?.[0];
    items.push({
      id: msg.id,
      type: 'message',
      messageId: msg.id,
      draftId: draft?.id,
      subject: msg.subject || '(no subject)',
      senderEmail: msg.sender_email,
      senderName: msg.sender_name || undefined,
      reviewReason: msg.review_reason || 'unspecified',
      reviewContext: msg.review_context,
      calendarContext: draft?.calendar_context,
      aiUncertaintyNotes: draft?.ai_uncertainty_notes || undefined,
      draftBody: draft?.body,
      confidenceScore: draft?.confidence_score || undefined,
      timestamp: msg.timestamp,
      createdAt: msg.created_at,
    });
  }

  // Add drafts that need review (if their message wasn't already added)
  const addedMessageIds = new Set(items.map(i => i.messageId));
  for (const draft of draftsNeedingReview || []) {
    const msg = draft.message as any;
    if (!msg || addedMessageIds.has(msg.id)) continue;
    if (msg.reviewed_at) continue; // Already reviewed

    items.push({
      id: draft.id,
      type: 'draft',
      messageId: msg.id,
      draftId: draft.id,
      subject: msg.subject || '(no subject)',
      senderEmail: msg.sender_email,
      senderName: msg.sender_name || undefined,
      reviewReason: draft.review_reason || 'unspecified',
      calendarContext: draft.calendar_context,
      aiUncertaintyNotes: draft.ai_uncertainty_notes || undefined,
      draftBody: draft.body,
      confidenceScore: draft.confidence_score || undefined,
      timestamp: msg.timestamp,
      createdAt: draft.created_at,
    });
  }

  // Sort by timestamp descending
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items.slice(0, limit);
}

/**
 * Get review queue count for badge display
 */
export async function getReviewQueueCount(
  workspaceId: string,
  userId: string
): Promise<number> {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) return 0;

  const supabase = await createSupabaseUserServerActionClient();

  // Count messages needing review
  const { count: msgCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('requires_human_review', true)
    .is('reviewed_at', null);

  return msgCount || 0;
}

/**
 * Approve a review item - queue for auto-send or send immediately
 */
export const approveReviewItemAction = authActionClient
  .schema(reviewActionSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, messageId, draftId, action, editedBody } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Mark message as reviewed
    await supabase
      .from('messages')
      .update({
        requires_human_review: false,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq('id', messageId);

    if (draftId) {
      // Update draft
      const updateData: any = {
        hold_for_review: false,
        review_reason: null,
      };

      if (editedBody) {
        updateData.body = editedBody;
      }

      await supabase
        .from('message_drafts')
        .update(updateData)
        .eq('id', draftId);

      // If action is approve, queue for auto-send
      if (action === 'approve') {
        // Get the connection
        const { data: message } = await supabase
          .from('messages')
          .select('channel_connection_id')
          .eq('id', messageId)
          .single();

        if (message?.channel_connection_id) {
          // Get draft confidence
          const { data: draft } = await supabase
            .from('message_drafts')
            .select('confidence_score')
            .eq('id', draftId)
            .single();

          // Queue for immediate send (scheduled for now)
          await supabase.from('auto_send_queue').insert({
            workspace_id: workspaceId,
            message_id: messageId,
            draft_id: draftId,
            connection_id: message.channel_connection_id,
            status: 'pending',
            scheduled_send_at: new Date().toISOString(),
            confidence_score: draft?.confidence_score || 0.8,
          });
        }
      }
    }

    // Log the review action
    await supabase.from('auto_send_log').insert({
      workspace_id: workspaceId,
      message_id: messageId,
      draft_id: draftId,
      action: `reviewed_${action}`,
      details: {
        reviewedBy: userId,
        action,
        hasEdit: !!editedBody,
      },
    });

    revalidatePath('/inbox');
    return { success: true };
  });

/**
 * Reject a review item - dismiss without sending
 */
export const rejectReviewItemAction = authActionClient
  .schema(markReviewedSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, messageId, action } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Mark message as reviewed (no longer needs review)
    await supabase
      .from('messages')
      .update({
        requires_human_review: false,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        review_context: {
          action,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
        },
      })
      .eq('id', messageId);

    // Cancel any pending auto-sends for this message
    await supabase
      .from('auto_send_queue')
      .update({ status: 'cancelled' })
      .eq('message_id', messageId)
      .eq('status', 'pending');

    // Log the review action
    await supabase.from('auto_send_log').insert({
      workspace_id: workspaceId,
      message_id: messageId,
      action: `reviewed_${action}`,
      details: {
        reviewedBy: userId,
        action,
      },
    });

    revalidatePath('/inbox');
    return { success: true };
  });

