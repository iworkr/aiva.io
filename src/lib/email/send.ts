/**
 * Email Sending Functions for Gmail and Outlook
 * Used for auto-send replies and manual send functionality
 */

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { refreshGmailToken } from '@/lib/gmail/client';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailReplyOptions {
  connectionId: string;
  originalMessageId: string;  // The ID of the message we're replying to
  threadId: string;           // Thread ID for threading
  to: string[];               // Recipients
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;               // HTML body
  plainTextBody?: string;     // Plain text fallback
  inReplyTo?: string;         // Message-ID header for threading
  references?: string;        // References header for threading
}

/**
 * Get connection credentials with token refresh if needed
 */
async function getConnectionCredentials(connectionId: string): Promise<{
  provider: string;
  accessToken: string;
  email: string;
} | null> {
  const supabase = supabaseAdminClient;

  const { data: connection, error } = await supabase
    .from('channel_connections')
    .select('provider, access_token, refresh_token, token_expires_at, provider_account_name, metadata')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    console.error('Failed to get connection:', error);
    return null;
  }

  let accessToken = connection.access_token;

  // Check if token needs refresh (Gmail)
  if (connection.provider === 'gmail' && connection.refresh_token) {
    const expiresAt = connection.token_expires_at;
    if (expiresAt && Date.now() >= (new Date(expiresAt).getTime() - 60000)) {
      // Token expired or expires in less than 1 minute, refresh it
      try {
        // refreshGmailToken updates the database directly and returns the new access token
        accessToken = await refreshGmailToken(connectionId, connection.refresh_token);
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return null;
      }
    }
  }

  // Get email from provider_account_name or metadata
  const metadata = connection.metadata as Record<string, any> | null;
  const email = connection.provider_account_name || metadata?.email || '';

  return {
    provider: connection.provider,
    accessToken,
    email,
  };
}

/**
 * Send reply via Gmail API
 */
export async function sendGmailReply(options: EmailReplyOptions): Promise<SendEmailResult> {
  const creds = await getConnectionCredentials(options.connectionId);
  if (!creds || creds.provider !== 'gmail') {
    return { success: false, error: 'Invalid Gmail connection' };
  }

  try {
    // Build MIME message
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mimeMessage = buildMimeMessage({
      from: creds.email,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      htmlBody: options.body,
      textBody: options.plainTextBody || stripHtml(options.body),
      inReplyTo: options.inReplyTo,
      references: options.references,
      boundary,
    });

    // Base64 URL encode the message
    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedMessage,
          threadId: options.threadId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gmail send error:', errorData);
      return { 
        success: false, 
        error: `Gmail API error: ${response.status} ${errorData?.error?.message || response.statusText}` 
      };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Gmail send exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send reply via Microsoft Graph API (Outlook)
 */
export async function sendOutlookReply(options: EmailReplyOptions): Promise<SendEmailResult> {
  const creds = await getConnectionCredentials(options.connectionId);
  if (!creds || creds.provider !== 'outlook') {
    return { success: false, error: 'Invalid Outlook connection' };
  }

  try {
    // First, create a reply draft to the original message
    // Then send it with our custom body
    const replyBody = {
      message: {
        subject: options.subject,
        body: {
          contentType: 'HTML',
          content: options.body,
        },
        toRecipients: options.to.map(email => ({
          emailAddress: { address: email }
        })),
        ccRecipients: options.cc?.map(email => ({
          emailAddress: { address: email }
        })) || [],
        bccRecipients: options.bcc?.map(email => ({
          emailAddress: { address: email }
        })) || [],
      },
      saveToSentItems: true,
    };

    // Use reply endpoint for threading
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${options.originalMessageId}/reply`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyBody),
      }
    );

    if (!response.ok && response.status !== 202) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Outlook send error:', errorData);
      return { 
        success: false, 
        error: `Graph API error: ${response.status} ${errorData?.error?.message || response.statusText}` 
      };
    }

    // Microsoft Graph reply endpoint returns 202 Accepted with no body
    // We won't get the message ID back directly
    return { success: true };
  } catch (error) {
    console.error('Outlook send exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Alternative Outlook send - create message and send (for more control)
 */
export async function sendOutlookMessage(options: {
  connectionId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  conversationId?: string;
}): Promise<SendEmailResult> {
  const creds = await getConnectionCredentials(options.connectionId);
  if (!creds || creds.provider !== 'outlook') {
    return { success: false, error: 'Invalid Outlook connection' };
  }

  try {
    const messagePayload = {
      subject: options.subject,
      body: {
        contentType: 'HTML',
        content: options.body,
      },
      toRecipients: options.to.map(email => ({
        emailAddress: { address: email }
      })),
      ccRecipients: options.cc?.map(email => ({
        emailAddress: { address: email }
      })) || [],
      bccRecipients: options.bcc?.map(email => ({
        emailAddress: { address: email }
      })) || [],
    };

    // Create draft
    const draftResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!draftResponse.ok) {
      const errorData = await draftResponse.json().catch(() => ({}));
      return { 
        success: false, 
        error: `Failed to create draft: ${errorData?.error?.message || draftResponse.statusText}` 
      };
    }

    const draft = await draftResponse.json();

    // Send the draft
    const sendResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${draft.id}/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!sendResponse.ok && sendResponse.status !== 202) {
      const errorData = await sendResponse.json().catch(() => ({}));
      return { 
        success: false, 
        error: `Failed to send: ${errorData?.error?.message || sendResponse.statusText}` 
      };
    }

    return { success: true, messageId: draft.id };
  } catch (error) {
    console.error('Outlook send exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Build MIME message for Gmail
 */
function buildMimeMessage(options: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  inReplyTo?: string;
  references?: string;
  boundary: string;
}): string {
  const lines: string[] = [];

  // Headers
  lines.push(`From: ${options.from}`);
  lines.push(`To: ${options.to.join(', ')}`);
  if (options.cc?.length) {
    lines.push(`Cc: ${options.cc.join(', ')}`);
  }
  if (options.bcc?.length) {
    lines.push(`Bcc: ${options.bcc.join(', ')}`);
  }
  lines.push(`Subject: ${options.subject}`);
  lines.push('MIME-Version: 1.0');
  
  // Threading headers
  if (options.inReplyTo) {
    lines.push(`In-Reply-To: ${options.inReplyTo}`);
  }
  if (options.references) {
    lines.push(`References: ${options.references}`);
  }

  lines.push(`Content-Type: multipart/alternative; boundary="${options.boundary}"`);
  lines.push('');

  // Plain text part
  lines.push(`--${options.boundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(options.textBody);
  lines.push('');

  // HTML part
  lines.push(`--${options.boundary}`);
  lines.push('Content-Type: text/html; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(options.htmlBody);
  lines.push('');

  lines.push(`--${options.boundary}--`);

  return lines.join('\r\n');
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Universal send function that routes to the appropriate provider
 */
export async function sendReply(
  options: EmailReplyOptions
): Promise<SendEmailResult> {
  const creds = await getConnectionCredentials(options.connectionId);
  if (!creds) {
    return { success: false, error: 'Connection not found or invalid' };
  }

  switch (creds.provider) {
    case 'gmail':
      return sendGmailReply(options);
    case 'outlook':
      return sendOutlookReply(options);
    default:
      return { success: false, error: `Unsupported provider: ${creds.provider}` };
  }
}

