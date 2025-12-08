/**
 * Outlook Actions API
 * Handle archive, category, and read operations for Outlook messages
 */

import { getOutlookAccessToken } from './client';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0/me';
const AIVA_CATEGORY_NAME = 'Handled by Aiva';

/**
 * Mark an Outlook message as read
 */
export async function markOutlookMessageRead(
  accessToken: string,
  messageId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/messages/${messageId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isRead: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Outlook Actions] Failed to mark as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Outlook Actions] Error marking as read:', error);
    return false;
  }
}

/**
 * Move an Outlook message to the Archive folder
 */
export async function archiveOutlookMessage(
  accessToken: string,
  messageId: string
): Promise<boolean> {
  try {
    // First, get the Archive folder ID
    const foldersResponse = await fetch(
      `${GRAPH_API_BASE}/mailFolders?$filter=displayName eq 'Archive'`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let archiveFolderId: string | null = null;

    if (foldersResponse.ok) {
      const foldersData = await foldersResponse.json();
      if (foldersData.value && foldersData.value.length > 0) {
        archiveFolderId = foldersData.value[0].id;
      }
    }

    // If no Archive folder, try to get well-known folder
    if (!archiveFolderId) {
      const wellKnownResponse = await fetch(
        `${GRAPH_API_BASE}/mailFolders/archive`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (wellKnownResponse.ok) {
        const wellKnownData = await wellKnownResponse.json();
        archiveFolderId = wellKnownData.id;
      }
    }

    // If still no archive folder, create one
    if (!archiveFolderId) {
      const createResponse = await fetch(
        `${GRAPH_API_BASE}/mailFolders`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: 'Archive',
          }),
        }
      );

      if (createResponse.ok) {
        const createData = await createResponse.json();
        archiveFolderId = createData.id;
      }
    }

    if (!archiveFolderId) {
      console.error('[Outlook Actions] Could not find or create Archive folder');
      return false;
    }

    // Move the message to Archive
    const moveResponse = await fetch(
      `${GRAPH_API_BASE}/messages/${messageId}/move`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationId: archiveFolderId,
        }),
      }
    );

    if (!moveResponse.ok) {
      const error = await moveResponse.text();
      console.error('[Outlook Actions] Failed to archive:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Outlook Actions] Error archiving:', error);
    return false;
  }
}

/**
 * Get all categories from Outlook
 */
async function getOutlookCategories(
  accessToken: string
): Promise<Array<{ id: string; displayName: string; color: string }>> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/outlook/masterCategories`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get categories');
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error('[Outlook Actions] Error getting categories:', error);
    return [];
  }
}

/**
 * Create an Outlook category
 */
async function createOutlookCategory(
  accessToken: string,
  categoryName: string,
  color: string = 'preset2' // Green
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/outlook/masterCategories`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: categoryName,
          color: color,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      // Category might already exist
      if (error.includes('already exists')) {
        return true;
      }
      console.error('[Outlook Actions] Failed to create category:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Outlook Actions] Error creating category:', error);
    return false;
  }
}

/**
 * Ensure the "Handled by Aiva" category exists
 */
export async function ensureAivaCategory(
  accessToken: string
): Promise<boolean> {
  try {
    const categories = await getOutlookCategories(accessToken);
    
    const existingCategory = categories.find(
      (c) => c.displayName === AIVA_CATEGORY_NAME || 
             c.displayName.toLowerCase() === AIVA_CATEGORY_NAME.toLowerCase()
    );

    if (existingCategory) {
      return true;
    }

    return await createOutlookCategory(accessToken, AIVA_CATEGORY_NAME);
  } catch (error) {
    console.error('[Outlook Actions] Error ensuring Aiva category:', error);
    return false;
  }
}

/**
 * Apply a category to an Outlook message
 */
export async function applyOutlookCategory(
  accessToken: string,
  messageId: string,
  categoryName: string = AIVA_CATEGORY_NAME
): Promise<boolean> {
  try {
    // First get current categories
    const getResponse = await fetch(
      `${GRAPH_API_BASE}/messages/${messageId}?$select=categories`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let currentCategories: string[] = [];
    if (getResponse.ok) {
      const getData = await getResponse.json();
      currentCategories = getData.categories || [];
    }

    // Add Aiva category if not already present
    if (!currentCategories.includes(categoryName)) {
      currentCategories.push(categoryName);
    }

    // Update message with categories
    const response = await fetch(
      `${GRAPH_API_BASE}/messages/${messageId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: currentCategories,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Outlook Actions] Failed to apply category:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Outlook Actions] Error applying category:', error);
    return false;
  }
}

/**
 * Handle an Outlook message - mark as read, archive, and apply Aiva category
 * This is the main function called after Aiva handles a message
 */
export async function handleOutlookMessage(
  connectionId: string,
  providerMessageId: string,
  options: {
    markRead?: boolean;
    archive?: boolean;
    applyCategory?: boolean;
  } = { markRead: true, archive: true, applyCategory: true }
): Promise<{
  success: boolean;
  actions: {
    markedRead: boolean;
    archived: boolean;
    categorized: boolean;
  };
  error?: string;
}> {
  const actions = {
    markedRead: false,
    archived: false,
    categorized: false,
  };

  try {
    // Get access token
    const accessToken = await getOutlookAccessToken(connectionId);

    // Ensure Aiva category exists
    if (options.applyCategory) {
      await ensureAivaCategory(accessToken);
    }

    // Mark as read
    if (options.markRead) {
      actions.markedRead = await markOutlookMessageRead(accessToken, providerMessageId);
    }

    // Apply Aiva category (do this before archiving since message ID might change)
    if (options.applyCategory) {
      actions.categorized = await applyOutlookCategory(accessToken, providerMessageId);
    }

    // Archive (move to Archive folder)
    if (options.archive) {
      actions.archived = await archiveOutlookMessage(accessToken, providerMessageId);
    }

    const success = (
      (!options.markRead || actions.markedRead) &&
      (!options.archive || actions.archived) &&
      (!options.applyCategory || actions.categorized)
    );

    return { success, actions };
  } catch (error) {
    console.error('[Outlook Actions] Error handling message:', error);
    return {
      success: false,
      actions,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch handle multiple Outlook messages
 */
export async function batchHandleOutlookMessages(
  connectionId: string,
  providerMessageIds: string[],
  options: {
    markRead?: boolean;
    archive?: boolean;
    applyCategory?: boolean;
  } = { markRead: true, archive: true, applyCategory: true }
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
    const result = await handleOutlookMessage(connectionId, messageId, options);
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
 * Restore an Outlook message to inbox (undo handling)
 */
export async function restoreOutlookMessage(
  connectionId: string,
  providerMessageId: string
): Promise<boolean> {
  try {
    const accessToken = await getOutlookAccessToken(connectionId);

    // Get Inbox folder ID
    const inboxResponse = await fetch(
      `${GRAPH_API_BASE}/mailFolders/inbox`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!inboxResponse.ok) {
      return false;
    }

    const inboxData = await inboxResponse.json();

    // Move message back to inbox
    const moveResponse = await fetch(
      `${GRAPH_API_BASE}/messages/${providerMessageId}/move`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationId: inboxData.id,
        }),
      }
    );

    if (!moveResponse.ok) {
      return false;
    }

    // Mark as unread
    const unreadResponse = await fetch(
      `${GRAPH_API_BASE}/messages/${providerMessageId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isRead: false,
        }),
      }
    );

    return unreadResponse.ok;
  } catch (error) {
    console.error('[Outlook Actions] Error restoring message:', error);
    return false;
  }
}

