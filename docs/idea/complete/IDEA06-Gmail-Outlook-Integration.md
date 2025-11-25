# Aiva.io - Gmail + Outlook Integration Playbook

## Overview

This playbook covers the integration of Gmail (Google Workspace + personal Gmail) and Outlook (Microsoft 365 + Exchange Online via Microsoft Graph) into Aiva.io, leveraging **Nextbase Ultimate** patterns for secure, workspace-scoped message management.

**Last Updated**: v1.0  
**Coverage**: Gmail (Google Workspace + personal Gmail) & Outlook (Microsoft 365 + Exchange Online via Microsoft Graph)

## 1. Goals of This Integration

Aiva needs to integrate email channels with full read/write capabilities, workspace isolation, and secure token management.

### Capability Matrix

| Capability | Gmail | Outlook |
|------------|-------|---------|
| Read inbox messages | ✔ | ✔ |
| Fetch metadata | ✔ | ✔ |
| Fetch thread / conversation history | ✔ | Partial via Graph |
| Send replies | ✔ | ✔ |
| Draft replies (user review) | UI responsibility | UI responsibility |
| Auto-send replies | ✔ | ✔ |
| Detect unread / read status | ✔ | ✔ |
| Update read status | ✔ | ✔ |
| Create "Sent" items | ✔ | ✔ |
| Detect spam/Promotions/Social | ✔ (labels) | Partial |
| Webhook new-message notifications | ✔ (watch API) | ✔ (subscription API) |
| Search | ✔ (query) | ✔ (OData filter) |

## 2. Required Scopes (Least Privilege)

### Gmail OAuth Scopes

**Requested via Supabase Auth**:
- `https://www.googleapis.com/auth/gmail.modify` - Read, label, mark read, move, draft
- `https://www.googleapis.com/auth/gmail.send` - Send + auto-send
- `https://www.googleapis.com/auth/userinfo.profile` - Resolve sender name

**We do NOT request** `gmail.readonly` because sending & marking read require modify.

### Outlook / Microsoft Graph OAuth Scopes

**Requested via Supabase Auth**:
- `Mail.ReadWrite` - Read inbox, mark read/unread
- `Mail.Send` - Send + auto-send
- `offline_access` - Refresh token
- `User.Read` - Profile info (display name, photo)

**Do NOT request Calendar scopes** during email onboarding — those are requested separately during calendar onboarding.

## 3. Token Storage & Security

### Data Storage (Workspace-Scoped)

**Table**: `channel_connections` (workspace-scoped with RLS)

| Data | Storage |
|------|----------|
| Access tokens | Encrypted at rest (AES-256) |
| Refresh tokens | Encrypted at rest, separate encryption key rotation |
| OAuth provider IDs | Stored in plaintext |
| Scopes | Stored in plaintext for debugging |

**Security**:
- Tokens never sent to frontend or logs
- Rotate encryption keys using key versioning
- Workspace isolation via RLS policies

**Implementation**:
```typescript
// src/data/user/integrations/createChannelConnectionAction.ts
export const createChannelConnectionAction = authActionClient
  .schema(createConnectionSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, parsedInput.workspaceId);
    if (!isMember) throw new Error("Not a workspace member");

    // Encrypt tokens before storage
    const encryptedAccessToken = encrypt(parsedInput.accessToken);
    const encryptedRefreshToken = encrypt(parsedInput.refreshToken);

    // Store workspace-scoped
    const { data, error } = await supabase
      .from("channel_connections")
      .insert({
        workspace_id: parsedInput.workspaceId,
        user_id: userId,
        provider: parsedInput.provider,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        // ...
      });

    return data;
  });
```

## 4. Message Sync Architecture

### Ingestion Modes

| Mode | Gmail | Outlook |
|------|-------|---------|
| Webhook / push | ✔ (watch → history) | ✔ (subscriptions) |
| Polling fallback | ✔ | ✔ |

### Sync Strategy

**Never do full mailbox sync** — too slow, too costly.

**Instead**:
1. **On initial connect**:
   - Import last 30 days of messages (configurable: 7 / 30 / 90 days)
   - Background job via Supabase Edge Function

2. **After initial sync**:
   - Subscribe to new-message notifications
   - Webhook endpoint: `/api/integrations/gmail/webhook` or `/api/integrations/outlook/webhook`

3. **Periodic fallback job**:
   - Every 6 hours: resync last 72 hours for drift & webhook recovery
   - Supabase scheduled function

### Sync Rules

| Action | Behavior |
|--------|----------|
| Incoming new message | Ingest + store message + thread mapping (workspace-scoped) |
| Sent from Aiva | Store message + update thread |
| Manual send from Gmail/Outlook | Captured next webhook/poll sync |
| Delete in provider | Mark status = archived but do not delete from Aiva |
| Spam/Promotions | Mark category = Noise |

**Implementation**:
```typescript
// Supabase Edge Function: sync-gmail-messages
export async function syncGmailMessages(workspaceId: string, connectionId: string) {
  // Fetch messages from Gmail API
  const messages = await gmailAPI.fetchMessages(connectionId);
  
  // Normalize and store workspace-scoped
  for (const message of messages) {
    await supabase
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        channel_connection_id: connectionId,
        provider_message_id: message.id,
        // ... normalized fields
      });
  }
}
```

