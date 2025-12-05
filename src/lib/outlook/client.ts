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

import { htmlToPlainText, decodeHtmlEntities } from '@/utils/html-to-text';

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
  const contentType = outlookMessage.body?.contentType || '';
  
  // Check if body contains HTML tags (regardless of contentType)
  const hasHtmlTags = /<[^>]+>/g.test(body);
  const isHtmlContent = contentType === 'html' || hasHtmlTags;

  // Always convert HTML to plain text if it contains HTML tags or is marked as HTML
  let plainTextBody: string;
  if (isHtmlContent) {
    // Body contains HTML - convert it
    plainTextBody = htmlToPlainText(body);
  } else if (contentType === 'text') {
    // Plain text - but still decode entities and check for any stray tags
    plainTextBody = body.replace(/<[^>]*>/g, ''); // Remove any stray tags
    plainTextBody = decodeHtmlEntities(plainTextBody);
  } else {
    // Unknown content type - check for HTML and convert if found
    if (hasHtmlTags) {
      plainTextBody = htmlToPlainText(body);
    } else {
      plainTextBody = body.replace(/<[^>]*>/g, '');
      plainTextBody = decodeHtmlEntities(plainTextBody);
    }
  }

  // Final decode of HTML entities (in case any were missed)
  plainTextBody = decodeHtmlEntities(plainTextBody);

  // Create clean snippet from the converted plain text
  const cleanSnippet = plainTextBody.substring(0, 200).replace(/\s+/g, ' ').trim();

  // Store original HTML body if content was HTML
  const htmlBody = isHtmlContent ? body : undefined;

  return {
    providerMessageId: outlookMessage.id,
    providerThreadId: outlookMessage.conversationId,
    subject: outlookMessage.subject || '(no subject)',
    body: plainTextBody,
    bodyHtml: htmlBody, // Store HTML for proper email rendering
    snippet: cleanSnippet,
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

// ============================================================================
// ATTACHMENT FUNCTIONS
// ============================================================================

export interface OutlookAttachment {
  id: string;
  messageId: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

/**
 * List attachments from an Outlook message
 */
export async function listOutlookAttachments(
  accessToken: string,
  messageId: string
): Promise<OutlookAttachment[]> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Outlook API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return (data.value || []).map((att: any) => ({
    id: att.id,
    messageId,
    name: att.name,
    contentType: att.contentType || 'application/octet-stream',
    size: att.size || 0,
    isInline: att.isInline || false,
  }));
}

/**
 * Get attachment content from Outlook
 */
export async function getOutlookAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<{ contentBytes: string; contentType: string; name: string; size: number }> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${attachmentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Outlook API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    contentBytes: data.contentBytes, // Base64 encoded
    contentType: data.contentType,
    name: data.name,
    size: data.size,
  };
}

/**
 * Get attachment as Buffer (decoded)
 */
export async function getOutlookAttachmentBuffer(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const { contentBytes } = await getOutlookAttachment(accessToken, messageId, attachmentId);
  return Buffer.from(contentBytes, 'base64');
}

/**
 * Extract text content from attachment for preview/search
 */
export function extractTextFromAttachment(
  buffer: Buffer,
  contentType: string
): string | null {
  // Only handle text-based files
  if (contentType.startsWith('text/')) {
    return buffer.toString('utf-8').substring(0, 500);
  }
  
  // For other types, return null
  return null;
}

/**
 * Determine content type category from mime type
 */
export function getContentTypeFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'application/msword': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
    'application/vnd.ms-excel': 'spreadsheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
    'application/vnd.ms-powerpoint': 'presentation',
    'text/plain': 'document',
    'text/csv': 'spreadsheet',
  };

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'document';
  
  return mimeMap[mimeType] || 'other';
}

