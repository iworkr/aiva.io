/**
 * Auto-Send Queue Worker
 * Manages queueing and scheduling of auto-send messages
 */

import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

export interface AutoSendSettings {
  autoSendEnabled: boolean;
  autoSendDelayType: 'exact' | 'random';
  autoSendDelayMin: number;
  autoSendDelayMax: number;
  autoSendConfidenceThreshold: number;
  autoSendTimeStart: string;
  autoSendTimeEnd: string;
  autoSendPaused: boolean;
}

export interface QueueAutoSendResult {
  queued: boolean;
  scheduledAt?: Date;
  reason?: string;
}

/**
 * Calculate the scheduled send time based on delay settings
 */
function calculateScheduledTime(settings: AutoSendSettings): Date {
  const now = new Date();
  let delayMinutes: number;

  if (settings.autoSendDelayType === 'exact') {
    delayMinutes = settings.autoSendDelayMin;
  } else {
    // Random delay between min and max
    const range = settings.autoSendDelayMax - settings.autoSendDelayMin;
    delayMinutes = settings.autoSendDelayMin + Math.floor(Math.random() * (range + 1));
  }

  const scheduledAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
  return scheduledAt;
}

/**
 * Check if a time is within the allowed sending window
 */
function isWithinSendingWindow(
  time: Date,
  startTime: string,
  endTime: string,
  timezone?: string
): boolean {
  // Get hours and minutes from the time in the specified timezone
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone || 'UTC',
  };
  const timeString = time.toLocaleTimeString('en-US', options);
  
  // Parse times as minutes since midnight for comparison
  const toMinutes = (t: string) => {
    const [hours, mins] = t.split(':').map(Number);
    return hours * 60 + mins;
  };

  const currentMinutes = toMinutes(timeString);
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  // Handle overnight windows (e.g., 22:00 - 06:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Adjust scheduled time to fit within the sending window
 */
function adjustToSendingWindow(
  scheduledAt: Date,
  startTime: string,
  endTime: string,
  timezone?: string
): Date {
  if (isWithinSendingWindow(scheduledAt, startTime, endTime, timezone)) {
    return scheduledAt;
  }

  // Move to the next valid sending window
  const adjusted = new Date(scheduledAt);
  const [startHour, startMin] = startTime.split(':').map(Number);

  // Set to start time today
  adjusted.setHours(startHour, startMin, 0, 0);

  // If that's in the past or outside window, move to next day
  if (adjusted <= scheduledAt) {
    adjusted.setDate(adjusted.getDate() + 1);
  }

  return adjusted;
}

/**
 * Get workspace auto-send settings
 */
export async function getWorkspaceAutoSendSettings(workspaceId: string): Promise<AutoSendSettings | null> {
  const supabase = supabaseAdminClient;

  const { data, error } = await supabase
    .from('workspace_settings')
    .select(`
      auto_send_enabled,
      auto_send_delay_type,
      auto_send_delay_min,
      auto_send_delay_max,
      auto_send_confidence_threshold,
      auto_send_time_start,
      auto_send_time_end,
      auto_send_paused
    `)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    autoSendEnabled: data.auto_send_enabled ?? false,
    autoSendDelayType: (data.auto_send_delay_type ?? 'random') as 'exact' | 'random',
    autoSendDelayMin: data.auto_send_delay_min ?? 10,
    autoSendDelayMax: data.auto_send_delay_max ?? 30,
    autoSendConfidenceThreshold: data.auto_send_confidence_threshold ?? 0.85,
    autoSendTimeStart: data.auto_send_time_start ?? '09:00',
    autoSendTimeEnd: data.auto_send_time_end ?? '21:00',
    autoSendPaused: data.auto_send_paused ?? false,
  };
}

/**
 * Queue an auto-send message after draft generation
 */
