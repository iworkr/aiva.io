📘 Scheduling Logic Playbook – Aiva.io

Scope:
How Aiva interprets scheduling-related messages, checks calendars, proposes times, creates events, and avoids double bookings.

⸻

1. Goals

Aiva’s scheduling engine should:
	1.	Understand when a message is about scheduling/rescheduling/cancelling.
	2.	Translate vague human language (“Thursday arvo”, “next week”, “after lunch”) into concrete time windows.
	3.	Check real availability across all connected calendars.
	4.	Respect user preferences (work hours, buffer times, max meetings, time zone).
	5.	Generate clear, natural language proposals and confirmations.
	6.	Create/update/cancel events without conflicts.
	7.	Avoid dumb mistakes: double bookings, wrong time zone, too many meetings, weird times (like 2 am).

⸻

2. Core Concepts & Data Structures

2.1 Availability Model

We maintain a per-user Availability Profile:

type AvailabilityProfile = {
  timezone: string;            // e.g. "Australia/Brisbane"
  workDays: number[];          // 1-5 for Mon–Fri
  workHours: { start: string; end: string }; // "08:30"–"17:00"
  minBufferMinutes: number;    // e.g. 15
  minMeetingLengthMinutes: number; // default 30
  maxMeetingLengthMinutes: number; // default 90
  maxMeetingsPerDay: number;      // e.g. 6
  noMeetingBlocks: TimeBlock[];   // user-defined "do not schedule"
};

type TimeBlock = {
  start: DateTime;   // in user's timezone
  end: DateTime;
  reason?: string;
};

2.2 Unified Event Model

Events from any calendar are normalised to:

type CalendarEvent = {
  id: string;
  provider: "google" | "outlook" | "caldav";
  calendarConnectionId: string;
  title: string;
  start: DateTime;     // with timezone
  end: DateTime;
  isAllDay: boolean;
  status: "busy" | "free" | "tentative";
  attendees: Attendee[];
  sourceRaw?: any;
};

type Attendee = {
  email: string;
  name?: string;
  responseStatus?: "accepted" | "declined" | "tentative" | "none";
};

For availability purposes, any event where status !== free is considered blocked.

2.3 Scheduling Intent Model

When a new message arrives:

type SchedulingIntent = {
  isScheduling: boolean;
  intentType: "request_meeting" | "propose_times" | "confirm_time" | "reschedule" | "cancel" | "none";
  requestedWindows: TimeWindow[];    // what the other person suggested or vaguely referred to
  durationMinutes?: number;
  topic?: string;
  requiresClarification: boolean;
};

type TimeWindow = {
  start?: DateTime;    // may be partial or approximate
  end?: DateTime;
  dayReference?: "today" | "tomorrow" | "this_week" | "next_week" | "specific_date";
  originalText?: string;
};


⸻

3. End-to-End Scheduling Pipeline

3.1 High-Level Flow
	1.	Message received → SchedulingIntentDetector called.
	2.	If isScheduling === false → no further scheduling.
	3.	If true:
	•	Fetch user’s AvailabilityProfile.
	•	Query connected calendars for relevant period (e.g., next 14 days).
	•	Build BusyBlocks and FreeBlocks.
	•	Find candidate slots matching any requested windows.
	•	Ask AI to generate:
	•	Proposed times reply, OR
	•	Clarification request, OR
	•	Confirmation reply + event creation.

⸻

4. Step 1 – Detect Scheduling Intent

Handled by AI using the “Identify Scheduling Intent” prompt (already defined in your Prompt Library).

Key rules:
	•	If message contains explicit date/time expressions:
	•	“Thursday at 2pm”, “31st May at 10am”, “next Wednesday morning”
	•	Or contains phrases like:
	•	“Can we book a call”, “schedule a meeting”, “catch up”, “zoom call”, “chat some time”
	•	Then isScheduling = true.

Edge cases:
	•	“I will call you tomorrow” → no meeting to schedule.
	•	“We should meet sometime” (no timeframe) → requiresClarification = true.

⸻

5. Step 2 – Build Availability

5.1 Fetch Events

For each connected calendar:
	•	Query events in the candidate time range:
	•	Typically: now → now + 14 days for generic scheduling.
	•	Or narrower if user preference.
	•	Normalise to CalendarEvent objects.

5.2 Merge Calendars into Busy Blocks

Create unified list of BusyBlocks:

