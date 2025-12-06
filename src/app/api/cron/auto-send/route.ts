/**
 * Auto-Send Cron Job
 * Processes pending auto-send queue items and sends emails
 * Runs every minute via Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { sendReply } from '@/lib/email/send';
import { getWorkspaceAutoSendSettings, updateQueueItemStatus } from '@/lib/workers/auto-send-worker';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout

export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.log('Unauthorized auto-send cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = supabaseAdminClient;
  const startTime = Date.now();
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Get pending items that are ready to send
    const { data: pendingItems, error: fetchError } = await supabase
      .from('auto_send_queue')
      .select(`
        id,
        workspace_id,
        message_id,
        draft_id,
        connection_id,
        scheduled_send_at,
        attempts,
        confidence_score
      `)
      .eq('status', 'pending')
      .lte('scheduled_send_at', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_send_at', { ascending: true })
      .limit(20); // Process up to 20 items per run

    if (fetchError) {
      console.error('Failed to fetch pending auto-sends:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch pending items',
        details: fetchError.message 
      }, { status: 500 });
    }

    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ 
        message: 'No pending auto-sends',
        ...results,
        duration: Date.now() - startTime 
      });
    }

    console.log(`Processing ${pendingItems.length} auto-send items`);

    // Process each item
    for (const item of pendingItems) {
      results.processed++;

      try {
        // Get workspace settings to check if auto-send is still enabled/not paused
        const settings = await getWorkspaceAutoSendSettings(item.workspace_id);
        
        if (!settings || !settings.autoSendEnabled || settings.autoSendPaused) {
          // Auto-send disabled or paused, skip this item
          await updateQueueItemStatus(item.id, 'cancelled', {
            errorMessage: 'Auto-send disabled or paused',
          });
          
          // Log the skip
          await supabase.from('auto_send_log').insert({
            workspace_id: item.workspace_id,
            message_id: item.message_id,
            draft_id: item.draft_id,
            action: 'cancelled',
            confidence_score: item.confidence_score,
            details: { reason: 'Auto-send disabled or paused' },
          });

          results.skipped++;
          continue;
        }

        // Check time window
        const now = new Date();
        if (!isWithinTimeWindow(now, settings.autoSendTimeStart, settings.autoSendTimeEnd)) {
          // Outside time window, reschedule for next window
          const nextWindow = getNextWindowStart(settings.autoSendTimeStart);
          
          await supabase
            .from('auto_send_queue')
            .update({ scheduled_send_at: nextWindow.toISOString() })
            .eq('id', item.id);

          results.skipped++;
          continue;
        }

        // Mark as processing
        await updateQueueItemStatus(item.id, 'processing');

        // Get the draft content
        const { data: draft, error: draftError } = await supabase
          .from('message_drafts')
          .select('body')
          .eq('id', item.draft_id)
          .single();

        if (draftError || !draft) {
          await updateQueueItemStatus(item.id, 'failed', {
            errorMessage: 'Draft not found',
          });
          results.failed++;
          results.errors.push(`Draft not found for queue item ${item.id}`);
          continue;
        }

        // Get the original message for threading info
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .select('provider_message_id, provider_thread_id, sender_email, subject, raw_data')
          .eq('id', item.message_id)
          .single();

        if (messageError || !message) {
          await updateQueueItemStatus(item.id, 'failed', {
            errorMessage: 'Original message not found',
          });
          results.failed++;
          results.errors.push(`Message not found for queue item ${item.id}`);
          continue;
        }

        // Get connection for provider info
        const { data: connection, error: connError } = await supabase
          .from('channel_connections')
          .select('provider')
          .eq('id', item.connection_id)
          .single();

        if (connError || !connection) {
          await updateQueueItemStatus(item.id, 'failed', {
            errorMessage: 'Connection not found',
          });
          results.failed++;
          results.errors.push(`Connection not found for queue item ${item.id}`);
          continue;
        }

        // Prepare reply subject - always based on original message
        const replySubject = message.subject?.startsWith('Re:') 
          ? message.subject 
          : `Re: ${message.subject || 'No Subject'}`;

        // Get message headers for threading
        const rawData = message.raw_data as any;
        const messageIdHeader = rawData?.messageId || rawData?.internetMessageId;
        const references = rawData?.references;

        // Send the reply
        const sendResult = await sendReply({
          connectionId: item.connection_id,
          originalMessageId: message.provider_message_id,
          threadId: message.provider_thread_id || '',
          to: [message.sender_email],
          subject: replySubject,
          body: draft.body,
          inReplyTo: messageIdHeader,
          references: references ? `${references} ${messageIdHeader}` : messageIdHeader,
        });

        if (sendResult.success) {
          await updateQueueItemStatus(item.id, 'sent', {
            sentMessageId: sendResult.messageId,
          });

          // Log success
          await supabase.from('auto_send_log').insert({
            workspace_id: item.workspace_id,
            message_id: item.message_id,
            draft_id: item.draft_id,
            action: 'sent',
            confidence_score: item.confidence_score,
            details: {
              sent_message_id: sendResult.messageId,
              provider: connection.provider,
              to: message.sender_email,
            },
          });

          // Update draft status
          await supabase
            .from('message_drafts')
            .update({ auto_sent: true, auto_sent_at: new Date().toISOString() })
            .eq('id', item.draft_id);

          results.sent++;
        } else {
          await updateQueueItemStatus(item.id, 'failed', {
            errorMessage: sendResult.error || 'Unknown send error',
          });

          // Log failure
          await supabase.from('auto_send_log').insert({
            workspace_id: item.workspace_id,
            message_id: item.message_id,
            draft_id: item.draft_id,
            action: 'failed',
            confidence_score: item.confidence_score,
            details: {
              error: sendResult.error,
              attempt: (item.attempts ?? 0) + 1,
            },
          });

          results.failed++;
          results.errors.push(`Send failed for ${item.id}: ${sendResult.error}`);
        }
      } catch (itemError) {
        console.error(`Error processing auto-send item ${item.id}:`, itemError);
        
        await updateQueueItemStatus(item.id, 'failed', {
          errorMessage: itemError instanceof Error ? itemError.message : 'Unknown error',
        });

        results.failed++;
        results.errors.push(`Exception for ${item.id}: ${itemError instanceof Error ? itemError.message : 'Unknown'}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Auto-send cron completed in ${duration}ms:`, results);

    return NextResponse.json({
      message: 'Auto-send processing complete',
      ...results,
      duration,
    });
  } catch (error) {
    console.error('Auto-send cron error:', error);
    return NextResponse.json({ 
      error: 'Auto-send cron failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      ...results,
    }, { status: 500 });
  }
}

/**
 * Check if current time is within the allowed sending window
 */
function isWithinTimeWindow(now: Date, startTime: string, endTime: string): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight windows (e.g., 22:00 - 06:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Get the next time the sending window opens
 */
function getNextWindowStart(startTime: string): Date {
  const [hours, minutes] = startTime.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  
  next.setHours(hours, minutes, 0, 0);
  
  // If that time has passed today, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

