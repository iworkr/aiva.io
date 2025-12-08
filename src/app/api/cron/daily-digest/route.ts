/**
 * Daily Digest Cron Job
 * Sends daily summary emails to users with their Aiva activity
 * Runs at the configured time for each workspace's timezone
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { Resend } from 'resend';

const CRON_SECRET = process.env.CRON_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

export const runtime = 'nodejs';
export const maxDuration = 60;

interface WorkspaceDigestData {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  userEmail: string;
  userName: string;
  messagesHandled: number;
  autoReplies: number;
  reviewQueue: number;
  highPriority: number;
  timeSavedMinutes: number;
}

async function getWorkspacesForDigest(): Promise<WorkspaceDigestData[]> {
  const supabase = supabaseAdminClient;
  const currentHour = new Date().getHours();
  const timeString = `${currentHour.toString().padStart(2, '0')}:00`;

  // Get workspaces where daily digest is enabled and it's the right time
  const { data: settings } = await supabase
    .from('workspace_settings')
    .select(`
      workspace_id,
      daily_digest_time,
      workspaces (
        title
      )
    `)
    .eq('daily_digest_enabled', true)
    .gte('daily_digest_time', `${currentHour.toString().padStart(2, '0')}:00`)
    .lt('daily_digest_time', `${(currentHour + 1).toString().padStart(2, '0')}:00`);

  if (!settings || settings.length === 0) {
    return [];
  }

  const results: WorkspaceDigestData[] = [];

  for (const setting of settings) {
    const workspaceId = setting.workspace_id;
    const workspaceName = (setting.workspaces as any)?.title || 'Your Workspace';

    // Get workspace members
    const { data: members } = await supabase
      .from('workspace_members')
      .select(`
        workspace_member_id,
        user:user_profiles(id, email, full_name)
      `)
      .eq('workspace_id', workspaceId);

    if (!members) continue;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      { count: messagesHandled },
      { count: autoReplies },
      { count: reviewQueue },
      { count: highPriority },
    ] = await Promise.all([
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('handled_by_aiva', true)
        .gte('handled_at', todayISO),
      supabase
        .from('auto_send_log')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('action', 'sent')
        .gte('created_at', todayISO),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('requires_human_review', true)
        .is('reviewed_at', null),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('handled_by_aiva', false)
        .in('priority', ['urgent', 'high']),
    ]);

    for (const member of members) {
      const user = member.user as any;
      if (!user?.email) continue;

      results.push({
        workspaceId,
        workspaceName,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name?.split(' ')[0] || 'there',
        messagesHandled: messagesHandled || 0,
        autoReplies: autoReplies || 0,
        reviewQueue: reviewQueue || 0,
        highPriority: highPriority || 0,
        timeSavedMinutes: (messagesHandled || 0) * 2,
      });
    }
  }

  return results;
}

function generateDigestEmail(data: WorkspaceDigestData): { subject: string; html: string } {
  const subject = data.reviewQueue > 0
    ? `📬 ${data.reviewQueue} item${data.reviewQueue > 1 ? 's' : ''} need your attention - Daily Digest`
    : `✅ All caught up! - Daily Digest`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aiva Daily Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Aiva Daily Digest</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h2 style="margin: 0; color: #18181b; font-size: 22px; font-weight: 600;">
                Good evening, ${data.userName}! 👋
              </h2>
              <p style="margin: 12px 0 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Here's your daily summary for <strong>${data.workspaceName}</strong>
              </p>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 8px;">
                    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="font-size: 32px; font-weight: 700; color: #16a34a;">${data.messagesHandled}</div>
                      <div style="font-size: 14px; color: #15803d; margin-top: 4px;">Messages Handled</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 8px;">
                    <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="font-size: 32px; font-weight: 700; color: #d97706;">${data.autoReplies}</div>
                      <div style="font-size: 14px; color: #b45309; margin-top: 4px;">Auto-Replies Sent</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 8px;">
                    <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="font-size: 32px; font-weight: 700; color: #2563eb;">${data.timeSavedMinutes}m</div>
                      <div style="font-size: 14px; color: #1d4ed8; margin-top: 4px;">Time Saved</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 8px;">
                    <div style="background-color: ${data.reviewQueue > 0 ? '#fef2f2' : '#f0fdf4'}; border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="font-size: 32px; font-weight: 700; color: ${data.reviewQueue > 0 ? '#dc2626' : '#16a34a'};">${data.reviewQueue}</div>
                      <div style="font-size: 14px; color: ${data.reviewQueue > 0 ? '#b91c1c' : '#15803d'}; margin-top: 4px;">Need Review</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${data.reviewQueue > 0 || data.highPriority > 0 ? `
          <!-- Action Required -->
          <tr>
            <td style="padding: 16px 32px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px;">
                <h3 style="margin: 0 0 8px; color: #92400e; font-size: 16px; font-weight: 600;">
                  ⚠️ Action Required
                </h3>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                  ${data.reviewQueue > 0 ? `${data.reviewQueue} message${data.reviewQueue > 1 ? 's' : ''} need${data.reviewQueue === 1 ? 's' : ''} your review. ` : ''}
                  ${data.highPriority > 0 ? `${data.highPriority} high-priority item${data.highPriority > 1 ? 's' : ''} waiting.` : ''}
                </p>
              </div>
            </td>
          </tr>
          ` : `
          <!-- All Good -->
          <tr>
            <td style="padding: 16px 32px;">
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px; padding: 16px;">
                <h3 style="margin: 0 0 8px; color: #15803d; font-size: 16px; font-weight: 600;">
                  ✨ Inbox Zero!
                </h3>
                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                  Amazing! You have no messages that need your attention. Aiva handled everything.
                </p>
              </div>
            </td>
          </tr>
          `}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 24px 32px 32px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Open Aiva Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 14px;">
                Powered by <strong>Aiva.io</strong> - Your AI Email Assistant
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #a1a1aa;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

export async function GET(request: NextRequest) {
  console.log('📧 Daily digest cron job started');

  // Verify cron authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.log('❌ Unauthorized daily digest cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const digestData = await getWorkspacesForDigest();
    console.log(`📊 Found ${digestData.length} users for daily digest`);

    for (const data of digestData) {
      try {
        results.processed++;

        const { subject, html } = generateDigestEmail(data);

        // Send email via Resend
        const emailResult = await resend.emails.send({
          from: 'Aiva <digest@aiva.io>',
          to: data.userEmail,
          subject,
          html,
        });

        if (emailResult.error) {
          console.error(`❌ Failed to send digest to ${data.userEmail}:`, emailResult.error);
          results.failed++;
          results.errors.push(`${data.userEmail}: ${emailResult.error.message}`);
          continue;
        }

        // Log the notification
        await supabaseAdminClient.from('aiva_notifications').insert({
          user_id: data.userId,
          workspace_id: data.workspaceId,
          type: 'daily_digest',
          title: 'Daily Digest Sent',
          body: `Your daily digest for ${new Date().toLocaleDateString()} was sent.`,
          sent_email: true,
        });

        console.log(`✅ Sent digest to ${data.userEmail}`);
        results.sent++;
      } catch (error) {
        console.error(`❌ Error processing digest for ${data.userEmail}:`, error);
        results.failed++;
        results.errors.push(`${data.userEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`📧 Daily digest completed: ${results.sent} sent, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('❌ Daily digest cron error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