type BusyBlock = {
  start: DateTime;
  end: DateTime;
  sourceEventIds: string[];
};

Algorithm:
	1.	Collect all events with status != "free".
	2.	Normalize into blocks [start, end].
	3.	Sort by start time.
	4.	Merge overlapping or adjacent blocks (<= bufferMinutes apart).

5.3 Derive Free Blocks within Work Hours

For each day in search range:
	1.	Start with the day’s work-block: workHours (if it’s a workDay).
	2.	Subtract BusyBlocks and noMeetingBlocks.
	3.	Insert buffers before/after BusyBlocks as “pseudo-busy”.

Result: list of potential FreeBlocks:

type FreeBlock = {
  start: DateTime;
  end: DateTime;
};


⸻

6. Step 3 – Translate Human Language to Target Windows

6.1 Text → TimeWindow mapping

Examples:
	•	“Thursday afternoon”:
	•	Day: next upcoming Thursday.
	•	Time: 13:00–17:00 (configurable “afternoon window”).
	•	“Friday morning”:
	•	09:00–12:00.
	•	“Tomorrow”:
	•	The next calendar date in user’s timezone, workHours span.

Rules:
	•	All relative references (“tomorrow”, “next week”, “this Thursday”) are resolved using user timezone and current date.
	•	Where no specific time is given, default to:
	•	“Sometime on [day]” → workHours for that day.
	•	If user’s AvailabilityProfile restricts hours further, intersect.

6.2 Multiple Window Support

If message:

“Sometime Thursday afternoon or Friday morning”

We create two TimeWindows:
	•	Thursday 13:00–17:00
	•	Friday 09:00–12:00

⸻

7. Step 4 – Find Candidate Meeting Slots

Given:
	•	Duration (default to 30 mins if undefined).
	•	FreeBlocks within relevant days.
	•	Optionally requestedWindows.

7.1 Basic Slotting Algorithm

For each FreeBlock:
	1.	Set cursor = block.start.
	2.	While cursor + duration <= block.end:
	•	Check:
	•	Not violating maxMeetingsPerDay.
	•	Not near end of day except allowed.
	•	If valid, candidate slot = [cursor, cursor + duration].
	•	Move cursor by duration (or smaller step, e.g., 15 mins).

7.2 Honor Requested Windows

If requestedWindows present:
	•	Only consider FreeBlocks that fall within requested windows.
	•	If no slot fits, we:
	•	Option 1: Expand slightly (e.g. ±1 hour).
	•	Option 2: Defer to AI to ask for an alternative (“I’m fully booked then, but…”).

7.3 Limit Proposed Options

To avoid overwhelming the recipient:
	•	Default: propose 2–4 time options.
	•	Prioritise:
	•	Soonest times that still respect buffers.
	•	Spread across days if possible (e.g., “tomorrow at 3pm or Friday at 10am”).

⸻

8. Step 5 – Generate Human Reply

We use an AI prompt that:
	•	Takes:
	•	Candidate slots.
	•	User timezone.
	•	Intent context (what they asked for).
	•	Returns natural language like:

“Thanks for reaching out!
I’m free on Thursday between 2:00–2:30pm and 4:00–4:30pm, or on Friday between 9:00–9:30am (AEST).
Let me know which works best and I’ll send through a calendar invite.”

Rules:
	•	Always include the timezone label (e.g., AEST).
	•	Use clear formatting of day + time:
	•	“Thursday 21st at 2:30pm”
	•	Keep under ~150 tokens.

⸻

9. Handling Confirmations

When the other person replies picking a time:
	1.	Parse the chosen time:
	•	“Thursday at 2:30pm works for me” → DateTime.
	2.	Check again for fresh conflicts:
	•	Another event added since we proposed.
	3.	If free:
	•	Create event on calendar(s).
	•	Title: use either:
	•	Detected topic (e.g. “Loan options call with John”) or
	•	Template: “Call with {{CONTACT_NAME}}”.
	•	Duration: previously assumed or user default.
	4.	Send confirmation reply:
	•	“Great! I’ve sent a calendar invite for Thursday 21st at 2:30–3:00pm AEST. Looking forward to it.”

If not free anymore (conflict introduced):
	•	Suggest alternative:
	•	“Sorry, something came up at that time. I’m free at 3:00–3:30pm instead – would that work?”

⸻

