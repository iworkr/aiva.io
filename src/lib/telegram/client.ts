/**
 * Telegram Bot API Client
 * Handles Telegram Bot API requests
 */

'use server';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Get Telegram bot token from environment
 */
function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }
  return token;
}

/**
 * Get updates from Telegram (polling - for manual sync)
 */
export async function getTelegramUpdates(options: {
  offset?: number;
  limit?: number;
  timeout?: number;
} = {}) {
  const token = getBotToken();
  const params = new URLSearchParams();

  if (options.offset) params.append('offset', String(options.offset));
  if (options.limit) params.append('limit', String(options.limit || 100));
  if (options.timeout) params.append('timeout', String(options.timeout));

  const response = await fetch(
    `${TELEGRAM_API_BASE}${token}/getUpdates?${params}`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }

  return await response.json();
}

/**
 * Get chat information
 */
export async function getTelegramChat(chatId: number | string) {
  const token = getBotToken();

  const response = await fetch(
    `${TELEGRAM_API_BASE}${token}/getChat?chat_id=${chatId}`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Telegram chat');
  }

  return await response.json();
}

/**
 * Send message via Telegram
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options: {
    reply_to_message_id?: number;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  } = {}
) {
  const token = getBotToken();

  const response = await fetch(
    `${TELEGRAM_API_BASE}${token}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send Telegram message: ${error}`);
  }

  return await response.json();
}

