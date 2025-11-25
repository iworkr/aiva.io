/**
 * Aiva.io Zod Validation Schemas
 * Type-safe validation for channel connections, messages, and AI features
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const ChannelProviderSchema = z.enum([
  'gmail',
  'outlook',
  'slack',
  'teams',
  'whatsapp',
  'instagram',
  'facebook_messenger',
  'linkedin',
]);

export const ChannelConnectionStatusSchema = z.enum([
  'active',
  'inactive',
  'error',
  'token_expired',
  'revoked',
]);

export const MessagePrioritySchema = z.enum(['high', 'medium', 'low', 'noise']);

export const MessageCategorySchema = z.enum([
  'sales_lead',
  'client_support',
  'internal',
  'social',
  'marketing',
  'personal',
  'other',
]);

export const MessageSentimentSchema = z.enum([
  'neutral',
  'positive',
  'negative',
  'urgent',
]);

export const MessageStatusSchema = z.enum([
  'unread',
  'read',
  'action_required',
  'waiting_on_others',
  'done',
  'archived',
]);

export const MessageActionabilitySchema = z.enum([
  'question',
  'request',
  'fyi',
  'scheduling_intent',
  'task',
  'none',
]);

export const CalendarProviderSchema = z.enum([
  'aiva',
  'google_calendar',
  'outlook_calendar',
  'apple_calendar',
]);

export const TaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const TaskPrioritySchema = z.enum(['high', 'medium', 'low']);

export const AIActionTypeSchema = z.enum([
  'classification',
  'summarization',
  'reply_draft',
  'auto_send',
  'task_extraction',
  'scheduling_detection',
  'sentiment_analysis',
]);

// ============================================================================
// CHANNEL CONNECTION SCHEMAS
// ============================================================================

export const createChannelConnectionSchema = z.object({
  workspaceId: z.string().uuid(),
  provider: ChannelProviderSchema,
  providerAccountId: z.string().min(1),
  providerAccountName: z.string().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

export const updateChannelConnectionSchema = z.object({
  id: z.string().uuid(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  status: ChannelConnectionStatusSchema.optional(),
  lastSyncAt: z.string().datetime().optional(),
  syncCursor: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const disconnectChannelSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const messageRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  type: z.enum(['to', 'cc', 'bcc']),
});

export const messageAttachmentSchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
  type: z.string(),
  size: z.number(),
});

export const createMessageSchema = z.object({
  workspaceId: z.string().uuid(),
  channelConnectionId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  providerMessageId: z.string().min(1),
  providerThreadId: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  bodyHtml: z.string().optional(),
  snippet: z.string().optional(),
  senderEmail: z.string().email(),
  senderName: z.string().optional(),
  recipients: z.array(messageRecipientSchema).default([]),
  timestamp: z.string().datetime(),
  labels: z.array(z.string()).default([]),
  attachments: z.array(messageAttachmentSchema).default([]),
  rawData: z.record(z.any()).default({}),
});

export const updateMessageSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  status: MessageStatusSchema.optional(),
  priority: MessagePrioritySchema.optional(),
  category: MessageCategorySchema.optional(),
  sentiment: MessageSentimentSchema.optional(),
  actionability: MessageActionabilitySchema.optional(),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  hasDraftReply: z.boolean().optional(),
});

export const getMessagesSchema = z.object({
  workspaceId: z.string().uuid(),
  channelConnectionId: z.string().uuid().optional(),
  status: MessageStatusSchema.optional(),
  priority: MessagePrioritySchema.optional(),
  category: MessageCategorySchema.optional(),
  isRead: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  orderBy: z.enum(['timestamp', 'priority']).default('timestamp'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// THREAD SCHEMAS
// ============================================================================

export const threadParticipantSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export const createThreadSchema = z.object({
  workspaceId: z.string().uuid(),
  primarySubject: z.string().min(1),
  participants: z.array(threadParticipantSchema).default([]),
  channels: z.array(z.string()).default([]),
});

export const updateThreadSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  summary: z.string().optional(),
  isArchived: z.boolean().optional(),
});

// ============================================================================
// CALENDAR CONNECTION SCHEMAS
// ============================================================================

export const createCalendarConnectionSchema = z.object({
  workspaceId: z.string().uuid(),
  provider: CalendarProviderSchema,
  providerAccountId: z.string().min(1),
  providerAccountEmail: z.string().email().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

export const updateCalendarConnectionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  status: ChannelConnectionStatusSchema.optional(),
  lastSyncAt: z.string().datetime().optional(),
  syncCursor: z.string().optional(),
});

// ============================================================================
// EVENT SCHEMAS
// ============================================================================

export const eventAttendeeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  responseStatus: z.enum(['accepted', 'declined', 'tentative', 'needsAction']).optional(),
});

export const eventOrganizerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export const createEventSchema = z.object({
  workspaceId: z.string().uuid(),
  calendarConnectionId: z.string().uuid(),
  providerEventId: z.string().min(1),
  providerCalendarId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().default('UTC'),
  isAllDay: z.boolean().default(false),
  organizer: eventOrganizerSchema.optional(),
  attendees: z.array(eventAttendeeSchema).default([]),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).default('confirmed'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  conferenceData: z.record(z.any()).optional(),
  visibility: z.enum(['default', 'public', 'private']).default('default'),
  createdFromMessageId: z.string().uuid().optional(),
  rawData: z.record(z.any()).default({}),
});

export const updateEventSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  isAllDay: z.boolean().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  visibility: z.enum(['default', 'public', 'private']).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().nullable().optional(),
  conferenceData: z.record(z.any()).nullable().optional(),
  attendees: z.array(eventAttendeeSchema).optional(),
  organizer: eventOrganizerSchema.nullable().optional(),
});

export const getEventsSchema = z.object({
  workspaceId: z.string().uuid(),
  calendarConnectionId: z.string().uuid().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(50),
});

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const createTaskSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  sourceMessageId: z.string().uuid().optional(),
  extractedByAi: z.boolean().default(false),
  priority: TaskPrioritySchema.default('medium'),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: TaskPrioritySchema.optional(),
  status: TaskStatusSchema.optional(),
  dueDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  assignedTo: z.string().uuid().optional(),
});

export const getTasksSchema = z.object({
  workspaceId: z.string().uuid(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignedTo: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// MESSAGE DRAFT SCHEMAS
// ============================================================================

export const createMessageDraftSchema = z.object({
  workspaceId: z.string().uuid(),
  messageId: z.string().uuid(),
  body: z.string().min(1),
  bodyHtml: z.string().optional(),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional']).optional(),
  generatedByAi: z.boolean().default(false),
  confidenceScore: z.number().min(0).max(1).optional(),
});

export const updateMessageDraftSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  body: z.string().min(1).optional(),
  bodyHtml: z.string().optional(),
  editedByUser: z.boolean().optional(),
  isAutoSendable: z.boolean().optional(),
  autoSent: z.boolean().optional(),
  autoSentAt: z.string().datetime().optional(),
});

// ============================================================================
// AI ACTION SCHEMAS
// ============================================================================

export const createAiActionLogSchema = z.object({
  workspaceId: z.string().uuid(),
  actionType: AIActionTypeSchema,
  inputRef: z.string().uuid().optional(),
  outputRef: z.string().uuid().optional(),
  modelUsed: z.string().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  totalTokens: z.number().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  inputData: z.record(z.any()).default({}),
  outputData: z.record(z.any()).default({}),
  success: z.boolean().default(true),
  errorMessage: z.string().optional(),
  processingTimeMs: z.number().optional(),
});

// ============================================================================
// AI OPERATIONS SCHEMAS
// ============================================================================

export const classifyMessageSchema = z.object({
  messageId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  forceReclassify: z.boolean().default(false),
});

export const generateReplyDraftSchema = z.object({
  messageId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional']).optional(),
  includeQuote: z.boolean().default(false),
  maxLength: z.number().min(50).max(2000).default(500),
});

export const extractTasksSchema = z.object({
  messageId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  autoCreate: z.boolean().default(false),
});

export const detectSchedulingIntentSchema = z.object({
  messageId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  autoCreateEvent: z.boolean().default(false),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Channel Connections
export type CreateChannelConnection = z.infer<typeof createChannelConnectionSchema>;
export type UpdateChannelConnection = z.infer<typeof updateChannelConnectionSchema>;
export type DisconnectChannel = z.infer<typeof disconnectChannelSchema>;
export type ChannelProvider = z.infer<typeof ChannelProviderSchema>;
export type ChannelConnectionStatus = z.infer<typeof ChannelConnectionStatusSchema>;

// Messages
export type CreateMessage = z.infer<typeof createMessageSchema>;
export type UpdateMessage = z.infer<typeof updateMessageSchema>;
export type GetMessages = z.infer<typeof getMessagesSchema>;
export type MessageRecipient = z.infer<typeof messageRecipientSchema>;
export type MessageAttachment = z.infer<typeof messageAttachmentSchema>;
export type MessagePriority = z.infer<typeof MessagePrioritySchema>;
export type MessageCategory = z.infer<typeof MessageCategorySchema>;
export type MessageSentiment = z.infer<typeof MessageSentimentSchema>;
export type MessageStatus = z.infer<typeof MessageStatusSchema>;
export type MessageActionability = z.infer<typeof MessageActionabilitySchema>;

// Threads
export type CreateThread = z.infer<typeof createThreadSchema>;
export type UpdateThread = z.infer<typeof updateThreadSchema>;
export type ThreadParticipant = z.infer<typeof threadParticipantSchema>;

// Calendar Connections
export type CreateCalendarConnection = z.infer<typeof createCalendarConnectionSchema>;
export type UpdateCalendarConnection = z.infer<typeof updateCalendarConnectionSchema>;
export type CalendarProvider = z.infer<typeof CalendarProviderSchema>;

// Events
export type CreateEvent = z.infer<typeof createEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;
export type GetEvents = z.infer<typeof getEventsSchema>;
export type EventAttendee = z.infer<typeof eventAttendeeSchema>;
export type EventOrganizer = z.infer<typeof eventOrganizerSchema>;

// Tasks
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type GetTasks = z.infer<typeof getTasksSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

// Message Drafts
export type CreateMessageDraft = z.infer<typeof createMessageDraftSchema>;
export type UpdateMessageDraft = z.infer<typeof updateMessageDraftSchema>;

// AI Actions
export type CreateAiActionLog = z.infer<typeof createAiActionLogSchema>;
export type AIActionType = z.infer<typeof AIActionTypeSchema>;

// AI Operations
export type ClassifyMessage = z.infer<typeof classifyMessageSchema>;
export type GenerateReplyDraft = z.infer<typeof generateReplyDraftSchema>;
export type ExtractTasks = z.infer<typeof extractTasksSchema>;
export type DetectSchedulingIntent = z.infer<typeof detectSchedulingIntentSchema>;

// ============================================================================
// CONTACTS SCHEMAS
// ============================================================================

/**
 * Contact Schema - Unified contact profile
 */
