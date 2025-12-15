/**
 * Slack API Client
 * Basic client for Slack integration (requires Slack App setup)
 */

'use server';

export async function refreshSlackToken(refreshToken: string): Promise<string> {
  const clientId = process.env.SLACK_CLIENT_ID!;
  const clientSecret = process.env.SLACK_CLIENT_SECRET!;

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (!data.ok) throw new Error('Failed to refresh Slack token');
  return data.access_token;
}

export async function listSlackMessages(accessToken: string, channel: string) {
  const response = await fetch(
    `https://slack.com/api/conversations.history?channel=${channel}&limit=50`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Failed to fetch Slack messages');
  return data.messages;
}

export async function sendSlackMessage(
  accessToken: string,
  channel: string,
  text: string
) {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text }),
  });

  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Failed to send Slack message');
  return data;
}

export function parseSlackMessage(slackMessage: any) {
  return {
    providerMessageId: slackMessage.ts,
    providerThreadId: slackMessage.thread_ts || slackMessage.ts,
    subject: '',
    body: slackMessage.text || '',
    snippet: slackMessage.text?.substring(0, 200) || '',
    senderEmail: slackMessage.user,
    senderName: slackMessage.username || slackMessage.user,
    recipients: [],
    timestamp: new Date(parseFloat(slackMessage.ts) * 1000).toISOString(),
    labels: [slackMessage.channel],
    rawData: slackMessage,
  };
}

