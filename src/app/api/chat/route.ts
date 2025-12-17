/**
 * AI Chat API Route
 * Handles AI chat queries for workspace context
 */

import { formatShopifyContextForAI, getShopifyContextForWorkspace } from '@/lib/shopify/context';
import { createSupabaseUserServerComponentClient } from '@/supabase-clients/user/createSupabaseUserServerComponentClient';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createSupabaseUserServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get workspace context
    const { data: workspaceMembers } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_member_id', user.id)
      .limit(1)
      .single();

    if (!workspaceMembers) {
      return new Response('No workspace found', { status: 404 });
    }

    // Get workspace info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceMembers.workspace_id)
      .single();

    // Get recent messages, events, and Shopify context
    const [messagesResult, eventsResult, shopifyContext] = await Promise.all([
      supabase
        .from('messages')
        .select('id, subject, sender_name, sender_email, body, priority, created_at')
        .eq('workspace_id', workspaceMembers.workspace_id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('events')
        .select('id, title, description, start_time, end_time, location')
        .eq('workspace_id', workspaceMembers.workspace_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10),
      // Fetch Shopify context for this workspace (if connected)
      getShopifyContextForWorkspace(workspaceMembers.workspace_id),
    ]);

    const recentMessages = messagesResult.data || [];
    const upcomingEvents = eventsResult.data || [];
    
    // Format Shopify context for AI
    const shopifyContextStr = formatShopifyContextForAI(shopifyContext);

    // Parse request
    const { messages } = await req.json();

    // Build context for AI
    const contextMessages = recentMessages
      .map(
        (msg: any) =>
          `Message: ${msg.subject || 'No subject'} from ${msg.sender_name || msg.sender_email} - ${msg.body?.substring(0, 200)}...`
      )
      .join('\n\n');

    const contextEvents = upcomingEvents
      .map(
        (event: any) =>
          `Event: ${event.title}${event.start_time ? ` (${new Date(event.start_time).toLocaleString()})` : ''} - ${event.description || 'No description'}`
      )
      .join('\n\n');

    const systemPrompt = `You are Aiva, an AI assistant for ${workspace?.name || 'the workspace'}.

Your role is to help users manage their communication, schedule, and e-commerce operations. You have access to:

## Recent Unread Messages
${contextMessages || 'No unread messages'}

## Upcoming Events
${contextEvents || 'No upcoming events'}
${shopifyContextStr}

You can help with:
- Answering questions about messages and events
- Summarizing what needs attention
- Providing insights about priorities
- Helping with search queries
- General assistance with the workspace
${shopifyContext.hasStore ? `- Shopify store insights (orders, customers, products)
- E-commerce questions and order status
- Customer history and purchase patterns` : ''}

Be helpful, concise, and focus on actionable information. When relevant, reference specific messages, events, or Shopify data by their identifiers.`;

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