export const createContactSchema = z.object({
  workspaceId: z.string().uuid(),
  fullName: z.string().min(1, 'Full name is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  bio: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
});

export const updateContactSchema = createContactSchema.extend({
  id: z.string().uuid(),
}).partial().required({ id: true, workspaceId: true });

export const getContactsSchema = z.object({
  workspaceId: z.string().uuid(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

/**
 * Contact Channel Schema - Link contacts to communication channels
 */
export const createContactChannelSchema = z.object({
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  channelType: z.string().min(1, 'Channel type is required'), // 'instagram', 'whatsapp', 'email', etc.
  channelId: z.string().min(1, 'Channel ID is required'),
  channelDisplayName: z.string().optional(),
  isPrimary: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export const updateContactChannelSchema = createContactChannelSchema.extend({
  id: z.string().uuid(),
}).partial().required({ id: true, workspaceId: true });

export const linkChannelToContactSchema = z.object({
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  channelType: z.string().min(1),
  channelId: z.string().min(1),
  channelDisplayName: z.string().optional(),
});

// ============================================================================
// CONTACT TYPE EXPORTS
// ============================================================================

// Contacts
export type CreateContact = z.infer<typeof createContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;
export type GetContacts = z.infer<typeof getContactsSchema>;

// Contact Channels
export type CreateContactChannel = z.infer<typeof createContactChannelSchema>;
export type UpdateContactChannel = z.infer<typeof updateContactChannelSchema>;
export type LinkChannelToContact = z.infer<typeof linkChannelToContactSchema>;