## 5. Normalized Message Mapping

### Aiva Normalized Email Object

**Table**: `messages` (workspace-scoped with RLS)

```typescript
type Message = {
  id: UUID;
  workspace_id: UUID; // Workspace isolation
  provider_id: string;
  provider: "gmail" | "outlook";
  thread_id: UUID; // Aiva generated
  external_thread_id: string; // gmail threadId or conversationId
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  cc: { name: string; email: string }[];
  bcc: { name: string; email: string }[];
  subject: string;
  body_html: string;
  body_text: string;
  timestamp: TIMESTAMPTZ;
  is_read: boolean;
  is_sent_by_user: boolean;
  labels: string[];
  priority: "high" | "medium" | "low" | "noise";
  category: string;
  sentiment: "positive" | "neutral" | "negative" | "urgent";
  status: "unread" | "action_required" | "waiting" | "done";
};
```

### Key Notes

- **Gmail threadId**: Stable, use for threading
- **Outlook conversationId**: Not reliable for full threading → map threads using subject + participants + 24h window fallback
- **Workspace Isolation**: All messages filtered by workspace_id via RLS

## 6. Sending Emails (Replies & New Messages)

### Gmail Send APIs

**Endpoint**: `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`  
**Format**: Raw MIME required

### Outlook Send APIs

**Endpoint**: `POST https://graph.microsoft.com/v1.0/me/sendMail`  
**Format**: JSON payload supported

### Implementation Rules

**Server Action**: `src/data/user/messages/sendReplyAction.ts`

```typescript
export const sendReplyAction = authActionClient
  .schema(sendReplySchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, parsedInput.workspaceId);
    if (!isMember) throw new Error("Not a workspace member");

    // Get channel connection (workspace-scoped)
    const connection = await getChannelConnection(
      parsedInput.connectionId,
      parsedInput.workspaceId
    );

    // Send via provider API
    const result = await sendEmail(connection, parsedInput.message);

    // Store sent message (workspace-scoped)
    await supabase
      .from("messages")
      .insert({
        workspace_id: parsedInput.workspaceId,
        provider: connection.provider,
        // ... message data
        is_sent_by_user: true,
      });

    return result;
  });
```

**Rules**:
- Always include In-Reply-To and References headers for threading
- Always send as REPLY when provider_id exists
- For auto-send, check:
  - User has allowed auto-send for email channel
  - Confidence > threshold
  - No pricing/legal/sensitive topic flags

## 7. Marking Read / Unread

### Provider APIs

| Provider | API |
|----------|-----|
| Gmail | Modify message → remove UNREAD label |
| Outlook | PATCH /messages/{id} body { "isRead": true } |

**Server Action**: `src/data/user/messages/updateReadStatusAction.ts`

```typescript
export const updateReadStatusAction = authActionClient
  .schema(updateReadStatusSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, parsedInput.workspaceId);
    if (!isMember) throw new Error("Not a workspace member");

    // Update in provider
    await updateReadStatus(parsedInput.messageId, parsedInput.isRead);

    // Update in database (workspace-scoped)
    await supabase
      .from("messages")
      .update({ is_read: parsedInput.isRead })
      .eq("id", parsedInput.messageId)
      .eq("workspace_id", parsedInput.workspaceId);

    return { success: true };
  });
```

**Rule**: Never modify read status until user takes action in Aiva or auto-send handles.

## 8. Thread Reconstruction Logic

### Gmail Threading

- Use Gmail threadId to fetch all messages in thread
- Preserve order via timestamp
- Store in `threads` table (workspace-scoped)

### Outlook Threading

Use fallback sequence:
1. Attempt via conversationId
2. If fails:
   - Match subject (strip "Re: / Fwd:" prefixes)
   - Match participants
   - Match within last 10 days

### Thread Summaries

- Store compact thread summaries in `thread_summaries` table (workspace-scoped)
- Full content only fetched on demand when user expands
- Cached for performance

**Server Action**: `src/data/user/messages/getThreadAction.ts`

```typescript
export const getThreadAction = authActionClient
  .schema(getThreadSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, parsedInput.workspaceId);
    if (!isMember) throw new Error("Not a workspace member");

    // Fetch thread (workspace-scoped)
    const { data: thread } = await supabase
      .from("threads")
      .select(`
        *,
        messages (*)
      `)
      .eq("id", parsedInput.threadId)
      .eq("workspace_id", parsedInput.workspaceId)
      .single();

    return thread;
  });
```

## 9. Rate Limits & Backoff

### Gmail Rate Limits

- RFC 4291 style soft limits → use exponential backoff
- Strict daily quotas for end users

### Outlook Rate Limits

- Throttling returns 429 with Retry-After → respect strictly
- Heavy syncing must go through delta queries — not full inbox scans

### Anti-Overload Rules

- Queue outgoing sends — never burst more than 6/min per account
- Cap thread historics scanning to avoid O(∞) loops
- Use Supabase Edge Functions for rate-limited operations