10. Rescheduling Logic

10.1 Detect Reschedule Intent

Examples:
	•	“Can we move our call to next week?”
	•	“I won’t be available at 2pm anymore – can we do later in the day?”

Steps:
	1.	Identify existing event:
	•	From subject / thread mapping / meeting ID included in message.
	2.	Determine whether:
	•	New specific slot is proposed, or
	•	New vague window (“later this week”).

10.2 Reschedule Flow
	•	If new specific time proposed:
	1.	Check availability at new time.
	2.	If free:
	•	Update event in calendar.
	•	Send confirmation message.
	3.	If conflict:
	•	Offer alternatives like normal scheduling.
	•	If vague window:
	•	Treat like new scheduling request, but with existing event context:
	•	Cancel or leave tentative until new time agreed.
	•	AI reply: propose 2–3 options.

10.3 Cancel Flow

If message intent is cancellation:
	•	AI asks user to confirm (unless auto-cancel allowed for specific scenarios).
	•	On confirmation:
	•	Cancel event via provider API.
	•	Send polite cancellation note.

⸻

11. Multi-Timezone Handling

11.1 User vs Counterparty Time Zones
	•	Aiva always stores times in user’s timezone and UTC.
	•	When talking to counterparties:
	•	If their timezone is known (e.g., from CRM/contact data), convert times into their timezone.
	•	Otherwise, explicitly mention timezone of the proposed times:
	•	“All times are in AEST (Brisbane time).”

11.2 When Counterparty Provides Their Time Zone

Example:

“I’m in PST, could you do 3pm on Thursday?”

	•	Parse: Thursday 3pm in PST.
	•	Convert to user’s timezone.
	•	Check if fits availability.

Rule:
Always ensure we have at least one timezone tag present in human-facing text to avoid confusion.

⸻

12. Constraints & Preferences

12.1 Meeting Limits
	•	maxMeetingsPerDay:
	•	Once reached, no more proposals except:
	•	If user explicitly forces override.
	•	Buffer enforcement:
	•	No meeting within minBufferMinutes of an existing event’s start or end.

12.2 “Focus” / “No Meetings” Blocks

User-defined or event-labeled as “focus”:
	•	Do not schedule over these unless:
	•	User explicitly overrides via UI.

⸻

13. When to Ask for Clarification

Aiva should not guess in these cases:
	•	Duration unclear and important (e.g., “whole afternoon?”).
	•	Day ambiguous (“next Friday” near month boundary).
	•	Multiple people involved and attendees unclear.
	•	User availability fully booked in requested window.

AI should generate one of:
	•	“I’m pretty booked then – would you be open to [alternative window suggestions]?”
	•	“Do you prefer a 30-minute or 60-minute call?”
	•	“Are you referring to this Friday (the 23rd) or next Friday (the 30th)?”

⸻

14. Auto-Scheduling vs Human-Review

Modes:
	1.	Suggest-only
	•	Aiva drafts scheduling replies; user must approve.
	2.	Auto-schedule simple cases
	•	If:
	•	Contact is known & low-risk.
	•	Meeting type is short, standard (e.g. “catch up call”, “quick check-in”).
	•	Time chosen is clearly free.
	•	Then:
	•	Aiva can send proposals or accept a proposed time and create event automatically.

All auto-scheduled actions are logged:

SchedulingActionLog {
  id,
  user_id,
  type: "proposal" | "acceptance" | "reschedule" | "cancel",
  contextMessageId,
  eventId,
  confidenceScore,
  createdAt
}


⸻

15. Edge Cases
	1.	All-day events or out-of-office
	•	Treat as fully blocked if “OOO” or status = busy.
	2.	Double-booking allowed?
	•	Default: no double bookings.
	•	Advanced setting: allow double-book on “tentative” events.
	3.	Overlapping calendars
	•	If multiple calendars (work + personal):
	•	All busy blocks are merged.
	4.	User manually edits event outside Aiva
	•	Next calendar sync detects changes.
	•	If conflicting with ongoing scheduling thread:
	•	Aiva avoids confirming old proposals.

⸻

16. Monitoring & Metrics

Track:
	•	of scheduling intents detected per day.
	•	of proposals generated.
	•	of successfully booked meetings.
	•	of reschedules.
	•	of user overrides (indicates frustration).
	•	Complaints: “Wrong time zone”, “double booked me” – should be near zero.