export async function queueAutoSend(
  workspaceId: string,
  messageId: string,
  draftId: string,
  connectionId: string,
  confidenceScore: number
): Promise<QueueAutoSendResult> {
  const supabase = supabaseAdminClient;

  // Get workspace settings
  const settings = await getWorkspaceAutoSendSettings(workspaceId);

  if (!settings) {
    return { queued: false, reason: 'Settings not found' };
  }

  // Check if auto-send is enabled and not paused
  if (!settings.autoSendEnabled) {
    return { queued: false, reason: 'Auto-send disabled' };
  }

  if (settings.autoSendPaused) {
    return { queued: false, reason: 'Auto-send paused' };
  }

  // Check confidence threshold
  if (confidenceScore < settings.autoSendConfidenceThreshold) {
    // Log that it was skipped due to low confidence
    await supabase.from('auto_send_log').insert({
      workspace_id: workspaceId,
      message_id: messageId,
      draft_id: draftId,
      action: 'skipped',
      confidence_score: confidenceScore,
      skip_reason: `Confidence ${Math.round(confidenceScore * 100)}% below threshold ${Math.round(settings.autoSendConfidenceThreshold * 100)}%`,
    });

    return { 
      queued: false, 
      reason: `Confidence ${Math.round(confidenceScore * 100)}% below threshold ${Math.round(settings.autoSendConfidenceThreshold * 100)}%` 
    };
  }

  // Calculate scheduled send time
  let scheduledAt = calculateScheduledTime(settings);
  const delayMinutes = Math.round((scheduledAt.getTime() - Date.now()) / 60000);

  // Get workspace timezone (fallback to UTC)
  const { data: wsSettings } = await supabase
    .from('workspace_settings')
    .select('workspace_settings')
    .eq('workspace_id', workspaceId)
    .single();
  
  const timezone = (wsSettings?.workspace_settings as any)?.timezone || 'UTC';

  // Adjust to sending window if necessary
  scheduledAt = adjustToSendingWindow(
    scheduledAt,
    settings.autoSendTimeStart,
    settings.autoSendTimeEnd,
    timezone
  );

  // Insert into queue
  const { data: queueItem, error } = await supabase
    .from('auto_send_queue')
    .insert({
      workspace_id: workspaceId,
      message_id: messageId,
      draft_id: draftId,
      connection_id: connectionId,
      scheduled_send_at: scheduledAt.toISOString(),
      status: 'pending',
      confidence_score: confidenceScore,
      delay_minutes: delayMinutes,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to queue auto-send:', error);
    return { queued: false, reason: error.message };
  }

  // Log the queuing
  await supabase.from('auto_send_log').insert({
    workspace_id: workspaceId,
    message_id: messageId,
    draft_id: draftId,
    queue_id: queueItem.id,
    action: 'queued',
    confidence_score: confidenceScore,
    delay_used: delayMinutes,
    details: {
      scheduled_at: scheduledAt.toISOString(),
      delay_type: settings.autoSendDelayType,
    },
  });

  return { queued: true, scheduledAt };
}

/**
 * Check if a message is eligible for auto-send based on its properties
 */
export function isMessageAutoSendable(message: {
  is_auto_sendable?: boolean;
  actionability_score?: number;
  priority?: string;
  category?: string;
}): boolean {
  // Must be marked as auto-sendable by AI
  if (!message.is_auto_sendable) {
    return false;
  }

  // Skip high-priority messages
  if (message.priority === 'high' || message.priority === 'urgent') {
    return false;
  }

  // Skip personal or work-related categories (require human review)
  const skipCategories = ['personal', 'work', 'finance', 'security_alert', 'support'];
  if (message.category && skipCategories.includes(message.category)) {
    return false;
  }

  return true;
}

/**
 * Get pending items in the auto-send queue that are ready to be sent
 */
export async function getPendingAutoSends(limit = 50): Promise<any[]> {
  const supabase = supabaseAdminClient;

  const { data, error } = await supabase
    .from('auto_send_queue')
    .select(`
      *,
      message:messages(id, subject, sender_email, thread_id),
      draft:message_drafts(id, body, subject),
      connection:channel_connections(id, provider, credentials)
    `)
    .eq('status', 'pending')
    .lte('scheduled_send_at', new Date().toISOString())
    .lt('attempts', 3)
    .order('scheduled_send_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to get pending auto-sends:', error);
    return [];
  }

  return data || [];
}

/**
 * Update queue item status
 */
export async function updateQueueItemStatus(
  queueId: string,
  status: 'processing' | 'sent' | 'failed' | 'cancelled',
  details?: {
    errorMessage?: string;
    sentMessageId?: string;
  }
): Promise<void> {
  const supabase = supabaseAdminClient;

  const update: Record<string, any> = {
    status,
    last_attempt_at: new Date().toISOString(),
    attempts: details?.errorMessage ? { increment: 1 } : undefined,
  };

  if (status === 'sent') {
    update.sent_at = new Date().toISOString();
    if (details?.sentMessageId) {
      update.sent_message_id = details.sentMessageId;
    }
  }

  if (details?.errorMessage) {
    update.error_message = details.errorMessage;
  }

  // Use a direct update instead of increment for attempts
  const { data: current } = await supabase
    .from('auto_send_queue')
    .select('attempts')
    .eq('id', queueId)
    .single();

  if (details?.errorMessage && current) {
    update.attempts = (current.attempts || 0) + 1;
  }

  await supabase
    .from('auto_send_queue')
    .update(update)
    .eq('id', queueId);
}

