# Aiva.io - Scheduling Logic Playbook

## Scope

How Aiva interprets scheduling-related messages, checks calendars, proposes times, creates events, and avoids double bookings. All scheduling operations are workspace-scoped and leverage **Nextbase Ultimate** patterns for secure, multi-tenant calendar management.

## 1. Goals

Aiva's scheduling engine should:
1. Understand when a message is about scheduling/rescheduling/cancelling
2. Translate vague human language ("Thursday arvo", "next week", "after lunch") into concrete time windows
3. Check real availability across all connected calendars
4. Respect user preferences (work hours, buffer times, max meetings, time zone)
5. Generate clear, natural language proposals and confirmations
6. Create/update/cancel events without conflicts
7. Avoid mistakes: double bookings, wrong time zone, too many meetings, weird times

## 2. Core Concepts & Data Structures

### 2.1 Availability Model

**Table**: `workspace_settings` (workspace-scoped)

```typescript
type AvailabilityProfile = {
  workspace_id: UUID;
  timezone: string;            // e.g. "Australia/Brisbane"
  workDays: number[];          // 1-5 for Mon–Fri
  workHours: { start: string; end: string }; // "08:30"–"17:00"
  minBufferMinutes: number;    // e.g. 15
  minMeetingLengthMinutes: number; // default 30
  maxMeetingLengthMinutes: number; // default 90
  maxMeetingsPerDay: number;      // e.g. 6
  noMeetingBlocks: TimeBlock[];   // user-defined "do not schedule"
};
```

**Storage**: Stored in `workspace_settings` JSONB column

### 2.2 Unified Event Model

**Table**: `calendar_events` (workspace-scoped with RLS)

```typescript
type CalendarEvent = {
  id: UUID;
  workspace_id: UUID;
  provider: "google" | "outlook" | "caldav";
  calendar_connection_id: UUID;
  title: string;
  start: TIMESTAMPTZ;     // with timezone
  end: TIMESTAMPTZ;
  is_all_day: boolean;
  status: "busy" | "free" | "tentative";
  attendees: Attendee[];
  source_raw: JSONB;
};

type Attendee = {
  email: string;
  name?: string;
  response_status?: "accepted" | "declined" | "tentative" | "none";
};
```

**RLS Policy**: Workspace members can view events, admins can manage

### 2.3 Scheduling Intent Model

**Server Action**: `src/data/user/ai/detectSchedulingIntentAction.ts`

When a new message arrives:

```typescript
type SchedulingIntent = {
  is_scheduling: boolean;
  intent_type: "request_meeting" | "propose_times" | "confirm_time" | "reschedule" | "cancel" | "none";
  requested_windows: TimeWindow[];
  duration_minutes?: number;
  topic?: string;
  requires_clarification: boolean;
};

type TimeWindow = {
  start?: DateTime;
  end?: DateTime;
  day_reference?: "today" | "tomorrow" | "this_week" | "next_week" | "specific_date";
  original_text?: string;
};
```

**Storage**: Stored in `scheduling_intents` table (workspace-scoped)

## 3. End-to-End Scheduling Pipeline

### 3.1 High-Level Flow

1. **Message received** → `detectSchedulingIntentAction` called
2. **If isScheduling === false** → no further scheduling
3. **If true**:
   - Fetch user's AvailabilityProfile (workspace-scoped)
   - Query connected calendars for relevant period (e.g., next 14 days)
   - Build BusyBlocks and FreeBlocks
   - Find candidate slots matching requested windows
   - Ask AI to generate: Proposed times reply, OR Clarification request, OR Confirmation reply + event creation

**Implementation**: All steps use Server Actions with workspace verification

## 4. Step 1 – Detect Scheduling Intent

**Server Action**: `src/data/user/ai/detectSchedulingIntentAction.ts`

Handled by AI using the "Identify Scheduling Intent" prompt (see IDEA05).

