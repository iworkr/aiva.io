/**
 * Notification Triggers
 * Functions to create and send notifications for various events
 */

'use server';

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { sendEmail } from '@/utils/api-routes/utils';

export type NotificationType = 
  | 'review_needed'
  | 'high_priority'
  | 'auto_reply_sent'
  | 'daily_digest';

interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Create a notification record in the database
 */
async function createNotification(
  userId: string,
  workspaceId: string,
  notification: NotificationData
): Promise<string | null> {
  const { data, error } = await supabaseAdminClient
    .from('aiva_notifications')
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Notifications] Failed to create notification:', error);
    return null;
  }

  return data.id;
}

/**
 * Get notification settings for a workspace
 */
async function getNotificationSettings(workspaceId: string) {
  const { data } = await supabaseAdminClient
    .from('workspace_settings')
    .select('push_notifications_enabled, notify_on_high_priority, notify_on_review_needed, daily_digest_enabled, notification_email_addresses, workspace_settings')
    .eq('workspace_id', workspaceId)
    .single();

  const workspaceSettings = (data?.workspace_settings as any) || {};
  const notifications = workspaceSettings.notifications || {};

  return {
    pushEnabled: data?.push_notifications_enabled ?? true,
    notifyHighPriority: data?.notify_on_high_priority ?? true,
    notifyReviewNeeded: data?.notify_on_review_needed ?? true,
    dailyDigestEnabled: data?.daily_digest_enabled ?? true,
    emailNotifications: notifications.email ?? true,
    notificationEmailAddresses: data?.notification_email_addresses || null,
  };
}

/**
 * Get all workspace members (for sending notifications to all users)
 */
async function getWorkspaceMembers(workspaceId: string): Promise<string[]> {
  const { data } = await supabaseAdminClient
    .from('workspace_members')
    .select('workspace_member_id')
    .eq('workspace_id', workspaceId);

  return (data || []).map(m => m.workspace_member_id);
}

/**
 * Notify when a message needs human review
 */
export async function notifyReviewNeeded(
  workspaceId: string,
  messageId: string,
  subject: string,
  senderName: string,
  reviewReason: string
): Promise<void> {
  const settings = await getNotificationSettings(workspaceId);
  
  if (!settings.notifyReviewNeeded) {
    return;
  }

  const members = await getWorkspaceMembers(workspaceId);

  // Get user emails for email notifications
  const { data: users } = await supabaseAdminClient
    .from('user_application_settings')
    .select('id, email_readonly, user_profiles(full_name)')
    .in('id', members);

  const userEmails = new Map<string, string>();
  (users || []).forEach(u => {
    if (u.email_readonly) userEmails.set(u.id, u.email_readonly);
  });

  // Get email addresses to notify (from settings or use user emails)
  const emailAddresses = settings.notificationEmailAddresses && settings.notificationEmailAddresses.length > 0
    ? settings.notificationEmailAddresses
    : Array.from(userEmails.values());

  for (const userId of members) {
    await createNotification(userId, workspaceId, {
      type: 'review_needed',
      title: 'Message needs your review',
      body: `"${subject}" from ${senderName} - ${reviewReason}`,
      data: {
        messageId,
        subject,
        senderName,
        reviewReason,
      },
    });
  }

  // Send email notifications if enabled
  if (settings.emailNotifications && emailAddresses.length > 0) {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.aiva.io'}/dashboard`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">Message Needs Your Review</h2>
        <p style="color: #52525b; line-height: 1.6;">
          <strong>Subject:</strong> "${subject}"<br>
          <strong>From:</strong> ${senderName}<br>
          <strong>Reason:</strong> ${reviewReason}
        </p>
        <a href="${dashboardUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Review in Aiva
        </a>
      </div>
    `;

    // Send to all configured email addresses
    for (const email of emailAddresses) {
      try {
        await sendEmail({
          to: email,
          from: process.env.ADMIN_EMAIL || 'notifications@aiva.io',
          subject: `Review needed: "${subject}"`,
          html: emailHtml,
        });
      } catch (error) {
        console.error(`[Notifications] Failed to send email to ${email}:`, error);
      }
    }
  }
}

/**
 * Notify when a high-priority message arrives
 */
export async function notifyHighPriority(
  workspaceId: string,
  messageId: string,
  subject: string,
  senderName: string,
  priority: string
): Promise<void> {
  const settings = await getNotificationSettings(workspaceId);
  
  if (!settings.notifyHighPriority) {
    return;
  }

  const members = await getWorkspaceMembers(workspaceId);

  // Get user emails for email notifications
  const { data: users } = await supabaseAdminClient
    .from('user_application_settings')
    .select('id, email_readonly, user_profiles(full_name)')
    .in('id', members);

  const userEmails = new Map<string, string>();
  (users || []).forEach(u => {
    if (u.email_readonly) userEmails.set(u.id, u.email_readonly);
  });

  // Get email addresses to notify (from settings or use user emails)
  const emailAddresses = settings.notificationEmailAddresses && settings.notificationEmailAddresses.length > 0
    ? settings.notificationEmailAddresses
    : Array.from(userEmails.values());

  for (const userId of members) {
    await createNotification(userId, workspaceId, {
      type: 'high_priority',
      title: `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Message`,
      body: `"${subject}" from ${senderName}`,
      data: {
        messageId,
        subject,
        senderName,
        priority,
      },
    });
  }

  // Send email notifications if enabled
  if (settings.emailNotifications && emailAddresses.length > 0) {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.aiva.io'}/dashboard`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Message</h2>
        <p style="color: #52525b; line-height: 1.6;">
          <strong>Subject:</strong> "${subject}"<br>
          <strong>From:</strong> ${senderName}
        </p>
        <a href="${dashboardUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View in Aiva
        </a>
      </div>
    `;

    // Send to all configured email addresses
    for (const email of emailAddresses) {
      try {
        await sendEmail({
          to: email,
          from: process.env.ADMIN_EMAIL || 'notifications@aiva.io',
          subject: `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority: "${subject}"`,
          html: emailHtml,
        });
      } catch (error) {
        console.error(`[Notifications] Failed to send email to ${email}:`, error);
      }
    }
  }
}

/**
 * Notify when an auto-reply is sent
 */
export async function notifyAutoReplySent(
  workspaceId: string,
  messageId: string,
  subject: string,
  recipientEmail: string
): Promise<void> {
  const members = await getWorkspaceMembers(workspaceId);

  for (const userId of members) {
    await createNotification(userId, workspaceId, {
      type: 'auto_reply_sent',
      title: 'Auto-reply sent',
      body: `Replied to "${subject}" for ${recipientEmail}`,
      data: {
        messageId,
        subject,
        recipientEmail,
      },
    });
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(
  userId: string,
  limit: number = 20
) {
  const { data, error } = await supabaseAdminClient
    .from('aiva_notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Notifications] Failed to get notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(
  userId: string,
  notificationIds?: string[]
): Promise<boolean> {
  let query = supabaseAdminClient
    .from('aiva_notifications')
    .update({ read: true })
    .eq('user_id', userId);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in('id', notificationIds);
  }

  const { error } = await query;

  if (error) {
    console.error('[Notifications] Failed to mark as read:', error);
    return false;
  }

  return true;
}

/**
 * Get notification count for badge display
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdminClient
    .from('aiva_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('[Notifications] Failed to get count:', error);
    return 0;
  }

  return count || 0;
}

