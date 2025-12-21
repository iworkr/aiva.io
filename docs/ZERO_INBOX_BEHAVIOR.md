# Zero Inbox Feature - Behavior and Implementation

## Overview

Zero Inbox is a feature that automatically handles routine messages and keeps your inbox clean by archiving messages that Aiva has processed. When enabled, messages handled by Aiva are archived in the provider (Gmail/Outlook) and marked with a "Handled by Aiva" label/category.

## How It Works

### When Zero Inbox is Enabled

1. **Message Handling**: When Aiva handles a message (auto-replies, classifies as no action needed, etc.), it:
   - Marks the message as `handled_by_aiva = true` in the database
   - Sets `handled_at` timestamp
   - Records the `handle_action` (auto_replied, classified_no_action, manually_dismissed, manually_handled)
   - Optionally archives the message in the provider (Gmail/Outlook) if `auto_archive_handled` is enabled
   - Optionally applies a "Handled by Aiva" label/category if `apply_aiva_label` is enabled

2. **Message Counts**: Handled messages are **excluded** from:
   - **New Messages Count**: Only unread messages that haven't been handled (`is_read = false AND handled_by_aiva = false`)
   - **Active Conversations Count**: Only unique threads that have at least one unhandled message

3. **What Needs Your Attention**: Only shows messages that:
   - Require human review (`requires_human_review = true`)
   - Have not been reviewed (`reviewed_at IS NULL`)
   - Are either unhandled OR were auto-replied (so you can review what was sent)

### When Zero Inbox is Disabled

- All messages are counted regardless of `handled_by_aiva` status
- Handled messages still appear in counts (legacy behavior)
- This allows users to see all messages even if they've been handled

## Settings

Zero Inbox has three settings in `workspace_settings`:

1. **`inbox_zero_enabled`** (default: `true`): Master toggle for Zero Inbox features
2. **`auto_archive_handled`** (default: `true`): Automatically archive messages in provider after handling
3. **`apply_aiva_label`** (default: `true`): Apply "Handled by Aiva" label/category in provider

## Database Schema

Messages table includes:
- `handled_by_aiva` (boolean): Whether Aiva has handled this message
- `handled_at` (timestamp): When the message was handled
- `handle_action` (text): Type of handling (auto_replied, classified_no_action, manually_dismissed, manually_handled)
- `archived_in_provider` (boolean): Whether the message was archived in the provider

## Implementation Details

### Morning Brief Component

The `MorningBrief` component (homepage) now:
1. Checks `inbox_zero_enabled` setting from `workspace_settings`
2. Filters out handled messages from counts when Zero Inbox is enabled
3. Counts unique threads (not individual messages) for "active conversations" when Zero Inbox is enabled

### Message Queries

When Zero Inbox is enabled, queries should filter:
```sql
WHERE handled_by_aiva = false
```

### Active Conversations Definition

- **When Zero Inbox is enabled**: Count of unique `provider_thread_id` values from messages where `handled_by_aiva = false`
- **When Zero Inbox is disabled**: Count of all messages (legacy behavior)

**When is a conversation considered "done"?**
- A conversation thread is considered "active" if it has **at least one message** where `handled_by_aiva = false`
- Once **all messages** in a thread are handled (`handled_by_aiva = true`), the conversation is no longer active
- This means if there's an ongoing email thread and some messages are handled but others aren't, it will still show as an active conversation
- Messages requiring human review (`requires_human_review = true`) are never auto-handled, so they keep conversations active until reviewed

## What Gets Handled

Messages are marked as handled in these scenarios:

1. **Auto-Reply Sent**: When Aiva automatically sends a reply (if auto-send is enabled)
2. **No Action Needed**: When AI classifies a message as not requiring a response (FYI, notifications, etc.)
3. **Manually Dismissed**: When user manually dismisses a message
4. **Manually Handled**: When user manually marks a message as handled

### Messages That Are NOT Handled

**Messages requiring human review (`requires_human_review = true`) are NEVER auto-handled**, even with Zero Inbox enabled. This ensures that:
- Messages flagged for review always appear in "What needs your attention"
- They are included in unread counts and active conversations
- They are NOT archived on the provider side until reviewed
- Users can review them before they're handled

The only exception is when a user **manually** handles or dismisses a message that requires review (after they've reviewed it).

## Restoring Messages

Users can restore (undo handling) messages:
- Sets `handled_by_aiva = false`
- Removes from archive in provider (if applicable)
- Message will appear in counts again

## Provider-Side Archiving

When Zero Inbox is enabled and `auto_archive_handled` is `true`:

1. **Messages are archived (not deleted)** on the provider side (Gmail/Outlook)
   - Gmail: Messages are removed from INBOX (archived) and labeled with "Handled by Aiva"
   - Outlook: Messages are moved to Archive folder and categorized with "Handled by Aiva"
   - **Messages are NOT deleted** - they remain accessible in the archive/labeled folder

2. **Notification counts on phone apps** will show 0 unread emails because:
   - Messages are marked as read (`is_read = true`)
   - Messages are archived (removed from inbox)
   - This makes the Gmail/Outlook app on your phone show 0 unread count

3. **Messages can be restored**:
   - Users can restore messages from the archive
   - This sets `handled_by_aiva = false` and moves the message back to inbox
   - The message will appear in counts again

**Important**: Messages requiring human review (`requires_human_review = true`) are **NOT archived** until they are reviewed, ensuring they remain visible and accessible.

## Best Practices

1. **Always check Zero Inbox setting** before querying messages for counts
2. **Filter by `handled_by_aiva = false`** when Zero Inbox is enabled
3. **Count unique threads** for active conversations, not individual messages
4. **Show handled messages separately** if needed (e.g., in a "Handled" filter/view)
5. **Never auto-handle messages with `requires_human_review = true`** - always require manual review first

## Future Enhancements

Potential improvements:
- Separate view/filter for handled messages
- Statistics on handled vs unhandled messages
- Time-based handling (e.g., auto-handle messages older than X days)
- Category-based handling rules

