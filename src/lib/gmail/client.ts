/**
 * Gmail API Client
 * Utilities for interacting with Gmail API
 */

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { htmlToPlainText, decodeHtmlEntities } from '@/utils/html-to-text';

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: any[];
    }>;
  };
  internalDate: string;
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/**
 * Refresh Gmail OAuth token if needed
 */
export async function refreshGmailToken(
  connectionId: string,
  refreshToken: string
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const response = await fetch('https://oauth2.googleapis.com/token', {
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
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Gmail token');
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
      token_expires_at: tokenExpiresAt,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);

  return newAccessToken;
}

/**
 * Get Gmail access token (refresh if needed)
 */
export async function getGmailAccessToken(connectionId: string): Promise<string> {
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
      return await refreshGmailToken(connectionId, connection.refresh_token);
    }
  }

  return connection.access_token;
}

/**
 * List Gmail messages
 */
export async function listGmailMessages(
  accessToken: string,
  options: {
    maxResults?: number;
    pageToken?: string;
    q?: string; // Gmail query string
    labelIds?: string[];
  } = {}
): Promise<GmailListResponse> {
  const params = new URLSearchParams({
    maxResults: String(options.maxResults || 100),
  });

  if (options.pageToken) params.append('pageToken', options.pageToken);
  if (options.q) params.append('q', options.q);
  if (options.labelIds) {
    options.labelIds.forEach((id) => params.append('labelIds', id));
  }

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get single Gmail message
 */
export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Parse Gmail message to normalized format
 */
export function parseGmailMessage(gmailMessage: GmailMessage) {
  const headers = gmailMessage.payload.headers;
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  // Extract email body
  let body = '';
  let bodyHtml = '';

  const extractBody = (part: any): void => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
      // Check if plain text actually contains HTML tags
      if (/<[^>]+>/g.test(decoded)) {
        // Plain text part contains HTML - treat as HTML
        bodyHtml = decoded;
      } else {
        body = decoded;
      }
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      part.parts.forEach((p: any) => extractBody(p));
    }
  };

  if (gmailMessage.payload.body?.data) {
    const decoded = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf-8');
    // Check if it contains HTML tags
    if (/<[^>]+>/g.test(decoded)) {
      bodyHtml = decoded;
    } else {
      body = decoded;
    }
  } else if (gmailMessage.payload.parts) {
    gmailMessage.payload.parts.forEach(extractBody);
  }

  // Convert HTML to plain text if we have HTML
  if (bodyHtml) {
    body = htmlToPlainText(bodyHtml);
  }

  // Decode HTML entities in body text (even if it's plain text, it might contain entities)
  if (body) {
    body = decodeHtmlEntities(body);
  }

  // If still no body, use snippet
  if (!body) {
    body = gmailMessage.snippet || '';
  }

  // Parse recipients
  const parseRecipients = (headerValue: string, type: 'to' | 'cc' | 'bcc') => {
    if (!headerValue) return [];
    return headerValue.split(',').map((recipient) => {
      const match = recipient.match(/(.+?)\s*<(.+)>/);
      if (match) {
        return { email: match[2].trim(), name: match[1].trim(), type };
      }
      return { email: recipient.trim(), name: recipient.trim(), type };
    });
  };

  const toRecipients = parseRecipients(getHeader('To'), 'to');
  const ccRecipients = parseRecipients(getHeader('Cc'), 'cc');
  const bccRecipients = parseRecipients(getHeader('Bcc'), 'bcc');
  const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients];

  // Parse sender
  const fromHeader = getHeader('From');
  const senderMatch = fromHeader.match(/(.+?)\s*<(.+)>/);
  const senderEmail = senderMatch ? senderMatch[2].trim() : fromHeader;
  const senderName = senderMatch ? senderMatch[1].trim() : fromHeader;

  // Create clean snippet from the converted body (remove any HTML that might be in snippet)
  const cleanSnippet = body.trim().substring(0, 200).replace(/\s+/g, ' ').trim() || gmailMessage.snippet || '';

  return {
    providerMessageId: gmailMessage.id,
    providerThreadId: gmailMessage.threadId,
    subject: getHeader('Subject'),
    body: body.trim(),
    bodyHtml: undefined, // Don't store HTML - we've converted it to plain text
    snippet: cleanSnippet,
    senderEmail,
    senderName,
    recipients,
    timestamp: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
    labels: gmailMessage.labelIds || [],
    rawData: gmailMessage,
  };
}

/**
 * Send Gmail message
 */
export async function sendGmailMessage(
  accessToken: string,
  options: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    inReplyTo?: string;
    references?: string[];
  }
): Promise<{ id: string }> {
  // Build RFC 2822 formatted message
  const messageParts = [
    `To: ${options.to.join(', ')}`,
    options.cc ? `Cc: ${options.cc.join(', ')}` : '',
    options.bcc ? `Bcc: ${options.bcc.join(', ')}` : '',
    `Subject: ${options.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
    options.references ? `References: ${options.references.join(' ')}` : '',
    '',
    options.body,
  ]
    .filter(Boolean)
    .join('\r\n');

  const encodedMessage = Buffer.from(messageParts)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to send Gmail message: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Modify Gmail message labels
 */
export async function modifyGmailMessage(
  accessToken: string,
  messageId: string,
  options: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
  }
): Promise<void> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to modify Gmail message: ${response.statusText}`);
  }
}

/**
 * Mark Gmail message as read
 */
export async function markGmailAsRead(
  accessToken: string,
  messageId: string
): Promise<void> {
  await modifyGmailMessage(accessToken, messageId, {
    removeLabelIds: ['UNREAD'],
  });
}

/**
 * Get Gmail user profile
 */
export async function getGmailProfile(accessToken: string) {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/profile',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  return await response.json();
}

// ============================================================================
// ATTACHMENT FUNCTIONS
// ============================================================================

export interface GmailAttachment {
  attachmentId: string;
  messageId: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * List attachments from a Gmail message
 */
export function getGmailMessageAttachments(gmailMessage: GmailMessage): GmailAttachment[] {
  const attachments: GmailAttachment[] = [];

  const extractAttachments = (parts: any[], messageId: string) => {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          messageId,
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
        });
      }
      if (part.parts) {
        extractAttachments(part.parts, messageId);
      }
    }
  };

  if (gmailMessage.payload?.parts) {
    extractAttachments(gmailMessage.payload.parts, gmailMessage.id);
  }

  return attachments;
}

/**
 * Get attachment content from Gmail
 */
export async function getGmailAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<{ data: string; size: number }> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    data: data.data, // Base64 encoded
    size: data.size,
  };
}

/**
 * Get attachment as Buffer (decoded)
 */
export async function getGmailAttachmentBuffer(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const { data } = await getGmailAttachment(accessToken, messageId, attachmentId);
  // Gmail uses URL-safe base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

/**
 * Extract text content from attachment for preview/search
 * (Simple extraction - for production use a dedicated library)
 */
export function extractTextFromAttachment(
  buffer: Buffer,
  mimeType: string
): string | null {
  // Only handle text-based files
  if (mimeType.startsWith('text/')) {
    return buffer.toString('utf-8').substring(0, 500);
  }
  
  // For other types, return null (would need dedicated parsers for PDF, docx, etc.)
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

