/**
 * Gmail Actions API
 * Handle archive, label, and read operations for Gmail messages
 */

import { getGmailAccessToken } from './client';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const AIVA_LABEL_NAME = 'Handled by Aiva';

// Cache for Aiva label ID per connection
const labelIdCache = new Map<string, string>();

/**
 * Mark a Gmail message as read
 */
export async function markGmailMessageRead(
  accessToken: string,
  messageId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeLabelIds: ['UNREAD'],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Gmail Actions] Failed to mark as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Gmail Actions] Error marking as read:', error);
    return false;
  }
}

/**
 * Archive a Gmail message (remove INBOX label)
 */
export async function archiveGmailMessage(
  accessToken: string,
  messageId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeLabelIds: ['INBOX'],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Gmail Actions] Failed to archive:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Gmail Actions] Error archiving:', error);
    return false;
  }
}

/**
 * Apply a label to a Gmail message
 */
export async function applyGmailLabel(
  accessToken: string,
  messageId: string,
  labelId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: [labelId],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Gmail Actions] Failed to apply label:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Gmail Actions] Error applying label:', error);
    return false;
  }
}

/**
 * Get all labels from Gmail
 */
async function getGmailLabels(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await fetch(`${GMAIL_API_BASE}/labels`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get labels');
    }

    const data = await response.json();
    return data.labels || [];
  } catch (error) {
    console.error('[Gmail Actions] Error getting labels:', error);
    return [];
  }
}

/**
 * Create a Gmail label
 */
async function createGmailLabel(
  accessToken: string,
  labelName: string
): Promise<string | null> {
  try {
    const response = await fetch(`${GMAIL_API_BASE}/labels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
        color: {
          backgroundColor: '#16a765', // Green
          textColor: '#ffffff',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Gmail Actions] Failed to create label:', error);
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('[Gmail Actions] Error creating label:', error);
    return null;
  }
}

/**
 * Ensure the "Handled by Aiva" label exists and return its ID
 */
export async function ensureAivaLabel(
  accessToken: string,
  connectionId?: string
): Promise<string | null> {
  // Check cache first
  if (connectionId && labelIdCache.has(connectionId)) {
    return labelIdCache.get(connectionId)!;
  }

  try {
    // Get existing labels
    const labels = await getGmailLabels(accessToken);
    
    // Look for existing Aiva label
    const existingLabel = labels.find(
      (l) => l.name === AIVA_LABEL_NAME || l.name.toLowerCase() === AIVA_LABEL_NAME.toLowerCase()
    );

    if (existingLabel) {
      if (connectionId) {
        labelIdCache.set(connectionId, existingLabel.id);
      }
      return existingLabel.id;
    }

    // Create the label
    const newLabelId = await createGmailLabel(accessToken, AIVA_LABEL_NAME);
    
    if (newLabelId && connectionId) {
      labelIdCache.set(connectionId, newLabelId);
    }

    return newLabelId;
  } catch (error) {
    console.error('[Gmail Actions] Error ensuring Aiva label:', error);
    return null;
  }
}

/**
 * Handle a Gmail message - mark as read, archive, and apply Aiva label
 * This is the main function called after Aiva handles a message
 */
export async function handleGmailMessage(
  connectionId: string,
  providerMessageId: string,
  options: {
    markRead?: boolean;
    archive?: boolean;
    applyLabel?: boolean;
  } = { markRead: true, archive: true, applyLabel: true }
): Promise<{
  success: boolean;
  actions: {
    markedRead: boolean;
    archived: boolean;
    labeled: boolean;
  };
  error?: string;
}> {
  const actions = {
    markedRead: false,
    archived: false,
    labeled: false,
  };

  try {
    // Get access token
    const accessToken = await getGmailAccessToken(connectionId);

    // Mark as read
    if (options.markRead) {
      actions.markedRead = await markGmailMessageRead(accessToken, providerMessageId);
    }

    // Apply Aiva label
    if (options.applyLabel) {
      const labelId = await ensureAivaLabel(accessToken, connectionId);
      if (labelId) {
        actions.labeled = await applyGmailLabel(accessToken, providerMessageId, labelId);
      }
    }

    // Archive (remove from INBOX)
    if (options.archive) {
      actions.archived = await archiveGmailMessage(accessToken, providerMessageId);
    }

    const success = (
      (!options.markRead || actions.markedRead) &&
      (!options.archive || actions.archived) &&
      (!options.applyLabel || actions.labeled)
    );

    return { success, actions };
  } catch (error) {
    console.error('[Gmail Actions] Error handling message:', error);
    return {
      success: false,
      actions,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch handle multiple Gmail messages
 */
export async function batchHandleGmailMessages(
  connectionId: string,
  providerMessageIds: string[],
  options: {
    markRead?: boolean;
    archive?: boolean;
    applyLabel?: boolean;
  } = { markRead: true, archive: true, applyLabel: true }
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{ messageId: string; success: boolean }>;
}> {
  const results: Array<{ messageId: string; success: boolean }> = [];
  let successful = 0;
  let failed = 0;

  for (const messageId of providerMessageIds) {
    const result = await handleGmailMessage(connectionId, messageId, options);
    results.push({ messageId, success: result.success });
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    total: providerMessageIds.length,
    successful,
    failed,
    results,
  };
}

/**
 * Undo handling - restore message to inbox
 */
export async function restoreGmailMessage(
  connectionId: string,
  providerMessageId: string
): Promise<boolean> {
  try {
    const accessToken = await getGmailAccessToken(connectionId);

    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${providerMessageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: ['INBOX', 'UNREAD'],
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[Gmail Actions] Error restoring message:', error);
    return false;
  }
}