**Key rules**:
- If message contains explicit date/time expressions: "Thursday at 2pm", "31st May at 10am"
- Or contains phrases: "Can we book a call", "schedule a meeting", "catch up", "zoom call"
- Then `is_scheduling = true`

**Edge cases**:
- "I will call you tomorrow" → no meeting to schedule
- "We should meet sometime" (no timeframe) → `requires_clarification = true`

**Implementation**:
```typescript
export const detectSchedulingIntentAction = authActionClient
  .schema(detectIntentSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, parsedInput.workspaceId);
    if (!isMember) throw new Error("Not a workspace member");

    // Call AI to detect intent
    const intent = await callAIForSchedulingIntent(parsedInput.message);

    // Store intent (workspace-scoped)
    await supabase
      .from("scheduling_intents")
      .insert({
        workspace_id: parsedInput.workspaceId,
        message_id: parsedInput.messageId,
        intent_data: intent,
      });

    return intent;
  });
```

## 5. Step 2 – Build Availability

### 5.1 Fetch Events

**Server Action**: `src/data/user/calendar/getAvailabilityAction.ts`

For each connected calendar:
- Query events in candidate time range: now → now + 14 days
- Normalize to CalendarEvent objects
- Filter by workspace_id via RLS

**Implementation**:
```typescript
export const getAvailabilityAction = authActionClient
  .schema(getAvailabilitySchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, parsedInput.workspaceId);
    if (!isMember) throw new Error("Not a workspace member");

    // Get calendar connections (workspace-scoped)
    const connections = await getCalendarConnections(parsedInput.workspaceId);

    // Fetch events from all calendars
    const allEvents: CalendarEvent[] = [];
    for (const connection of connections) {
      const events = await fetchCalendarEvents(connection, parsedInput.dateRange);
      allEvents.push(...events);
    }

    // Normalize and store (workspace-scoped)
    await storeEvents(allEvents, parsedInput.workspaceId);

    return allEvents;
  });
```

### 5.2 Merge Calendars into Busy Blocks

Create unified list of BusyBlocks:

```typescript
type BusyBlock = {
  start: DateTime;
  end: DateTime;
  source_event_ids: UUID[];
};
```

**Algorithm**:
1. Collect all events with status != "free"
2. Normalize into blocks [start, end]
3. Sort by start time
4. Merge overlapping or adjacent blocks (<= bufferMinutes apart)

**Implementation**: Server-side function processes events, returns busy blocks

### 5.3 Derive Free Blocks within Work Hours

For each day in search range:
1. Start with day's work-block: workHours (if it's a workDay)
2. Subtract BusyBlocks and noMeetingBlocks
3. Insert buffers before/after BusyBlocks as "pseudo-busy"

**Result**: List of potential FreeBlocks

```typescript
type FreeBlock = {
  start: DateTime;
  end: DateTime;
};
```

## 6. Step 3 – Translate Human Language to Target Windows

### 6.1 Text → TimeWindow Mapping

**Examples**:
- "Thursday afternoon": Day = next upcoming Thursday, Time = 13:00–17:00
- "Friday morning": 09:00–12:00
- "Tomorrow": Next calendar date in user's timezone, workHours span

**Rules**:
- All relative references resolved using user timezone and current date
- Where no specific time given, default to workHours for that day
- If user's AvailabilityProfile restricts hours further, intersect

### 6.2 Multiple Window Support

If message: "Sometime Thursday afternoon or Friday morning"

We create two TimeWindows:
- Thursday 13:00–17:00
- Friday 09:00–12:00

**Implementation**: AI extracts multiple windows, stored in `scheduling_intents` table

## 7. Step 4 – Find Candidate Meeting Slots

### 7.1 Basic Slotting Algorithm

**Server Action**: `src/data/user/calendar/findAvailableSlotsAction.ts`

Given:
- Duration (default to 30 mins if undefined)
- FreeBlocks within relevant days
- Optionally requestedWindows

