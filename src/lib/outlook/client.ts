/**
 * Outlook/Microsoft Graph API Client
 * Utilities for interacting with Microsoft Graph API for emails
 */

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';

/**
 * Refresh Outlook OAuth token
 */
export async function refreshOutlookToken(
  connectionId: string,
  refreshToken: string
): Promise<string> {
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;

  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to refresh Outlook token');
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const expiresIn = data.expires_in;
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Update token in database
  const supabase = await createSupabaseUserServerActionClient();
  await supabase
    .from('channel_connections')
    .update({
      access_token: newAccessToken,
      refresh_token: data.refresh_token || refreshToken,
      token_expires_at: tokenExpiresAt,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);

  return newAccessToken;
}

/**
 * Get Outlook access token (refresh if needed)
 */
export async function getOutlookAccessToken(connectionId: string): Promise<string> {
  const supabase = await createSupabaseUserServerActionClient();

  const { data: connection, error } = await supabase
    .from('channel_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('Channel connection not found');
  }

  // Check if token needs refresh
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow && connection.refresh_token) {
      return await refreshOutlookToken(connectionId, connection.refresh_token);
    }
  }

  return connection.access_token;
}

/**
 * List Outlook messages
 */
export async function listOutlookMessages(
  accessToken: string,
  options: {
    maxResults?: number;
    skipToken?: string;
    filter?: string;
  } = {}
) {
  const params = new URLSearchParams({
    $top: String(options.maxResults || 50),
    $select: 'id,subject,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,hasAttachments',
    $orderby: 'receivedDateTime desc',
  });

  if (options.skipToken) params.append('$skiptoken', options.skipToken);
  if (options.filter) params.append('$filter', options.filter);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Outlook API error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get single Outlook message
 */
export async function getOutlookMessage(
  accessToken: string,
  messageId: string
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Outlook API error: ${response.statusText}`);
  }

  return await response.json();
}

import { htmlToPlainText } from '@/utils/html-to-text';

/**
 * Parse Outlook message to normalized format
 */
export function parseOutlookMessage(outlookMessage: any) {
  // Parse recipients
  const parseRecipients = (recipients: any[], type: 'to' | 'cc' | 'bcc') => {
    if (!recipients) return [];
    return recipients.map((r) => ({
      email: r.emailAddress.address,
      name: r.emailAddress.name,
      type,
    }));
  };

  const toRecipients = parseRecipients(outlookMessage.toRecipients, 'to');
  const ccRecipients = parseRecipients(outlookMessage.ccRecipients, 'cc');
  const bccRecipients = parseRecipients(outlookMessage.bccRecipients, 'bcc');
  const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients];

  // Extract body
  const body = outlookMessage.body?.content || '';
  const bodyHtml = outlookMessage.body?.contentType === 'html' ? body : undefined;
  const bodyPlain = outlookMessage.body?.contentType === 'text' ? body : undefined;

  // Convert HTML to plain text if we only have HTML
  const plainTextBody = bodyPlain || (bodyHtml ? htmlToPlainText(bodyHtml) : body.replace(/<[^>]*>/g, ''));

  return {
    providerMessageId: outlookMessage.id,
    providerThreadId: outlookMessage.conversationId,
    subject: outlookMessage.subject || '(no subject)',
    body: plainTextBody,
    bodyHtml: undefined, // Don't store HTML - we've converted it to plain text
    snippet: body.substring(0, 200),
    senderEmail: outlookMessage.from?.emailAddress?.address || '',
    senderName: outlookMessage.from?.emailAddress?.name || '',
    recipients,
    timestamp: new Date(outlookMessage.receivedDateTime).toISOString(),
    labels: [],
    rawData: outlookMessage,
  };
}

/**
 * Send Outlook message
 */
export async function sendOutlookMessage(
  accessToken: string,
  options: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    inReplyTo?: string;
  }
) {
  const message = {
    subject: options.subject,
    body: {
      contentType: 'text',
      content: options.body,
    },
    toRecipients: options.to.map((email) => ({
      emailAddress: { address: email },
    })),
    ccRecipients: options.cc?.map((email) => ({
      emailAddress: { address: email },
    })),
    bccRecipients: options.bcc?.map((email) => ({
      emailAddress: { address: email },
    })),
  };

  const url = options.inReplyTo
    ? `https://graph.microsoft.com/v1.0/me/messages/${options.inReplyTo}/reply`
    : 'https://graph.microsoft.com/v1.0/me/sendMail';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options.inReplyTo ? { comment: options.body } : { message }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send Outlook message: ${response.statusText}`);
  }

  return options.inReplyTo ? { id: options.inReplyTo } : await response.json();
}

/**
 * Mark Outlook message as read
 */
export async function markOutlookAsRead(
  accessToken: string,
  messageId: string
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isRead: true }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to mark message as read: ${response.statusText}`);
  }
}

/**
 * Get Outlook user profile
 */
export async function getOutlookProfile(accessToken: string) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Outlook API error: ${response.statusText}`);
  }

  return await response.json();
}

