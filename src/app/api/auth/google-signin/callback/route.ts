/**
 * Google OAuth Sign-In Callback
 * Handles OAuth callback from Google, creates user session,
 * and automatically creates Gmail channel connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { createChannelConnectionAction } from '@/data/user/channels';
import { getMaybeDefaultWorkspace } from '@/data/user/workspaces';
import { createWorkspaceDirectly } from '@/data/user/workspaces-helpers';
import { toSiteURL } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const action = requestUrl.searchParams.get('action'); // 'signin' or null

    if (!code) {
      return NextResponse.redirect(
        toSiteURL('/en/login?error=missing_code')
      );
    }

    // Exchange code for session (Supabase handles this)
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError || !authData?.user) {
      console.error('Failed to exchange code for session:', authError);
      return NextResponse.redirect(
        toSiteURL('/en/login?error=auth_failed')
      );
    }

    const user = authData.user;
    console.log('✅ User authenticated via Google:', user.id, user.email);

    // Get user's default workspace or create one
    let workspace = await getMaybeDefaultWorkspace();
    let workspaceId: string;

    if (!workspace) {
      // Create a default workspace for the user
      console.log('Creating default workspace for new user:', user.id);
      
      // Get user's name from metadata or email
      const userName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'User';
      
      workspaceId = await createWorkspaceDirectly(
        user.id,
        `Aiva – ${userName}`,
        'solo',
        true
      );
      console.log('✅ Created default workspace:', workspaceId);
    } else {
      workspaceId = workspace.workspace.id;
      console.log('✅ Using existing workspace:', workspaceId);
    }

    // After Supabase OAuth, we need to get Gmail API tokens separately
    // Redirect to Gmail OAuth flow to get the tokens and create channel connection
    // The Gmail OAuth route will detect the user is already authenticated and proceed
    console.log('✅ User authenticated, redirecting to Gmail OAuth for channel connection');
    
    return NextResponse.redirect(
      new URL(`/api/auth/gmail?workspace_id=${workspaceId}&auto_connect=true`, request.url)
    );
  } catch (error) {
    console.error('Google sign-in callback error:', error);
    return NextResponse.redirect(
      toSiteURL(`/en/login?error=${encodeURIComponent(error instanceof Error ? error.message : 'signin_failed')}`)
    );
  }
}

