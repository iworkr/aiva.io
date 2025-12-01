/**
 * Telegram Webhook Handler
 * Receives updates from Telegram Bot API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { createMessageAction } from '@/data/user/messages';
import { findOrCreateContactFromMessage } from '@/data/user/contacts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    date: number;
    text?: string;
    caption?: string;
  };
  edited_message?: TelegramUpdate['message'];
}

/**
 * GET handler for webhook verification
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // Verify webhook secret
  if (secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Invalid secret' },
      { status: 403 }
    );
  }

  return NextResponse.json({ 
    status: 'ok',
    message: 'Telegram webhook is configured correctly'
  });
}

/**
 * POST handler for Telegram updates
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret from query params
    const searchParams = request.nextUrl.searchParams;
    const secret = searchParams.get('secret');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (secret !== expectedSecret) {
      console.warn('⚠️ Telegram webhook received with invalid secret');
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 403 }
      );
    }

    const update: TelegramUpdate = await request.json();

    console.log('📱 Telegram webhook update received:', {
      updateId: update.update_id,
      hasMessage: !!update.message,
      hasEditedMessage: !!update.edited_message,
    });

    // Handle message (prefer edited_message if present)
    const message = update.edited_message || update.message;
    if (!message) {
      return NextResponse.json({ ok: true, message: 'No message in update' });
    }

    // Skip bot messages
    if (message.from.is_bot) {
      return NextResponse.json({ ok: true, message: 'Bot message ignored' });
    }

    // Only process private messages (for now)
    if (message.chat.type !== 'private') {
      return NextResponse.json({ ok: true, message: 'Non-private chat ignored' });
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Find Telegram connection for this bot
    // Note: We need to find connections by bot token or workspace
    // For now, we'll get all active Telegram connections and process for the first matching workspace
    // In production, you'd want to map bot token to workspace more explicitly
    const { data: connections } = await supabase
      .from('channel_connections')
      .select('id, workspace_id, user_id, provider_account_id')
      // DB enum for provider may not yet include "telegram" in generated types, so assert for now.
      .eq('provider' as any, 'telegram' as any)
      .eq('status', 'active')
      .limit(1);

    if (!connections || connections.length === 0) {
      console.warn('No active Telegram connection found');
      return NextResponse.json({ ok: true, message: 'No connection found' });
    }

    const connection = connections[0];
    const workspaceId = connection.workspace_id;
    const userId = connection.user_id;

    // Check if message already exists
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('channel_connection_id', connection.id)
      .eq('provider_message_id', String(message.message_id))
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, message: 'Message already processed' });
    }

    // Parse message
    const text = message.text || message.caption || '';
    const senderName = `${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}`.trim() || 
                      message.from.username || 
                      `Telegram User ${message.from.id}`;

    // Store message - note: subject/bodyHtml/senderEmail omitted for non-email channel
    const result = await createMessageAction({
      workspaceId,
      channelConnectionId: connection.id,
      providerMessageId: String(message.message_id),
      providerThreadId: String(message.chat.id),
      body: text,
      snippet: text.substring(0, 200),
      senderName,
      recipients: [],
      timestamp: new Date(message.date * 1000).toISOString(),
      labels: [],
      rawData: message,
    });

    if (result?.data && !(result.data as any).isDuplicate) {
      // Create or link contact
      try {
        await findOrCreateContactFromMessage(
          workspaceId,
          userId,
          'telegram',
          null, // No email
          senderName,
          String(message.from.id) // Use Telegram user ID as channel ID
        );
      } catch (contactError) {
        console.error(`Failed to create/link contact:`, contactError);
      }
    }

    // Update last sync time
    await supabase
      .from('channel_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    // Return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true, error: 'Internal error' });
  }
}

