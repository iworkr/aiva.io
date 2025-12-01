/**
 * LinkedIn API Client
 * Handles LinkedIn API requests for messages
 */

'use server';

/**
 * Get LinkedIn access token (with refresh if needed)
 */
export async function getLinkedInAccessToken(connectionId: string): Promise<string> {
  const { createSupabaseUserServerActionClient } = await import('@/supabase-clients/user/createSupabaseUserServerActionClient');
  const supabase = await createSupabaseUserServerActionClient();

  const { data: connection, error } = await supabase
    .from('channel_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('LinkedIn connection not found');
  }

  // Check if token needs refresh
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    if (expiresAt <= new Date(Date.now() + 5 * 60 * 1000) && connection.refresh_token) {
      return await refreshLinkedInToken(connectionId, connection.refresh_token);
    }
  }

  return connection.access_token;
}

/**
 * Refresh LinkedIn access token
 */
async function refreshLinkedInToken(connectionId: string, refreshToken: string): Promise<string> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth not configured');
  }

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh LinkedIn token');
  }

  const tokens = await response.json();

  // Update token in database
  const { createSupabaseUserServerActionClient } = await import('@/supabase-clients/user/createSupabaseUserServerActionClient');
  const supabase = await createSupabaseUserServerActionClient();

  const tokenExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  await supabase
    .from('channel_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);

  return tokens.access_token;
}

/**
 * Get LinkedIn messages (InMail/conversations)
 * Note: LinkedIn messaging API requires specific permissions and may need app approval
 */
export async function getLinkedInMessages(accessToken: string, options: {
  maxResults?: number;
} = {}) {
  // LinkedIn messaging API endpoint
  // Note: This may require elevated API access
  const response = await fetch(
    `https://api.linkedin.com/v2/messaging/conversations?count=${options.maxResults || 50}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn API error: ${error}`);
  }

  return await response.json();
}

