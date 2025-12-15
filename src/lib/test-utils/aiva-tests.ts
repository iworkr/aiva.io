/**
 * Aiva.io Backend Test Utilities
 * Tests for all API endpoints and server actions
 */

// @ts-nocheck
// TypeScript checking disabled for test utilities

'use server';

import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import {
  createChannelConnectionAction,
  getUserChannelConnections,
  disconnectChannelAction,
} from '@/data/user/channels';
import {
  createMessageAction,
  updateMessageAction,
  getMessagesAction,
  markMessageAsReadAction,
} from '@/data/user/messages';
import {
  classifyMessage,
  autoClassifyNewMessages,
} from '@/lib/ai/classifier';
import {
  generateReplyDraft,
  extractTasks,
  detectSchedulingIntent,
} from '@/lib/ai/reply-generator';
import { syncGmailMessages } from '@/lib/gmail/sync';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  data?: any;
  error?: any;
}

/**
 * Test Suite: Channel Management
 */
export async function testChannelManagement(
  workspaceId: string,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Create mock channel connection
  try {
    const connection = await createChannelConnectionAction({
      workspaceId,
      provider: 'gmail',
      providerAccountId: 'test@example.com',
      providerAccountName: 'Test User',
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      metadata: { test: true },
    });

    results.push({
      test: 'Create Channel Connection',
      passed: !!connection?.data,
      message: 'Successfully created channel connection',
      data: connection?.data,
    });

    // Test 2: Get channel connections
    const connections = await getUserChannelConnections(workspaceId, userId);
    results.push({
      test: 'Get Channel Connections',
      passed: connections.length > 0,
      message: `Found ${connections.length} connection(s)`,
      data: connections,
    });

    // Test 3: Disconnect channel
    if (connection?.data?.data) {
      const disconnect = await disconnectChannelAction({
        id: connection.data.data.id,
        workspaceId,
      });

      results.push({
        test: 'Disconnect Channel',
        passed: disconnect?.data?.success ?? false,
        message: (disconnect?.data as any)?.message || 'Channel disconnected',
      });
    }
  } catch (error) {
    results.push({
      test: 'Channel Management',
      passed: false,
      message: 'Test failed with error',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Test Suite: Message Management
 */
export async function testMessageManagement(
  workspaceId: string,
  channelConnectionId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Create message
  try {
    const message = await createMessageAction({
      workspaceId,
      channelConnectionId,
      providerMessageId: `test_${Date.now()}`,
      subject: 'Test Message',
      body: 'This is a test message for Aiva.io',
      senderEmail: 'sender@example.com',
      senderName: 'Test Sender',
      recipients: [
        {
          email: 'recipient@example.com',
          name: 'Test Recipient',
          type: 'to',
        },
      ],
      timestamp: new Date().toISOString(),
    });

    results.push({
      test: 'Create Message',
      passed: !!message?.data,
      message: 'Successfully created message',
      data: message?.data,
    });

    const messageId = (message?.data as any)?.data?.id || (message?.data as any)?.id;

    if (messageId) {
      // Test 2: Update message
      const updated = await updateMessageAction({
        id: messageId,
        workspaceId,
        isRead: false,
        isStarred: true,
      });

      results.push({
        test: 'Update Message',
        passed: !!updated.data,
        message: 'Successfully updated message',
      });

      // Test 3: Mark as read
      const marked = await markMessageAsReadAction({
        id: messageId,
        workspaceId,
      });

      results.push({
        test: 'Mark Message as Read',
        passed: !!marked.data,
        message: 'Successfully marked message as read',
      });

      // Test 4: Get messages
      const messages = await getMessagesAction({
        workspaceId,
        limit: 10,
        offset: 0,
        orderBy: 'timestamp',
        orderDirection: 'desc',
      });

      results.push({
        test: 'Get Messages',
        passed: (messages.messages?.length || 0) > 0,
        message: `Found ${messages.messages?.length || 0} message(s)`,
        data: { total: messages.total, hasMore: messages.hasMore },
      });
    }
  } catch (error) {
    results.push({
      test: 'Message Management',
      passed: false,
      message: 'Test failed with error',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Test Suite: AI Classification
 */
export async function testAIClassification(
  messageId: string,
  workspaceId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    results.push({
      test: 'AI Configuration',
      passed: false,
      message: 'OPENAI_API_KEY not configured',
    });
    return results;
  }

  // Test 1: Classify message
  try {
    const classification = await classifyMessage(messageId, workspaceId);

    results.push({
      test: 'Message Classification',
      passed: !!classification,
      message: `Classified as ${classification.priority} priority, ${classification.category} category`,
      data: classification,
    });
  } catch (error) {
    results.push({
      test: 'Message Classification',
      passed: false,
      message: 'Classification failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Auto-classify new messages
  try {
    const autoClassify = await autoClassifyNewMessages(workspaceId, 5);

    results.push({
      test: 'Auto-Classify Messages',
      passed: autoClassify.success,
      message: `Classified ${autoClassify.classifiedCount || 0} messages`,
      data: autoClassify,
    });
  } catch (error) {
    results.push({
      test: 'Auto-Classify Messages',
      passed: false,
      message: 'Auto-classification failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Test Suite: AI Reply Generation
 */
export async function testAIReplyGeneration(
  messageId: string,
  workspaceId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    results.push({
      test: 'AI Configuration',
      passed: false,
      message: 'OPENAI_API_KEY not configured',
    });
    return results;
  }

  // Test 1: Generate reply draft
  try {
    const draft = await generateReplyDraft(messageId, workspaceId, {
      tone: 'professional',
      maxLength: 300,
    });

    results.push({
      test: 'Generate Reply Draft',
      passed: !!draft.body && draft.body.length > 0,
      message: `Generated ${draft.body.length} character reply with ${draft.confidenceScore} confidence`,
      data: { bodyLength: draft.body.length, confidence: draft.confidenceScore },
    });
  } catch (error) {
    results.push({
      test: 'Generate Reply Draft',
      passed: false,
      message: 'Reply generation failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Extract tasks
  try {
    const tasks = await extractTasks(messageId, workspaceId);

    results.push({
      test: 'Extract Tasks',
      passed: true,
      message: `Found ${tasks.length} task(s)`,
      data: { tasksFound: tasks.length, tasks },
    });
  } catch (error) {
    results.push({
      test: 'Extract Tasks',
      passed: false,
      message: 'Task extraction failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Detect scheduling intent
  try {
    const scheduling = await detectSchedulingIntent(messageId, workspaceId);

    results.push({
      test: 'Detect Scheduling Intent',
      passed: true,
      message: `Scheduling intent: ${scheduling.hasIntent ? 'Yes' : 'No'}`,
      data: scheduling,
    });
  } catch (error) {
    results.push({
      test: 'Detect Scheduling Intent',
      passed: false,
      message: 'Scheduling detection failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Test Suite: Database Schema
 */
export async function testDatabaseSchema(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const supabase = await createSupabaseUserServerActionClient();

    // Test all Aiva.io tables exist
    const tables = [
      'channel_connections',
      'messages',
      'threads',
      'calendar_connections',
      'events',
      'tasks',
      'ai_action_logs',
      'message_drafts',
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);

        results.push({
          test: `Table: ${table}`,
          passed: !error,
          message: error ? `Table error: ${error.message}` : 'Table exists and accessible',
        });
      } catch (error) {
        results.push({
          test: `Table: ${table}`,
          passed: false,
          message: 'Table test failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    results.push({
      test: 'Database Schema',
      passed: false,
      message: 'Schema test failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

/**
 * Run all tests
 */
export async function runAllTests(workspaceId: string, userId: string): Promise<{
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const allResults: TestResult[] = [];

  console.log('🧪 Starting Aiva.io Backend Tests...\n');

  // Test 1: Database Schema
  console.log('Testing Database Schema...');
  const schemaResults = await testDatabaseSchema();
  allResults.push(...schemaResults);

  // Test 2: Channel Management
  console.log('Testing Channel Management...');
  const channelResults = await testChannelManagement(workspaceId, userId);
  allResults.push(...channelResults);

  // Get a channel connection ID for message tests
  const connections = await getUserChannelConnections(workspaceId, userId);
  const channelConnectionId = connections[0]?.id;

  if (channelConnectionId) {
    // Test 3: Message Management
    console.log('Testing Message Management...');
    const messageResults = await testMessageManagement(workspaceId, channelConnectionId);
    allResults.push(...messageResults);

    // Get a message ID for AI tests
    const messages = await getMessagesAction({
      workspaceId,
      limit: 1,
      offset: 0,
      orderBy: 'timestamp',
      orderDirection: 'desc',
    });

    const messageId = messages.messages?.[0]?.id;

    if (messageId) {
      // Test 4: AI Classification
      console.log('Testing AI Classification...');
      const classificationResults = await testAIClassification(messageId, workspaceId);
      allResults.push(...classificationResults);

      // Test 5: AI Reply Generation
      console.log('Testing AI Reply Generation...');
      const replyResults = await testAIReplyGeneration(messageId, workspaceId);
      allResults.push(...replyResults);
    }
  }

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;

  console.log('\n📊 Test Results:');
  console.log(`Total: ${allResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  return {
    totalTests: allResults.length,
    passed,
    failed,
    results: allResults,
  };
}

