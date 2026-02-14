/**
 * Auto-Send Cron Job
 * Processes pending auto-send queue items and sends emails
 * Runs every minute via Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { sendReply } from '@/lib/email/send';
import { getWorkspaceAutoSendSettings, updateQueueItemStatus } from '@/lib/workers/auto-send-worker';
import { markMessageHandled } from '@/lib/inbox-zero/handler';
import { createCalendarEventFromSentEmail } from '@/lib/ai/scheduling';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout

export async function GET(request: NextRequest) {
  console.log('📤 Auto-send cron job started');
  
  // Verify cron authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.log('❌ Unauthorized auto-send cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('✅ Auto-send cron authorized');

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
    // Step 1: Check workspace settings first
    console.log('📊 Checking workspace auto-send settings...');
    const { data: allSettings, error: settingsError } = await supabase
      .from('workspace_settings')
      .select('workspace_id, auto_send_enabled, auto_send_paused, auto_send_confidence_threshold, auto_send_time_start, auto_send_time_end');
    
    if (settingsError) {
      console.error('❌ Failed to fetch workspace settings:', settingsError);
    } else {
      console.log('📋 Workspace auto-send settings:');
      allSettings?.forEach((s, i) => {
        console.log(`   ${i + 1}. Workspace ${s.workspace_id?.substring(0, 8)}... - Enabled: ${s.auto_send_enabled}, Paused: ${s.auto_send_paused}, Threshold: ${s.auto_send_confidence_threshold}`);
      });
      
      const enabledCount = allSettings?.filter(s => s.auto_send_enabled && !s.auto_send_paused).length || 0;
      console.log(`📊 ${enabledCount}/${allSettings?.length || 0} workspaces have auto-send enabled and not paused`);
    }

    // Step 2: Get pending items that are ready to send
    console.log('📥 Fetching pending auto-send queue items...');
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
        confidence_score,
        status,
        created_at
      `)
      .eq('status', 'pending')
      .lte('scheduled_send_at', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_send_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error('❌ Failed to fetch pending auto-sends:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch pending items',
        details: fetchError.message 
      }, { status: 500 });
    }

    // Also check total queue status
    const { data: allQueueItems } = await supabase
      .from('auto_send_queue')
      .select('status, confidence_score, scheduled_send_at')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (allQueueItems && allQueueItems.length > 0) {
      const statusCounts = allQueueItems.reduce((acc, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📊 Queue status breakdown:', statusCounts);
    } else {
      console.log('📊 Auto-send queue is empty');
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('ℹ️ No pending auto-sends ready to process');
      console.log(`   (Queue checked at: ${new Date().toISOString()})`);
      return NextResponse.json({ 
        message: 'No pending auto-sends',
        queueStatus: allQueueItems?.length ? 'items exist but not ready' : 'empty',
        ...results,
        duration: Date.now() - startTime 
      });
    }

    console.log(`📋 Found ${pendingItems.length} pending auto-send items ready to process:`);
    pendingItems.forEach((item, i) => {
      console.log(`   ${i + 1}. Queue ID: ${item.id?.substring(0, 8)}...`);
      console.log(`      Message: ${item.message_id?.substring(0, 8)}..., Draft: ${item.draft_id?.substring(0, 8)}...`);
      console.log(`      Confidence: ${((item.confidence_score ?? 0) * 100).toFixed(1)}%, Attempts: ${item.attempts ?? 0}`);
      console.log(`      Scheduled: ${item.scheduled_send_at}, Created: ${item.created_at}`);
    });

    // Process each item
    for (const item of pendingItems) {
      results.processed++;
      console.log(`\n🔄 Processing queue item ${results.processed}/${pendingItems.length}: ${item.id?.substring(0, 8)}...`);

      try {
        // Get workspace settings to check if auto-send is still enabled/not paused
        console.log(`   📊 Checking workspace ${item.workspace_id?.substring(0, 8)}... settings...`);
        const settings = await getWorkspaceAutoSendSettings(item.workspace_id);
        
        console.log(`   📋 Settings: enabled=${settings?.autoSendEnabled}, paused=${settings?.autoSendPaused}, threshold=${settings?.autoSendConfidenceThreshold}`);
        
        if (!settings || !settings.autoSendEnabled || settings.autoSendPaused) {
          console.log(`   ⏭️ Skipping: Auto-send ${!settings ? 'not configured' : settings.autoSendPaused ? 'paused' : 'disabled'}`);
          
          await updateQueueItemStatus(item.id, 'cancelled', {
            errorMessage: 'Auto-send disabled or paused',
          });
          
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
        const withinWindow = isWithinTimeWindow(now, settings.autoSendTimeStart, settings.autoSendTimeEnd);
        console.log(`   🕐 Time window check: ${settings.autoSendTimeStart}-${settings.autoSendTimeEnd}, Current: ${now.toTimeString().substring(0, 5)}, Within: ${withinWindow}`);
        
        if (!withinWindow) {
          const nextWindow = getNextWindowStart(settings.autoSendTimeStart);
          console.log(`   ⏭️ Outside time window, rescheduling to: ${nextWindow.toISOString()}`);
          
          await supabase
            .from('auto_send_queue')
            .update({ scheduled_send_at: nextWindow.toISOString() })
            .eq('id', item.id);

          results.skipped++;
          continue;
        }

        // Mark as processing
        console.log(`   ⚙️ Marking as processing...`);
        await updateQueueItemStatus(item.id, 'processing');

        // Get the draft content
        console.log(`   📝 Fetching draft ${item.draft_id?.substring(0, 8)}...`);
        const { data: draft, error: draftError } = await supabase
          .from('message_drafts')
          .select('body, hold_for_review, review_reason, context_data')
          .eq('id', item.draft_id)
          .single();

        if (draftError || !draft) {
          console.log(`   ❌ Draft not found: ${draftError?.message}`);
          await updateQueueItemStatus(item.id, 'failed', {
            errorMessage: 'Draft not found',
          });
          results.failed++;
          results.errors.push(`Draft not found for queue item ${item.id}`);
          continue;
        }
        console.log(`   ✅ Draft found, body length: ${draft.body?.length || 0} chars`);

        // Check if draft is held for human review
        // CRITICAL: The draft's hold_for_review is the source of truth - it was evaluated when queued
        // If the draft is NOT held for review, we should send it regardless of message.requires_human_review
        // (which might have been set by another process after queuing)
        if (draft.hold_for_review) {
          console.log(`   ⏸️ Draft held for human review: ${draft.review_reason || 'unspecified'}`);
          await updateQueueItemStatus(item.id, 'cancelled', {
            errorMessage: `Held for human review: ${draft.review_reason || 'unspecified'}`,
          });
          
          await supabase.from('auto_send_log').insert({
            workspace_id: item.workspace_id,
            message_id: item.message_id,
            draft_id: item.draft_id,
            action: 'held_for_review',
            confidence_score: item.confidence_score,
            details: { reason: draft.review_reason || 'held_for_human_review' },
          });

          results.skipped++;
          continue;
        }

        // Get the original message for threading info
        console.log(`   📧 Fetching original message ${item.message_id?.substring(0, 8)}...`);
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .select('provider_message_id, provider_thread_id, sender_email, subject, raw_data, requires_human_review, review_reason, thread_id')
          .eq('id', item.message_id)
          .single();

        if (messageError || !message) {
          console.log(`   ❌ Message not found: ${messageError?.message}`);
          await updateQueueItemStatus(item.id, 'failed', {
            errorMessage: 'Original message not found',
          });
          results.failed++;
          results.errors.push(`Message not found for queue item ${item.id}`);
          continue;
        }
        console.log(`   ✅ Message found: "${message.subject?.substring(0, 40)}..." from ${message.sender_email}`);

        // Per-thread dedup: skip if we already sent a reply for this thread
        if (message.provider_thread_id) {
          const { data: threadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('provider_thread_id', message.provider_thread_id);
          
          const threadMsgIds = (threadMessages || []).map((m: { id: string }) => m.id);
          
          if (threadMsgIds.length > 0) {
            const { data: alreadySent } = await supabase
              .from('auto_send_log')
              .select('id')
              .in('message_id', threadMsgIds)
              .eq('action', 'sent')
              .limit(1);
            
            if (alreadySent && alreadySent.length > 0) {
              console.log(`   ⏭️ SKIPPED (thread already has auto-sent reply): thread=${message.provider_thread_id.substring(0, 10)}`);
              await updateQueueItemStatus(item.id, 'cancelled', {
                errorMessage: 'Thread already has an auto-sent reply',
              });
              
              await supabase.from('auto_send_log').insert({
                workspace_id: item.workspace_id,
                message_id: item.message_id,
                draft_id: item.draft_id,
                action: 'skipped',
                confidence_score: item.confidence_score,
                details: { reason: 'thread_already_replied' },
              });

              results.skipped++;
              continue;
            }
          }
        }

        // NOTE: We no longer check message.requires_human_review here because:
        // 1. The draft's hold_for_review is the source of truth (checked above)
        // 2. If the draft is NOT held for review, it was evaluated as auto-sendable when queued
        // 3. The message's requires_human_review flag might have been set by another process
        //    (like re-classification) after the draft was queued, which shouldn't block sending
        // 4. The draft evaluation at queue time is what matters - if it passed then, it should send now
        // 
        // Exception: We still respect thread_reply_limit_reached as that's a hard limit that applies
        // regardless of draft status, but that's checked separately in the send logic below
        if (message.requires_human_review && message.review_reason === 'thread_reply_limit_reached') {
          console.log(`   ⏸️ Thread reply limit reached - cannot auto-send: ${message.review_reason}`);
          await updateQueueItemStatus(item.id, 'cancelled', {
            errorMessage: `Thread reply limit reached: ${message.review_reason}`,
          });
          
          await supabase.from('auto_send_log').insert({
            workspace_id: item.workspace_id,
            message_id: item.message_id,
            draft_id: item.draft_id,
            action: 'held_for_review',
            confidence_score: item.confidence_score,
            details: { reason: message.review_reason },
          });

          results.skipped++;
          continue;
        }

        // Get connection for provider info
        console.log(`   🔗 Fetching connection ${item.connection_id?.substring(0, 8)}...`);
        const { data: connection, error: connError } = await supabase
          .from('channel_connections')
          .select('provider, provider_account_name, provider_account_id')
          .eq('id', item.connection_id)
          .single();

        if (connError || !connection) {
          console.log(`   ❌ Connection not found: ${connError?.message}`);
          await updateQueueItemStatus(item.id, 'failed', {
            errorMessage: 'Connection not found',
          });
          results.failed++;
          results.errors.push(`Connection not found for queue item ${item.id}`);
          continue;
        }
        console.log(`   ✅ Connection: ${connection.provider} (${connection.provider_account_name})`);

        // Prepare reply subject
        const replySubject = message.subject?.startsWith('Re:') 
          ? message.subject 
          : `Re: ${message.subject || 'No Subject'}`;

        // Get message headers for threading
        const rawData = message.raw_data as any;
        const messageIdHeader = rawData?.messageId || rawData?.internetMessageId;
        const references = rawData?.references;

        console.log(`   📤 Sending reply to: ${message.sender_email}`);
        console.log(`      Subject: ${replySubject}`);
        console.log(`      Via: ${connection.provider}`);

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
          console.log(`   ✅ Reply sent successfully! Message ID: ${sendResult.messageId}`);
          
          await updateQueueItemStatus(item.id, 'sent', {
            sentMessageId: sendResult.messageId,
          });

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

          await supabase
            .from('message_drafts')
            .update({ auto_sent: true, auto_sent_at: new Date().toISOString() })
            .eq('id', item.draft_id);

          // Create outbound message record so it appears in the thread immediately
          // This matches the behavior of manual sends (sendReplyAction)
          console.log(`   📝 Creating outbound message record for thread...`);
          try {
            if (!item.workspace_id || !item.connection_id || !sendResult.messageId) {
              console.warn(`   ⚠️ Missing required fields for outbound message record`);
            } else {
              const senderEmail = (connection.provider_account_id || connection.provider_account_name || message.sender_email || '') as string;
              const { error: insertError } = await supabase
                .from('messages')
                .insert({
                  workspace_id: item.workspace_id,
                  channel_connection_id: item.connection_id,
                  provider_message_id: sendResult.messageId,
                  provider_thread_id: message.provider_thread_id || null, // Replies are in the same thread
                  subject: replySubject,
                  body: draft.body?.trim() || '',
                  snippet: (draft.body?.trim() || '').substring(0, 200),
                  sender_email: senderEmail,
                  sender_name: connection.provider_account_name || undefined,
                  recipients: JSON.stringify([{ email: message.sender_email, type: 'to' }]),
                  timestamp: new Date().toISOString(),
                  is_read: true, // Sent messages are automatically "read"
                  thread_id: message.thread_id || null, // Link to same thread
                  raw_data: {
                    auto_sent: true,
                    draft_id: item.draft_id,
                    original_message_id: item.message_id,
                  },
                });
              
              if (insertError) {
                // If insert fails (e.g., duplicate), that's okay - provider sync will pick it up
                console.warn(`   ⚠️ Could not create outbound message record: ${insertError.message}`);
              } else {
                console.log(`   ✅ Outbound message record created - will appear in thread`);
              }
            }
          } catch (insertError) {
            console.warn(`   ⚠️ Error creating outbound message record:`, insertError);
            // Don't fail the send if record creation fails
          }

          // NOTE: We no longer mark messages with missing info for review after auto-sending
          // If the AI was confident enough to auto-send (>= threshold), it should be handled
          // Users can still see auto-sent messages in attention items if they want to follow up
          // But we don't force them to review every auto-sent message with missing info

          // Create calendar event if date/time information is available
          try {
            // Get a workspace member (preferably owner) for the calendar event creation
            const { data: workspaceMember } = await supabase
              .from('workspace_members')
              .select('workspace_member_id, workspace_member_role')
              .eq('workspace_id', item.workspace_id)
              .order('workspace_member_role', { ascending: true }) // Owner first, then admin, etc.
              .limit(1)
              .single();

            if (workspaceMember?.workspace_member_id) {
              console.log(`   📅 Attempting to create calendar event (message=${item.message_id}, draft=${item.draft_id})...`);
              const eventResult = await createCalendarEventFromSentEmail(
                item.message_id,
                item.draft_id,
                item.workspace_id,
                workspaceMember.workspace_member_id,
                { useAdminClient: true }
              );
              
              if (eventResult.success) {
                console.log(`   ✅ Calendar event created: ${eventResult.eventId}`);
              } else {
                console.log(`   ℹ️ Calendar event not created: ${eventResult.message ?? 'unknown'}`);
              }
            } else {
              console.log(`   ⚠️ No workspace member found for calendar event creation`);
            }
          } catch (eventError) {
            console.error(`   ⚠️ Error creating calendar event:`, eventError);
            // Don't fail the email send if calendar event creation fails
          }

          // Mark message as handled and archive in provider (Inbox Zero)
          console.log(`   📥 Marking message as handled and archiving...`);
          const handleResult = await markMessageHandled(item.message_id, item.workspace_id, {
            action: 'auto_replied',
            markRead: true,
            archive: true,
            applyLabel: true,
          });
          console.log(`   ${handleResult.success ? '✅' : '⚠️'} Handle result: archived=${handleResult.archivedInProvider}`);

          results.sent++;
        } else {
          console.log(`   ❌ Send failed: ${sendResult.error}`);
          
          await updateQueueItemStatus(item.id, 'failed', {
            errorMessage: sendResult.error || 'Unknown send error',
          });

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
        console.error(`   ❌ Exception processing item:`, itemError);
        
        await updateQueueItemStatus(item.id, 'failed', {
          errorMessage: itemError instanceof Error ? itemError.message : 'Unknown error',
        });

        results.failed++;
        results.errors.push(`Exception for ${item.id}: ${itemError instanceof Error ? itemError.message : 'Unknown'}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n🏁 Auto-send cron completed in ${duration}ms`);
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Sent: ${results.sent}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Skipped: ${results.skipped}`);

    return NextResponse.json({
      message: 'Auto-send processing complete',
      ...results,
      duration,
    });
  } catch (error) {
    console.error('❌ Auto-send cron error:', error);
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
