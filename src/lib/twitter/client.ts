/**
 * Twitter API Client
 * Handles Twitter API v2 requests for DMs and mentions
 */

'use server';

/**
 * Get Twitter access token (with refresh if needed)
 */
export async function getTwitterAccessToken(connectionId: string): Promise<string> {
  const { createSupabaseUserServerActionClient } = await import('@/supabase-clients/user/createSupabaseUserServerActionClient');
  const supabase = await createSupabaseUserServerActionClient();

  const { data: connection, error } = await supabase
    .from('channel_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('Twitter connection not found');
  }

  // Check if token needs refresh
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    if (expiresAt <= new Date(Date.now() + 5 * 60 * 1000) && connection.refresh_token) {
      return await refreshTwitterToken(connectionId, connection.refresh_token);
    }
  }

  return connection.access_token;
}

/**
 * Refresh Twitter access token
 */
async function refreshTwitterToken(connectionId: string, refreshToken: string): Promise<string> {
  const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Twitter OAuth not configured');
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Twitter token');
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
 * List Twitter direct messages
 */
export async function listTwitterDMs(accessToken: string, options: {
  maxResults?: number;
  paginationToken?: string;
} = {}) {
  const params = new URLSearchParams({
    max_results: String(options.maxResults || 50),
  });

  if (options.paginationToken) {
    params.append('pagination_token', options.paginationToken);
  }

  const response = await fetch(
    `https://api.twitter.com/2/dm_events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twitter API error: ${error}`);
  }

  return await response.json();
}

/**
 * Get Twitter user by ID
 */
export async function getTwitterUser(accessToken: string, userId: string) {
  const response = await fetch(
    `https://api.twitter.com/2/users/${userId}?user.fields=profile_image_url`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Twitter user');
  }

  return await response.json();
}