**Implementation**:
```typescript
// src/utils/rateLimiting.ts
export async function rateLimitedAPICall(
  provider: "gmail" | "outlook",
  call: () => Promise<any>
) {
  const rateLimiter = getRateLimiter(provider);
  
  return await rateLimiter.execute(async () => {
    try {
      return await call();
    } catch (error) {
      if (error.status === 429) {
        // Exponential backoff
        await sleep(calculateBackoff(error));
        return await call();
      }
      throw error;
    }
  });
}
```

## 10. Error Handling & Recovery

### Error Type Handling

| Error Type | Action |
|------------|--------|
| Token expired | Attempt refresh → if fail → mark reconnect required |
| 401 / 403 | Disable sync + notify user with reconnect card |
| 429 | Backoff + retry after provider hint |
| 5xx | Retry exponential |
| Message not found | Mark status = provider_removed |

### Provider Disconnect UX

**Server Component**: `src/components/integrations/ConnectionStatus.tsx`

- Banner: "Aiva lost access to Gmail/Outlook. Click to reconnect."
- Messaging & auto-send pause automatically until fixed
- Reconnect button triggers OAuth flow

**Implementation**:
```typescript
// src/data/user/integrations/checkConnectionHealthAction.ts
export const checkConnectionHealthAction = authActionClient
  .action(async ({ ctx: { userId } }) => {
    const connections = await getChannelConnections(ctx.workspaceId);
    
    for (const connection of connections) {
      const health = await testConnection(connection);
      if (!health.isHealthy) {
        // Update status
        await supabase
          .from("channel_connections")
          .update({ status: "disconnected", last_error: health.error })
          .eq("id", connection.id);
      }
    }
  });
```

## 11. Auto-Send Safeguards (Email Edition)

**Server Action**: `src/data/user/messages/autoSendDecisionAction.ts`

Auto-send may only trigger when:
- Contact ≠ new contact
- Message classification = "simple acknowledgement" or "confirming"
- Thread ≠ pricing / contract / refund / negative feedback
- Confidence > user threshold (default 0.82)
- No scheduling ambiguity
- No attachments requested

Auto-send must not run if:
- Time > 9pm local time (unless overridden)
- Draft contains new promises
- Thread contains emotionally sensitive language

### Logging (Required)

**Table**: `ai_action_logs` (workspace-scoped)

```typescript
type AIActionLog = {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID;
  provider: "gmail" | "outlook";
  message_id: UUID;
  action: "auto-send";
  confidence_score: number;
  summary: string;
  timestamp: TIMESTAMPTZ;
};
```

**Implementation**:
```typescript
export const autoSendDecisionAction = authActionClient
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Check all safeguards
    const canAutoSend = await checkAutoSendRules(parsedInput);
    
    if (canAutoSend.allowed) {
      // Send message
      await sendReply(parsedInput);
      
      // Log action (workspace-scoped)
      await supabase
        .from("ai_action_logs")
        .insert({
          workspace_id: parsedInput.workspaceId,
          user_id: userId,
          action: "auto-send",
          confidence_score: canAutoSend.confidence,
          // ...
        });
    }
  });
```

## 12. Testing Matrix (QA Checklist)

| Scenario | Gmail | Outlook |
|----------|-------|---------|
| First connect & initial 30-day import | ✔ | ✔ |
| Real-time webhook delivery | ✔ | ✔ |
| Fallback polling if webhook disabled | ✔ | ✔ |
| Reply to thread → appears threaded | ✔ | ✔ |
| Outlook conversation fallback thread | N/A | ✔ |
| Mark read in Aiva → reflected in inbox | ✔ | ✔ |
| Auto-send simple reply | ✔ | ✔ |
| Auto-send blocked due to sensitive content | ✔ | ✔ |
| Token renewal | ✔ | ✔ |
| Disconnect → reconnection banner | ✔ | ✔ |

**Testing**: Use Playwright E2E tests with test email accounts

## 13. Monitoring & Alerting

### Required Metrics

- Ingestion latency per provider
- Webhook success/failure
- Token refresh failure rate
- Auto-send success/failure
- New errors per provider per hour

### Alert Thresholds

| Event | Trigger |
|-------|---------|
| Webhook no events | 30 min with 0 messages |
| >5% send failures | 15 min window |
| Token refresh fails | 3 attempts |
| 429 spikes | 20% in 5 min |

**Implementation**: Use Supabase logging and Sentry for error tracking

## 14. Versioning Policy

Integration layer is versioned separately from product release:

- `gmail-integration-v1.0`
- `outlook-integration-v1.0`

Once stable:
- New features → v1.1
- Breaking changes → v2.0

## 15. Roadmap for Enhancements

| Priority | Feature |
|----------|---------|
| High | Delta sync for Outlook to reduce overhead |
| Med | Offline send queue retry support |
| Med | Contact photos / signatures fetch |
| Low | Sentiment scoring using provider metadata |

---

**Built on Nextbase Ultimate** - All integrations leverage Nextbase patterns: workspace isolation, Server Actions, RLS policies, and secure token management.