**Algorithm**:
For each FreeBlock:
1. Set cursor = block.start
2. While cursor + duration <= block.end:
   - Check: Not violating maxMeetingsPerDay
   - Check: Not near end of day except allowed
   - If valid, candidate slot = [cursor, cursor + duration]
   - Move cursor by duration (or smaller step, e.g., 15 mins)

**Implementation**:
```typescript
export const findAvailableSlotsAction = authActionClient
  .schema(findSlotsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Get availability profile (workspace-scoped)
    const profile = await getAvailabilityProfile(parsedInput.workspaceId);
    
    // Get free blocks
    const freeBlocks = await getFreeBlocks(parsedInput.workspaceId, parsedInput.dateRange);
    
    // Find candidate slots
    const slots = findSlotsInBlocks(freeBlocks, profile, parsedInput.duration);
    
    return slots;
  });
```

### 7.2 Honor Requested Windows

If requestedWindows present:
- Only consider FreeBlocks that fall within requested windows
- If no slot fits:
  - Option 1: Expand slightly (e.g. ±1 hour)
  - Option 2: Defer to AI to ask for alternative

### 7.3 Limit Proposed Options

To avoid overwhelming recipient:
- Default: propose 2–4 time options
- Prioritize: Soonest times that still respect buffers
- Spread across days if possible

## 8. Step 5 – Generate Human Reply

**Server Action**: `src/data/user/ai/generateSchedulingProposalAction.ts`

We use AI prompt that:
- Takes: Candidate slots, user timezone, intent context
- Returns natural language like:

"Thanks for reaching out!
I'm free on Thursday between 2:00–2:30pm and 4:00–4:30pm, or on Friday between 9:00–9:30am (AEST).
Let me know which works best and I'll send through a calendar invite."

**Rules**:
- Always include timezone label (e.g., AEST)
- Use clear formatting: "Thursday 21st at 2:30pm"
- Keep under ~150 tokens

**Implementation**: Uses prompt from IDEA05, stores proposal in `scheduling_proposals` table

## 9. Handling Confirmations

**Server Action**: `src/data/user/calendar/confirmSchedulingAction.ts`

When counterparty replies picking a time:

1. **Parse chosen time**: "Thursday at 2:30pm works for me" → DateTime
2. **Check again for fresh conflicts**: Another event added since proposal
3. **If free**:
   - Create event via `createCalendarEventAction`
   - Title: Detected topic or template: "Call with {{CONTACT_NAME}}"
   - Duration: Previously assumed or user default
4. **Send confirmation reply**: "Great! I've sent a calendar invite for Thursday 21st at 2:30–3:00pm AEST."

If not free anymore:
- Suggest alternative: "Sorry, something came up at that time. I'm free at 3:00–3:30pm instead – would that work?"

**Implementation**:
```typescript
export const confirmSchedulingAction = authActionClient
  .schema(confirmSchedulingSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, parsedInput.workspaceId);
    if (!isMember) throw new Error("Not a workspace member");

    // Check availability again
    const isAvailable = await checkAvailability(
      parsedInput.workspaceId,
      parsedInput.proposedTime
    );

    if (!isAvailable) {
      // Suggest alternatives
      const alternatives = await findAlternativeSlots(parsedInput.workspaceId);
      return { available: false, alternatives };
    }

    // Create event (workspace-scoped)
    const event = await createCalendarEvent({
      workspace_id: parsedInput.workspaceId,
      title: parsedInput.topic || `Call with ${parsedInput.contactName}`,
      start: parsedInput.proposedTime,
      end: addMinutes(parsedInput.proposedTime, parsedInput.duration),
      // ...
    });

    // Send confirmation message
    await sendConfirmationMessage(parsedInput.messageId, event);

    return { success: true, event };
  });
```

## 10. Rescheduling Logic

### 10.1 Detect Reschedule Intent

**Examples**:
- "Can we move our call to next week?"
- "I won't be available at 2pm anymore – can we do later in the day?"

**Steps**:
1. Identify existing event: From subject / thread mapping / meeting ID
2. Determine: New specific slot proposed, or new vague window

