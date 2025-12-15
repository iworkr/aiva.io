/**
 * Calendar Verification System
 * Checks calendar for matching events when scheduling confirmations are detected
 */

'use server';

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { OpenAI } from 'openai';
import { addDays, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';

// Lazy-load OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[Calendar Verifier] OPENAI_API_KEY not configured');
      return null;
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: Array<{ email: string; name?: string }>;
  location?: string;
}

export interface CalendarVerificationResult {
  hasMatchingEvent: boolean;
  matchedEvent?: CalendarEvent;
  possibleMatches: CalendarEvent[];
  suggestedAction: 'confirm' | 'decline' | 'ask_human' | 'no_calendar';
  context: string;
  searchedDateRange: {
    start: string;
    end: string;
  };
  confidence: number;
}

interface DateTimeExtraction {
  hasDateTime: boolean;
  dateReferences: string[];  // Raw text like "Thursday", "next week"
  parsedDates: string[];     // ISO date strings
  timeReferences: string[];  // Raw text like "3pm", "lunch"
  confidence: number;
}

/**
 * Extract date/time references from message using AI
 */
async function extractDateTimeReferences(
  subject: string,
  body: string
): Promise<DateTimeExtraction> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    return {
      hasDateTime: false,
      dateReferences: [],
      parsedDates: [],
      timeReferences: [],
      confidence: 0,
    };
  }

  const today = new Date();
  const prompt = `Extract date and time references from this message.

Today is: ${today.toISOString().split('T')[0]} (${today.toLocaleDateString('en-US', { weekday: 'long' })})

Subject: ${subject || '(no subject)'}
Body: ${body?.substring(0, 500) || ''}

Extract:
1. Date references (e.g., "Thursday", "next week", "tomorrow", "the 15th")
2. Time references (e.g., "3pm", "lunch", "morning", "after work")
3. Parse relative dates to ISO format based on today's date

Respond with JSON:
{
  "hasDateTime": true/false,
  "dateReferences": ["raw date text found"],
  "parsedDates": ["YYYY-MM-DD ISO dates"],
  "timeReferences": ["raw time text found"],
  "confidence": 0.0-1.0
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting date and time references from text. Be accurate and include all relevant references.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      hasDateTime: result.hasDateTime || false,
      dateReferences: result.dateReferences || [],
      parsedDates: result.parsedDates || [],
      timeReferences: result.timeReferences || [],
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error('[Calendar Verifier] Date extraction error:', error);
    return {
      hasDateTime: false,
      dateReferences: [],
      parsedDates: [],
      timeReferences: [],
      confidence: 0,
    };
  }
}

/**
 * Get calendar events for a workspace within a date range
 */
async function getCalendarEvents(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  options: { useAdminClient?: boolean } = {}
): Promise<CalendarEvent[]> {
  const supabase = options.useAdminClient 
    ? supabaseAdminClient 
    : await createSupabaseUserServerActionClient();

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description, start_time, end_time, attendees, location')
    .eq('workspace_id', workspaceId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[Calendar Verifier] Error fetching events:', error);
    return [];
  }

  return (events || []).map(e => ({
    id: e.id,
    title: e.title || '',
    description: e.description || undefined,
    startTime: e.start_time,
    endTime: e.end_time,
    attendees: (e.attendees as any[])?.map(a => ({ 
      email: a.email || '', 
      name: a.name 
    })) || [],
    location: e.location || undefined,
  }));
}

/**
 * Check if an event matches the sender (by email or name)
 */
function eventMatchesSender(
  event: CalendarEvent,
  senderEmail: string,
  senderName?: string
): { matches: boolean; confidence: number } {
  const senderEmailLower = senderEmail.toLowerCase();
  const senderNameLower = (senderName || '').toLowerCase();
  const titleLower = event.title.toLowerCase();
  const descLower = (event.description || '').toLowerCase();

  // Check attendees
  const attendeeMatch = event.attendees?.some(
    a => a.email.toLowerCase() === senderEmailLower ||
         (a.name && a.name.toLowerCase().includes(senderNameLower))
  );

  if (attendeeMatch) {
    return { matches: true, confidence: 0.95 };
  }

  // Check if sender's name is in title or description
  if (senderNameLower && senderNameLower.length > 2) {
    const nameParts = senderNameLower.split(' ').filter(p => p.length > 2);
    const nameInTitle = nameParts.some(part => titleLower.includes(part));
    const nameInDesc = nameParts.some(part => descLower.includes(part));
    
    if (nameInTitle) {
      return { matches: true, confidence: 0.80 };
    }
    if (nameInDesc) {
      return { matches: true, confidence: 0.60 };
    }
  }

  // Check if sender email domain matches something in the event
  const senderDomain = senderEmailLower.split('@')[1];
  if (senderDomain && (titleLower.includes(senderDomain) || descLower.includes(senderDomain))) {
    return { matches: true, confidence: 0.50 };
  }

  return { matches: false, confidence: 0 };
}

/**
 * Check if event matches time references
 */
function eventMatchesTimeReferences(
  event: CalendarEvent,
  timeReferences: string[]
): { matches: boolean; confidence: number } {
  if (timeReferences.length === 0) {
    return { matches: true, confidence: 0.5 }; // No specific time mentioned
  }

  const eventStart = new Date(event.startTime);
  const hour = eventStart.getHours();

  for (const ref of timeReferences) {
    const refLower = ref.toLowerCase();
    
    // Check meal times
    if (refLower.includes('lunch') && hour >= 11 && hour <= 14) {
      return { matches: true, confidence: 0.85 };
    }
    if (refLower.includes('breakfast') && hour >= 7 && hour <= 10) {
      return { matches: true, confidence: 0.85 };
    }
    if (refLower.includes('dinner') && hour >= 17 && hour <= 21) {
      return { matches: true, confidence: 0.85 };
    }
    
    // Check time of day
    if (refLower.includes('morning') && hour >= 6 && hour <= 12) {
      return { matches: true, confidence: 0.70 };
    }
    if (refLower.includes('afternoon') && hour >= 12 && hour <= 17) {
      return { matches: true, confidence: 0.70 };
    }
    if (refLower.includes('evening') && hour >= 17 && hour <= 21) {
      return { matches: true, confidence: 0.70 };
    }

    // Check specific times (e.g., "3pm", "15:00")
    const timeMatch = refLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let matchHour = parseInt(timeMatch[1]);
      const matchMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm === 'pm' && matchHour < 12) matchHour += 12;
      if (ampm === 'am' && matchHour === 12) matchHour = 0;
      
      const eventMinute = eventStart.getMinutes();
      if (hour === matchHour && Math.abs(eventMinute - matchMinute) <= 30) {
        return { matches: true, confidence: 0.90 };
      }
    }
  }

  return { matches: false, confidence: 0 };
}

/**
 * Main verification function: Check if a scheduling confirmation has a matching calendar event
 */
export async function verifySchedulingConfirmation(
  messageId: string,
  workspaceId: string,
  senderEmail: string,
  senderName?: string,
  options: { useAdminClient?: boolean } = {}
): Promise<CalendarVerificationResult> {
  const supabase = options.useAdminClient 
    ? supabaseAdminClient 
    : await createSupabaseUserServerActionClient();

  // Get the message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .select('subject, body')
    .eq('id', messageId)
    .single();

  if (msgError || !message) {
    return {
      hasMatchingEvent: false,
      possibleMatches: [],
      suggestedAction: 'ask_human',
      context: 'Could not retrieve message for calendar verification',
      searchedDateRange: { start: '', end: '' },
      confidence: 0,
    };
  }

  // Check if workspace has any calendar connections
  const { data: calendarConnections } = await supabase
    .from('calendar_connections')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .limit(1);

  if (!calendarConnections || calendarConnections.length === 0) {
    return {
      hasMatchingEvent: false,
      possibleMatches: [],
      suggestedAction: 'no_calendar',
      context: 'No calendar connected. Cannot verify scheduling confirmation.',
      searchedDateRange: { start: '', end: '' },
      confidence: 0,
    };
  }

  // Extract date/time references from the message
  const dateTimeInfo = await extractDateTimeReferences(
    message.subject || '',
    message.body || ''
  );

  if (!dateTimeInfo.hasDateTime && dateTimeInfo.parsedDates.length === 0) {
    // No specific dates mentioned, search next 7 days
    const startDate = startOfDay(new Date());
    const endDate = endOfDay(addDays(new Date(), 7));

    const events = await getCalendarEvents(workspaceId, startDate, endDate, options);

    // Look for any event with the sender
    const matchingEvents = events.filter(e => {
      const { matches } = eventMatchesSender(e, senderEmail, senderName);
      return matches;
    });

    if (matchingEvents.length === 0) {
      return {
        hasMatchingEvent: false,
        possibleMatches: events.slice(0, 5),
        suggestedAction: 'ask_human',
        context: `No events found with ${senderName || senderEmail} in the next 7 days. Human should verify if plans exist.`,
        searchedDateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
        confidence: 0.3,
      };
    }

    return {
      hasMatchingEvent: true,
      matchedEvent: matchingEvents[0],
      possibleMatches: matchingEvents,
      suggestedAction: 'confirm',
      context: `Found ${matchingEvents.length} event(s) with ${senderName || senderEmail}`,
      searchedDateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      confidence: 0.75,
    };
  }

  // Search around the parsed dates
  let searchStart = startOfDay(new Date());
  let searchEnd = endOfDay(addDays(new Date(), 14));

  if (dateTimeInfo.parsedDates.length > 0) {
    try {
      const firstDate = parseISO(dateTimeInfo.parsedDates[0]);
      searchStart = startOfDay(addDays(firstDate, -1)); // Day before
      searchEnd = endOfDay(addDays(firstDate, 1)); // Day after
    } catch {
      // Use default range
    }
  }

  const events = await getCalendarEvents(workspaceId, searchStart, searchEnd, options);

  // Score each event
  const scoredEvents = events.map(event => {
    const senderMatch = eventMatchesSender(event, senderEmail, senderName);
    const timeMatch = eventMatchesTimeReferences(event, dateTimeInfo.timeReferences);
    
    // Combined score
    let score = 0;
    if (senderMatch.matches) score += senderMatch.confidence * 0.6;
    if (timeMatch.matches) score += timeMatch.confidence * 0.4;

    return { event, score, senderMatch, timeMatch };
  });

  // Sort by score and get best match
  scoredEvents.sort((a, b) => b.score - a.score);

  const bestMatch = scoredEvents[0];
  const threshold = 0.5;

  if (bestMatch && bestMatch.score >= threshold) {
    return {
      hasMatchingEvent: true,
      matchedEvent: bestMatch.event,
      possibleMatches: scoredEvents.filter(s => s.score >= 0.3).map(s => s.event),
      suggestedAction: bestMatch.score >= 0.7 ? 'confirm' : 'ask_human',
      context: `Found likely match: "${bestMatch.event.title}" on ${new Date(bestMatch.event.startTime).toLocaleDateString()}. Confidence: ${Math.round(bestMatch.score * 100)}%`,
      searchedDateRange: { start: searchStart.toISOString(), end: searchEnd.toISOString() },
      confidence: bestMatch.score,
    };
  }

  return {
    hasMatchingEvent: false,
    possibleMatches: scoredEvents.slice(0, 5).map(s => s.event),
    suggestedAction: 'ask_human',
    context: `No matching event found for "${dateTimeInfo.dateReferences.join(', ')}" with ${senderName || senderEmail}. Human should verify.`,
    searchedDateRange: { start: searchStart.toISOString(), end: searchEnd.toISOString() },
    confidence: 0.2,
  };
}

/**
 * Quick check if a message is asking to confirm an existing plan
 * (lighter weight than full verification)
 */
export async function isSchedulingConfirmation(
  subject: string,
  body: string
): Promise<{ isConfirmation: boolean; confidence: number }> {
  const text = `${subject} ${body}`.toLowerCase();

  // Phrases that indicate confirmation request
  const confirmationPhrases = [
    'are we still on',
    'still on for',
    'can you confirm',
    'confirming our',
    'just checking',
    'wanted to confirm',
    'still happening',
    'still meeting',
    'still good for',
    'looking forward to our',
    'see you at',
    'see you on',
  ];

  for (const phrase of confirmationPhrases) {
    if (text.includes(phrase)) {
      return { isConfirmation: true, confidence: 0.85 };
    }
  }

  // Check for question about existing plans
  const questionPatterns = [
    /we (still )?meeting/i,
    /our (meeting|call|lunch|dinner|appointment)/i,
    /you (still )?available/i,
    /does .* still work/i,
  ];

  for (const pattern of questionPatterns) {
    if (pattern.test(text)) {
      return { isConfirmation: true, confidence: 0.70 };
    }
  }

  return { isConfirmation: false, confidence: 0 };
}

