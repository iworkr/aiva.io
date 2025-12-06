/**
 * Cron Job: Automatic Message Sync
 * Runs periodically to sync all active channel connections
 * 
 * Simplified version - syncs ALL workspaces with active connections
 * regardless of plan tier for reliability
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { syncGmailMessages } from '@/lib/gmail/sync';
import { syncOutlookMessages } from '@/lib/outlook/sync';
import { classifyMessage } from '@/lib/ai/classifier';
import { generateReplyDraft } from '@/lib/ai/reply-generator';

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
      
      try {
        let syncResult: any;

        switch (connection.provider) {
          case 'gmail':
            console.log('   📧 Starting Gmail sync...');
            syncResult = await syncGmailMessages(connection.id, connection.workspace_id, {
              maxMessages: 20, // Reduced from 50 to avoid rate limiting
              useAdminClient: true, // Critical: use admin client for cron jobs
            });
            break;

          case 'outlook':
            console.log('   📧 Starting Outlook sync...');
            syncResult = await syncOutlookMessages(connection.id, connection.workspace_id, {
              maxMessages: 20, // Reduced from 50 to avoid rate limiting
              useAdminClient: true, // Critical: use admin client for cron jobs
            });
            break;

          default:
            console.log(`   ⏭️ Skipping ${connection.provider} - sync not implemented`);
            continue;
        }

        console.log(`   ✅ Sync complete: ${syncResult?.syncedCount || 0} messages (${syncResult?.newCount || 0} new)`);
        
        totalSynced++;
        totalNewMessages += syncResult?.newCount || 0;

        // Auto-classify unclassified messages in this workspace
        let classifiedCount = 0;
        let draftsGenerated = 0;
        
        // Check if workspace has auto-send enabled
        const { data: wsSettings } = await supabase
          .from('workspace_settings')
          .select('auto_send_enabled, auto_send_confidence_threshold')
          .eq('workspace_id', connection.workspace_id)
          .single();

        const autoSendEnabled = wsSettings?.auto_send_enabled ?? false;
        const confidenceThreshold = wsSettings?.auto_send_confidence_threshold ?? 0.70;

        try {
          const { data: unclassifiedMessages } = await supabase
            .from('messages')
            .select('id, subject')
            .eq('workspace_id', connection.workspace_id)
            .or('priority.is.null,category.is.null')
            .order('created_at', { ascending: false })
            .limit(50);

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
        } catch (classifyError) {
          console.error(`   ❌ Classification error:`, classifyError);
        }

        // ALWAYS generate drafts for actionable messages (drafts are useful regardless of auto-send)
        // Auto-send setting only controls whether drafts get QUEUED for automatic sending
        console.log(`   ✍️ Generating drafts for actionable messages (auto-send: ${autoSendEnabled ? 'enabled' : 'disabled'}, threshold: ${confidenceThreshold})...`);
        
        try {
          // Get messages that need drafts:
          // - Any actionability type that might need a response (excluding 'none')
          // - No existing draft
          // - Recent (last 24 hours)
          const { data: actionableMessages } = await supabase
            .from('messages')
            .select('id, subject, actionability, has_draft_reply')
            .eq('workspace_id', connection.workspace_id)
            .in('actionability', ['question', 'request', 'fyi', 'scheduling_intent', 'task']) // All types except 'none'
            .eq('has_draft_reply', false)
            .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: false })
            .limit(10); // Limit to avoid timeouts

          if (actionableMessages && actionableMessages.length > 0) {
            console.log(`      📝 Found ${actionableMessages.length} actionable messages without drafts`);
            
            for (const msg of actionableMessages) {
              try {
                console.log(`      ✍️ Generating draft for: ${msg.subject?.substring(0, 40) || 'No subject'}...`);
                
                const draftResult = await generateReplyDraft(
                  msg.id,
                  connection.workspace_id,
                  {
                    useAdminClient: true,
                    skipFeatureCheck: true,
                  }
                );
                
                if (draftResult.body && !draftResult.error) {
                  draftsGenerated++;
                  console.log(`         ✅ Draft generated (confidence: ${draftResult.confidenceScore})`);
                } else if (draftResult.error) {
                  console.log(`         ⚠️ Draft error: ${draftResult.error}`);
                }
              } catch (draftErr) {
                console.error(`         ❌ Failed to generate draft:`, draftErr instanceof Error ? draftErr.message : draftErr);
              }
            }
            
            console.log(`   📊 Generated ${draftsGenerated}/${actionableMessages.length} drafts`);
          } else {
            console.log(`      ℹ️ No actionable messages without drafts found`);
          }
        } catch (draftError) {
          console.error(`   ❌ Draft generation error:`, draftError);
        }
        
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