### 10.2 Reschedule Flow

**Server Action**: `src/data/user/calendar/rescheduleEventAction.ts`

- **If new specific time proposed**:
  1. Check availability at new time
  2. If free: Update event in calendar, send confirmation
  3. If conflict: Offer alternatives

- **If vague window**: Treat like new scheduling request, but with existing event context

**Implementation**: Similar to confirmation flow, updates existing event

### 10.3 Cancel Flow

**Server Action**: `src/data/user/calendar/cancelEventAction.ts`

If message intent is cancellation:
- AI asks user to confirm (unless auto-cancel allowed)
- On confirmation: Cancel event via provider API, send polite cancellation note

## 11. Multi-Timezone Handling

### 11.1 User vs Counterparty Time Zones

- Aiva always stores times in user's timezone and UTC
- When talking to counterparties:
  - If their timezone is known, convert times into their timezone
  - Otherwise, explicitly mention timezone: "All times are in AEST (Brisbane time)"

### 11.2 When Counterparty Provides Their Time Zone

**Example**: "I'm in PST, could you do 3pm on Thursday?"

- Parse: Thursday 3pm in PST
- Convert to user's timezone
- Check if fits availability

**Rule**: Always ensure at least one timezone tag present in human-facing text

**Implementation**: Timezone conversion utilities in `src/utils/timezone.ts`

## 12. Constraints & Preferences

### 12.1 Meeting Limits

- **maxMeetingsPerDay**: Once reached, no more proposals except user explicitly forces override
- **Buffer enforcement**: No meeting within minBufferMinutes of existing event

### 12.2 "Focus" / "No Meetings" Blocks

User-defined or event-labeled as "focus":
- Do not schedule over these unless user explicitly overrides via UI

**Storage**: Stored in `workspace_settings.no_meeting_blocks` JSONB

## 13. When to Ask for Clarification

Aiva should not guess in these cases:
- Duration unclear and important
- Day ambiguous ("next Friday" near month boundary)
- Multiple people involved and attendees unclear
- User availability fully booked in requested window

**AI generates**:
- "I'm pretty booked then – would you be open to [alternative window suggestions]?"
- "Do you prefer a 30-minute or 60-minute call?"
- "Are you referring to this Friday (the 23rd) or next Friday (the 30th)?"

## 14. Auto-Scheduling vs Human-Review

### Modes

1. **Suggest-only**: Aiva drafts scheduling replies; user must approve
2. **Auto-schedule simple cases**: If contact is known & low-risk, meeting type is short/standard, time chosen is clearly free

**All auto-scheduled actions logged**:

**Table**: `scheduling_action_logs` (workspace-scoped)

```typescript
type SchedulingActionLog = {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID;
  type: "proposal" | "acceptance" | "reschedule" | "cancel";
  context_message_id: UUID;
  event_id: UUID;
  confidence_score: number;
  created_at: TIMESTAMPTZ;
};
```

## 15. Edge Cases

1. **All-day events or out-of-office**: Treat as fully blocked if "OOO" or status = busy
2. **Double-booking allowed?**: Default: no double bookings. Advanced setting: allow double-book on "tentative" events
3. **Overlapping calendars**: If multiple calendars (work + personal), all busy blocks are merged
4. **User manually edits event**: Next calendar sync detects changes. If conflicting with ongoing scheduling thread, Aiva avoids confirming old proposals

## 16. Monitoring & Metrics

**Track**:
- Number of scheduling intents detected per day
- Number of proposals generated
- Number of successfully booked meetings
- Number of reschedules
- Number of user overrides (indicates frustration)
- Complaints: "Wrong time zone", "double booked me" – should be near zero

**Storage**: Metrics stored in `scheduling_metrics` table (workspace-scoped)

---

**Built on Nextbase Ultimate** - All scheduling operations are workspace-scoped, use Server Actions, enforce RLS policies, and maintain complete audit logs.

