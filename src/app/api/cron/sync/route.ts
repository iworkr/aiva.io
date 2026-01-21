/**
 * Cron Job: Automatic Message Sync
 * Runs periodically to sync all active channel connections
 * 
 * ENFORCES subscription status and usage limits before syncing
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { syncGmailMessages } from '@/lib/gmail/sync';
import { syncOutlookMessages } from '@/lib/outlook/sync';
import { classifyMessage } from '@/lib/ai/classifier';
import { generateReplyDraft } from '@/lib/ai/reply-generator';
import {
  checkAutoReplyEligibility,
  DEFAULT_EXCLUDED_SENDER_PATTERNS,
  DEFAULT_EXCLUDED_CATEGORIES,
} from '@/lib/workers/auto-send-worker';
import {
  requireActiveEntitlement,
  checkUsageLimits,
  incrementUsage,
  isEntitlementActive,
  hasFeatureAccess,
} from '@/lib/entitlements-guard';

/**
 * Verify the request is from Vercel Cron or an authorized source
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCron = request.headers.get('x-vercel-cron');
  
  console.log('🔐 Cron auth check:', {
    hasAuthHeader: !!authHeader,
    hasCronSecret: !!cronSecret,
    hasVercelCronHeader: !!vercelCron,
    authHeaderPrefix: authHeader?.substring(0, 20) + '...',
  });
  
  // Method 1: Check CRON_SECRET Bearer token
  if (cronSecret && authHeader) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader === expectedAuth) {
      console.log('✅ Cron auth: Valid CRON_SECRET');
      return true;
    }
  }
  
  // Method 2: Check for Vercel's internal cron header
  if (vercelCron === '1') {
    console.log('✅ Cron auth: Valid x-vercel-cron header');
    return true;
  }
  
  // Method 3: In development, allow without auth
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Cron auth: Development mode');
    return true;
  }
  
  console.log('❌ Cron auth failed');
  return false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify this is a legitimate cron request
    if (!verifyCronRequest(request)) {
      console.warn('Unauthorized cron request attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier') || 'all';

    console.log(`🔄 Automatic sync cron started - tier: ${tier}`);

    const supabase = supabaseAdminClient;

    // Step 1: Get ALL active channel connections directly
    // This bypasses all the workspace/plan complexity
    const { data: connections, error: connError } = await supabase
      .from('channel_connections')
      .select(`
        id,
        workspace_id,
        provider,
        provider_account_id,
        provider_account_name,
        status,
        access_token,
        last_sync_at
      `)
      .eq('status', 'active');

    if (connError) {
      console.error('❌ Failed to fetch connections:', connError);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch connections: ${connError.message}`,
      }, { status: 500 });
    }

    console.log(`📊 Found ${connections?.length || 0} active connections total`);

    if (!connections || connections.length === 0) {
      console.log('⚠️ No active connections found in database');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No active connections to sync',
        totalConnections: 0,
      });
    }

    // Log connection details
    console.log('📋 Connection details:');
    connections.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.provider} - ${c.provider_account_name} (workspace: ${c.workspace_id?.substring(0, 8)}...)`);
      console.log(`      Status: ${c.status}, Has token: ${!!c.access_token}, Last sync: ${c.last_sync_at || 'never'}`);
    });

    // Step 2: Sync each connection
    let totalSynced = 0;
    let totalNewMessages = 0;
    let totalErrors = 0;
    const results: any[] = [];

    for (const connection of connections) {
      console.log(`\n🔄 Syncing ${connection.provider}: ${connection.provider_account_name}...`);
      
      // ENTITLEMENT CHECK: Verify workspace has active subscription
      const entitlementCheck = await requireActiveEntitlement(connection.workspace_id);
      if (!entitlementCheck.isValid) {
        console.log(`   🚫 Skipping - no active subscription: ${entitlementCheck.reason}`);
        results.push({
          connectionId: connection.id,
          provider: connection.provider,
          account: connection.provider_account_name,
          success: false,
          skipped: true,
          skipReason: `No active subscription: ${entitlementCheck.reason}`,
        });
        continue;
      }
      
      // USAGE LIMIT CHECK: Verify workspace is within message limits
      const usageLimits = await checkUsageLimits(connection.workspace_id);
      if (!usageLimits.withinLimits) {
        console.log(`   🚫 Skipping - usage limit reached: ${usageLimits.reason}`);
        results.push({
          connectionId: connection.id,
          provider: connection.provider,
          account: connection.provider_account_name,
          success: false,
          skipped: true,
          skipReason: `Usage limit reached: ${usageLimits.reason}`,
        });
        continue;
      }
      
      console.log(`   ✅ Entitlement valid (${entitlementCheck.planFeatures.plan}), usage: ${usageLimits.currentUsage.messages}/${usageLimits.limits.maxMessages === -1 ? 'unlimited' : usageLimits.limits.maxMessages}`);
      
      // Rate limit protection: Skip if last sync was less than 2 minutes ago
      // Reduced from 5 minutes to 2 minutes to process messages faster
      // Gmail quota: 1 billion quota units per day, ~250 units per message fetch
      // This allows ~4000 messages per day, so 2 minutes is safe for most use cases
      if (connection.last_sync_at) {
        const lastSyncTime = new Date(connection.last_sync_at).getTime();
        const timeSinceLastSync = Date.now() - lastSyncTime;
        const minSyncInterval = 2 * 60 * 1000; // 2 minutes minimum between syncs (reduced from 5 minutes)
        
        if (timeSinceLastSync < minSyncInterval) {
          const waitTime = Math.ceil((minSyncInterval - timeSinceLastSync) / 1000);
          console.log(`   ⏳ Skipping - last sync was ${Math.round(timeSinceLastSync / 1000)}s ago, need ${waitTime}s more cooldown`);
          continue;
        }
      }
      
      // Calculate max messages to sync based on remaining limit
      const remainingMessages = usageLimits.limits.maxMessages === -1 
        ? 100 
        : Math.min(usageLimits.limits.maxMessages - usageLimits.currentUsage.messages, 100);
      
      if (remainingMessages <= 0) {
        console.log(`   🚫 Skipping - no remaining message quota`);
        continue;
      }
      
      try {
        let syncResult: any;

        // Calculate message limit for this sync (respect plan limits)
        const maxMessagesForSync = Math.min(remainingMessages, connection.provider === 'gmail' ? 25 : 50);
        
        switch (connection.provider) {
          case 'gmail':
            console.log(`   📧 Starting Gmail sync (max ${maxMessagesForSync} messages)...`);
            syncResult = await syncGmailMessages(connection.id, connection.workspace_id, {
              maxMessages: maxMessagesForSync,
              useAdminClient: true, // Critical: use admin client for cron jobs
            });
            break;

          case 'outlook':
            console.log(`   📧 Starting Outlook sync (max ${maxMessagesForSync} messages)...`);
            syncResult = await syncOutlookMessages(connection.id, connection.workspace_id, {
              maxMessages: maxMessagesForSync,
              useAdminClient: true, // Critical: use admin client for cron jobs
            });
            break;

          default:
            console.log(`   ⏭️ Skipping ${connection.provider} - sync not implemented`);
            continue;
        }

        console.log(`   ✅ Sync complete: ${syncResult?.syncedCount || 0} messages (${syncResult?.newCount || 0} new)`);
        
        // INCREMENT USAGE: Track synced messages
        if (syncResult?.newCount > 0) {
          await incrementUsage(connection.workspace_id, 'messages', syncResult.newCount);
          console.log(`   📊 Usage updated: +${syncResult.newCount} messages`);
        }
        
        totalSynced++;
        totalNewMessages += syncResult?.newCount || 0;

        // Auto-classify unclassified messages in this workspace
        let classifiedCount = 0;
        let draftsGenerated = 0;
        
        // Check if workspace has auto-send enabled and get filter settings
        const { data: wsSettings } = await supabase
          .from('workspace_settings')
          .select(`
            auto_send_enabled, 
            auto_send_confidence_threshold,
            auto_send_excluded_categories,
            auto_send_excluded_senders,
            auto_send_domain_whitelist,
            auto_send_domain_blacklist,
            auto_send_max_replies_per_thread,
            auto_send_sender_cooldown_minutes
          `)
          .eq('workspace_id', connection.workspace_id)
          .single();

        const autoSendEnabled = wsSettings?.auto_send_enabled ?? false;
        const confidenceThreshold = wsSettings?.auto_send_confidence_threshold ?? 0.70;
        
        // Filter settings for smart auto-reply
        // Ensure all array fields are actually arrays (database might return null or other types)
        const filterSettings = {
          connectionEmail: connection.provider_account_id || '',
          excludedSenderPatterns: Array.isArray(wsSettings?.auto_send_excluded_senders) 
            ? wsSettings.auto_send_excluded_senders 
            : DEFAULT_EXCLUDED_SENDER_PATTERNS,
          excludedCategories: Array.isArray(wsSettings?.auto_send_excluded_categories)
            ? wsSettings.auto_send_excluded_categories
            : DEFAULT_EXCLUDED_CATEGORIES,
          domainWhitelist: Array.isArray(wsSettings?.auto_send_domain_whitelist)
            ? wsSettings.auto_send_domain_whitelist
            : [],
          domainBlacklist: Array.isArray(wsSettings?.auto_send_domain_blacklist)
            ? wsSettings.auto_send_domain_blacklist
            : [],
          maxRepliesPerThread: wsSettings?.auto_send_max_replies_per_thread ?? 5, // Allow up to 5 replies per thread for ongoing conversations
          senderCooldownMinutes: wsSettings?.auto_send_sender_cooldown_minutes ?? 60,
        };

        try {
          // Classify messages that are missing priority, category, or actionability
          // Increased limit from 50 to 100 to process more messages per run
          const { data: unclassifiedMessages } = await supabase
            .from('messages')
            .select('id, subject')
            .eq('workspace_id', connection.workspace_id)
            .or('priority.is.null,category.is.null,actionability.is.null')
            .order('created_at', { ascending: false })
            .limit(100); // Increased from 50 to 100 to process more messages per run

          if (unclassifiedMessages && unclassifiedMessages.length > 0) {
            console.log(`   🤖 Classifying ${unclassifiedMessages.length} messages...`);
            
            for (const msg of unclassifiedMessages) {
              try {
                const result = await classifyMessage(msg.id, connection.workspace_id, { useAdminClient: true });
                classifiedCount++;
                console.log(`      ✅ ${msg.subject?.substring(0, 30) || 'No subject'} → ${result.priority}/${result.category} (${result.actionability})`);
              } catch (classifyErr) {
                console.error(`      ❌ Failed to classify ${msg.id}:`, classifyErr instanceof Error ? classifyErr.message : classifyErr);
              }
            }
            console.log(`   📊 Classified ${classifiedCount}/${unclassifiedMessages.length} messages`);
          }

          // Also auto-handle messages that are already classified but not handled
          // 1. Messages with actionability = 'none' OR 'fyi' that don't require review
          // Both 'none' and 'fyi' mean "no response needed" - they should be auto-handled
          const { data: unhandledNoActionMessages } = await supabase
            .from('messages')
            .select('id, subject, actionability, requires_human_review, handled_by_aiva')
            .eq('workspace_id', connection.workspace_id)
            .in('actionability', ['none', 'fyi']) // Both mean "no response needed"
            .eq('requires_human_review', false)
            .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
            .order('created_at', { ascending: false })
            .limit(50); // Process up to 50 no-action messages per run

          if (unhandledNoActionMessages && unhandledNoActionMessages.length > 0) {
            console.log(`   🧹 Auto-handling ${unhandledNoActionMessages.length} no-action messages (actionability: none/fyi)...`);
            let autoHandledCount = 0;
            
            for (const msg of unhandledNoActionMessages) {
              try {
                const { handleNoActionNeeded } = await import('@/lib/inbox-zero/handler');
                await handleNoActionNeeded(msg.id, connection.workspace_id);
                autoHandledCount++;
                console.log(`      ✅ Auto-handled (${msg.actionability}): ${msg.subject?.substring(0, 30) || 'No subject'}`);
              } catch (handleErr) {
                console.error(`      ❌ Failed to auto-handle ${msg.id}:`, handleErr instanceof Error ? handleErr.message : handleErr);
              }
            }
            console.log(`   📊 Auto-handled ${autoHandledCount}/${unhandledNoActionMessages.length} messages`);
          }

          // 2. Messages in excluded categories (should be auto-handled even if they require review)
          // If a category is excluded, it means the user doesn't want to see it, so auto-handle it
          if (filterSettings.excludedCategories.length > 0) {
            // Fetch all unhandled messages and filter by excluded categories in code
            // This avoids type issues with .in() on category enum
            const { data: unhandledMessages } = await supabase
              .from('messages')
              .select('id, subject, category, requires_human_review, handled_by_aiva')
              .eq('workspace_id', connection.workspace_id)
              .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
              .order('created_at', { ascending: false })
              .limit(100); // Get more to filter after
            
            // Filter to only excluded categories
            const excludedCategoryMessages = (unhandledMessages || []).filter(msg => 
              msg.category && filterSettings.excludedCategories.some(
                excluded => excluded.toLowerCase() === msg.category?.toLowerCase()
              )
            ).slice(0, 50); // Limit to 50 after filtering

            if (excludedCategoryMessages && excludedCategoryMessages.length > 0) {
              console.log(`   🗑️ Auto-handling ${excludedCategoryMessages.length} messages in excluded categories...`);
              let excludedHandledCount = 0;
              
              for (const msg of excludedCategoryMessages) {
                try {
                  // Use manually_dismissed action to bypass the requires_human_review check
                  // This allows us to auto-handle messages in excluded categories even if they require review
                  const { markMessageHandled } = await import('@/lib/inbox-zero/handler');
                  const result = await markMessageHandled(msg.id, connection.workspace_id, {
                    action: 'manually_dismissed', // Use this to bypass review check
                    markRead: true,
                    archive: true,
                    applyLabel: true,
                  });
                  
                  if (result.success) {
                    excludedHandledCount++;
                    console.log(`      ✅ Auto-handled excluded category: ${msg.category} - ${msg.subject?.substring(0, 30) || 'No subject'}`);
                  } else {
                    console.warn(`      ⚠️ Failed to auto-handle ${msg.id}: ${result.error}`);
                  }
                } catch (handleErr) {
                  console.error(`      ❌ Failed to auto-handle excluded category message ${msg.id}:`, handleErr instanceof Error ? handleErr.message : handleErr);
                }
              }
              console.log(`   📊 Auto-handled ${excludedHandledCount}/${excludedCategoryMessages.length} excluded category messages`);
            }
          }

          // 3. Read messages that are not actionable (Zero Inbox: if read and no action needed, auto-handle)
          // Check if Zero Inbox is enabled for this workspace
          const { data: zeroInboxSettings } = await supabase
            .from('workspace_settings')
            .select('inbox_zero_enabled')
            .eq('workspace_id', connection.workspace_id)
            .single();

          const isZeroInboxEnabled = zeroInboxSettings?.inbox_zero_enabled ?? false;

          if (isZeroInboxEnabled) {
            // Fetch read messages that are not actionable and not handled
            // Both 'none' and 'fyi' mean "no response needed" - they should be auto-handled
            const { data: readNoActionMessages } = await supabase
              .from('messages')
              .select('id, subject, actionability, is_read, requires_human_review, handled_by_aiva')
              .eq('workspace_id', connection.workspace_id)
              .eq('is_read', true)
              .in('actionability', ['none', 'fyi']) // Both mean "no response needed"
              .eq('requires_human_review', false)
              .or('handled_by_aiva.is.null,handled_by_aiva.eq.false')
              .order('created_at', { ascending: false })
              .limit(50); // Process up to 50 read no-action messages per run

            if (readNoActionMessages && readNoActionMessages.length > 0) {
              console.log(`   📖 Auto-handling ${readNoActionMessages.length} read messages with no action needed (actionability: none/fyi)...`);
              let readHandledCount = 0;
              
              for (const msg of readNoActionMessages) {
                try {
                  const { handleNoActionNeeded } = await import('@/lib/inbox-zero/handler');
                  const result = await handleNoActionNeeded(msg.id, connection.workspace_id);
                  
                  if (result.success) {
                    readHandledCount++;
                    console.log(`      ✅ Auto-handled read message (${msg.actionability}): ${msg.subject?.substring(0, 30) || 'No subject'}`);
                  } else {
                    console.warn(`      ⚠️ Failed to auto-handle read message ${msg.id}: ${result.error}`);
                  }
                } catch (handleErr) {
                  console.error(`      ❌ Failed to auto-handle read message ${msg.id}:`, handleErr instanceof Error ? handleErr.message : handleErr);
                }
              }
              console.log(`   📊 Auto-handled ${readHandledCount}/${readNoActionMessages.length} read no-action messages`);
            }
          }
        } catch (classifyError) {
          console.error(`   ❌ Classification error:`, classifyError);
        }

        // PLAN CHECK: Only generate AI drafts for Pro/Enterprise plans
        const hasAIDraftsFeature = entitlementCheck.planFeatures.aiDrafts === true;
        
        if (!hasAIDraftsFeature) {
          console.log(`   ⏭️ Skipping AI draft generation - ${entitlementCheck.planFeatures.plan} plan does not include AI drafts`);
        } else {
          // Generate drafts for actionable messages (Pro/Enterprise only)
          // Auto-send setting only controls whether drafts get QUEUED for automatic sending
          // But we now filter OUT inappropriate messages (self-replies, system emails, etc.)
          console.log(`   ✍️ Generating drafts for actionable messages (auto-send: ${autoSendEnabled ? 'enabled' : 'disabled'}, threshold: ${confidenceThreshold})...`);
          console.log(`      🔍 Filter: connection email=${filterSettings.connectionEmail}, excluded categories=${filterSettings.excludedCategories.length}, excluded senders=${filterSettings.excludedSenderPatterns.length}`);
        
        try {
          // Get messages that need drafts:
          // - Any actionability type that might need a response (excluding 'none')
          // - No existing draft OR draft exists but is held for review (regenerate if needed)
          // - Include messages requiring human review (they still need drafts, just won't be auto-sent)
          // - Recent (last 48 hours - extended to catch missed messages)
          // - CRITICAL: Only messages received by THIS connection (not other connections in the workspace)
          // - Include sender_email, category, provider_thread_id, labels for filtering
          const { data: actionableMessages } = await supabase
            .from('messages')
            .select(`
              id, 
              subject, 
              actionability, 
              has_draft_reply, 
              sender_email, 
              category, 
              provider_thread_id, 
              labels, 
              requires_human_review,
              timestamp,
              message_drafts(id, hold_for_review, auto_sent)
            `)
            .eq('workspace_id', connection.workspace_id)
            .eq('channel_connection_id', connection.id) // CRITICAL: Only process messages for THIS connection
            .in('actionability', ['question', 'request', 'fyi', 'scheduling_intent', 'task']) // All types except 'none'
            // Include messages without drafts OR messages with held drafts (may need regeneration)
            .or('has_draft_reply.eq.false,has_draft_reply.is.null')
            // Include messages requiring human review - they still need drafts for user review
            // Extended to 48 hours to catch messages that might have been missed
            .gte('timestamp', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: false })
            .limit(20); // Increased limit to catch more messages
          
          // Also check for messages that might not be classified yet but should be actionable
          // This catches messages that were synced but classification failed or hasn't run yet
          const { data: unclassifiedActionableMessages } = await supabase
            .from('messages')
            .select('id, subject, actionability, sender_email, timestamp')
            .eq('workspace_id', connection.workspace_id)
            .eq('channel_connection_id', connection.id)
            .is('actionability', null)
            .gte('timestamp', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: false })
            .limit(10);
          
          if (unclassifiedActionableMessages && unclassifiedActionableMessages.length > 0) {
            console.log(`      ⚠️ Found ${unclassifiedActionableMessages.length} unclassified messages - they need classification before draft generation`);
            console.log(`      📋 Unclassified messages:`, unclassifiedActionableMessages.map((m: any) => ({
              subject: m.subject?.substring(0, 40),
              sender: m.sender_email,
              timestamp: m.timestamp,
            })));
          }

          if (actionableMessages && actionableMessages.length > 0) {
            // Filter out messages that already have non-held drafts
            const messagesNeedingDrafts = actionableMessages.filter((msg: any) => {
              const drafts = (msg.message_drafts || []) as any[];
              // If has draft but it's held for review or was auto-sent, we might want to regenerate
              // For now, only process messages without any drafts
              const needsDraft = drafts.length === 0;
              
              // Log messages that are being skipped due to existing drafts
              if (!needsDraft) {
                console.log(`      ⏭️ Skipping ${msg.subject?.substring(0, 30) || 'No subject'} - already has ${drafts.length} draft(s)`);
              }
              
              return needsDraft;
            });
            
            console.log(`      📝 Found ${actionableMessages.length} actionable messages (${messagesNeedingDrafts.length} without drafts)`);
            
            // Log all actionable messages for debugging
            console.log(`      📋 Actionable messages breakdown:`, actionableMessages.map((m: any) => ({
              subject: m.subject?.substring(0, 40),
              actionability: m.actionability,
              hasDraftReply: m.has_draft_reply,
              draftCount: (m.message_drafts || []).length,
              category: m.category,
              requiresReview: m.requires_human_review,
            })));
            
            let skippedByFilter = 0;
            const connectionEmailLower = (filterSettings.connectionEmail || '').toLowerCase();
            
            for (const msg of messagesNeedingDrafts) {
              try {
                const senderEmailLower = (msg.sender_email || '').toLowerCase();
                const labels = (msg.labels as string[]) || [];
                
                // *** IMMEDIATE CHECKS - Skip without full filter check ***
                
                // Check 1: Skip SENT messages (our own outgoing messages)
                if (labels.some(l => l.toUpperCase() === 'SENT')) {
                  skippedByFilter++;
                  console.log(`      ⏭️ SKIPPED (SENT label): ${msg.subject?.substring(0, 30) || 'No subject'}`);
                  continue;
                }
                
                // Check 2: Skip if sender is our own email (self-reply prevention)
                if (connectionEmailLower && senderEmailLower === connectionEmailLower) {
                  skippedByFilter++;
                  console.log(`      ⏭️ SKIPPED (self-email): ${msg.subject?.substring(0, 30) || 'No subject'}`);
                  // Mark has_draft_reply to prevent re-processing
                  await supabase
                    .from('messages')
                    .update({ has_draft_reply: true })
                    .eq('id', msg.id);
                  continue;
                }
                
                // Check 3: Skip if sender contains our email domain's username part
                // e.g., if connection is "aivaioapp@gmail.com", skip "aivaioapp" from any domain
                if (connectionEmailLower) {
                  const ourUsername = connectionEmailLower.split('@')[0];
                  const senderUsername = senderEmailLower.split('@')[0];
                  if (ourUsername && senderUsername && ourUsername === senderUsername) {
                    skippedByFilter++;
                    console.log(`      ⏭️ SKIPPED (username match): ${msg.subject?.substring(0, 30) || 'No subject'}`);
                    continue;
                  }
                }
                
                // *** FULL SMART FILTER CHECK ***
                // Check if this message should receive an auto-reply
                // Note: Messages requiring human review still get drafts (for user review), but won't be auto-sent
                const filterResult = await checkAutoReplyEligibility(
                  {
                    id: msg.id,
                    sender_email: msg.sender_email || '',
                    category: msg.category,
                    provider_thread_id: msg.provider_thread_id,
                  },
                  connection.workspace_id,
                  filterSettings
                );

                // If message requires human review, still generate draft (user needs to review it)
                // But log that it was filtered for auto-send
                // CRITICAL: Thread reply limit reached messages should still get drafts for human review
                const isThreadLimitReached = !filterResult.eligible && filterResult.reason?.includes('Thread reply limit');
                
                if (!filterResult.eligible) {
                  if (msg.requires_human_review || isThreadLimitReached) {
                    // Thread limit reached or already marked for review - still generate draft
                    if (isThreadLimitReached) {
                      console.log(`      ⚠️ Thread reply limit reached - generating draft for human review: ${filterResult.reason}`);
                      // Mark message as requiring human review so it appears in review queue
                      await supabase
                        .from('messages')
                        .update({
                          requires_human_review: true,
                          review_reason: 'thread_reply_limit_reached',
                          review_context: {
                            reason: filterResult.reason,
                            details: filterResult.details,
                            markedAt: new Date().toISOString(),
                          },
                        })
                        .eq('id', msg.id);
                    } else {
                      console.log(`      ⚠️ Message requires human review but filtered for auto-send: ${filterResult.reason}`);
                    }
                    console.log(`      ✍️ Still generating draft for human review...`);
                    // Continue to draft generation below
                  } else {
                    skippedByFilter++;
                    console.log(`      ⏭️ SKIPPED: ${msg.subject?.substring(0, 30) || 'No subject'}`);
                    console.log(`         Reason: ${filterResult.reason}`);
                    
                    // Log to auto_send_log for transparency
                    await supabase.from('auto_send_log').insert({
                      workspace_id: connection.workspace_id,
                      message_id: msg.id,
                      action: 'skipped',
                      skip_reason: filterResult.reason,
                      details: filterResult.details as any,
                    });
                    
                    continue;
                  }
                }
                
                // Generate draft (for both eligible messages and messages requiring human review)
                // Also generate for thread limit reached messages (they need human review)
                if (filterResult.eligible || msg.requires_human_review || isThreadLimitReached) {
                  console.log(`      ✍️ Generating draft for: ${msg.subject?.substring(0, 40) || 'No subject'}...`);
                  
                  const draftResult = await generateReplyDraft(
                    msg.id,
                    connection.workspace_id,
                    {
                      useAdminClient: true,
                      // Feature check already done above - plan has aiDrafts enabled
                    }
                  );
                  
                  if (draftResult.body && !draftResult.error) {
                    draftsGenerated++;
                    // Track AI draft usage
                    await incrementUsage(connection.workspace_id, 'ai_drafts', 1);
                    console.log(`         ✅ Draft generated (confidence: ${draftResult.confidenceScore})`);
                  } else if (draftResult.error) {
                    console.log(`         ⚠️ Draft error: ${draftResult.error}`);
                  }
                }
              } catch (draftErr) {
                console.error(`         ❌ Failed to generate draft:`, draftErr instanceof Error ? draftErr.message : draftErr);
              }
            }
            
            console.log(`   📊 Generated ${draftsGenerated}/${actionableMessages.length} drafts (${skippedByFilter} skipped by filters)`);
          } else {
            console.log(`      ℹ️ No actionable messages without drafts found`);
          }
        } catch (draftError) {
          console.error(`   ❌ Draft generation error:`, draftError);
        }
        } // End of hasAIDraftsFeature check
        
        results.push({
          connectionId: connection.id,
          provider: connection.provider,
          account: connection.provider_account_name,
          success: true,
          syncedCount: syncResult?.syncedCount || 0,
          newCount: syncResult?.newCount || 0,
          classifiedCount,
          draftsGenerated,
        });

        // Update last sync time
        await supabase
          .from('channel_connections')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Sync failed: ${errorMsg}`);
        totalErrors++;
        
        results.push({
          connectionId: connection.id,
          provider: connection.provider,
          account: connection.provider_account_name,
          success: false,
          error: errorMsg,
        });
      }
    }

    const duration = Date.now() - startTime;
    const totalClassified = results.reduce((sum, r) => sum + (r.classifiedCount || 0), 0);
    const totalDraftsGenerated = results.reduce((sum, r) => sum + (r.draftsGenerated || 0), 0);
    
    console.log(`\n🏁 Sync cron completed in ${duration}ms`);
    console.log(`   Connections synced: ${totalSynced}/${connections.length}`);
    console.log(`   New messages: ${totalNewMessages}`);
    console.log(`   Messages classified: ${totalClassified}`);
    console.log(`   Drafts generated: ${totalDraftsGenerated}`);
    console.log(`   Errors: ${totalErrors}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tier,
      duration,
      totalConnections: connections.length,
      connectionsSynced: totalSynced,
      totalNewMessages,
      totalClassified,
      totalDraftsGenerated,
      totalErrors,
      results,
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
