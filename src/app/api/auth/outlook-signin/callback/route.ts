/**
 * Outlook OAuth Sign-In Callback
 * Handles OAuth callback from Microsoft, creates user session,
 * and automatically creates Outlook channel connection
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
    const action = requestUrl.searchParams.get('action');

    if (!code) {
      return NextResponse.redirect(
        toSiteURL('/en/login?error=missing_code')
      );
    }

    // Exchange code for session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error('❌ Failed to exchange code for session:', {
        code: authError.code,
        message: authError.message,
        status: authError.status,
      });
      
      // Check for email-related errors
      if (authError.message?.includes('email') || authError.message?.includes('Email')) {
        return NextResponse.redirect(
          toSiteURL('/en/login?error=' + encodeURIComponent('Unable to sign in. Please ensure your Microsoft account has an email address configured and try again.'))
        );
      }
      
      return NextResponse.redirect(
        toSiteURL('/en/login?error=' + encodeURIComponent(authError.message || 'Authentication failed. Please try again.'))
      );
    }

    if (!authData?.user) {
      console.error('❌ No user data returned from OAuth');
      return NextResponse.redirect(
        toSiteURL('/en/login?error=' + encodeURIComponent('No user data received. Please try again.'))
      );
    }

    const user = authData.user;
    
    // Verify user has an email (required for our app)
    if (!user.email) {
      console.error('❌ User authenticated but no email address:', user.id);
      return NextResponse.redirect(
        toSiteURL('/en/login?error=' + encodeURIComponent('Your Microsoft account must have an email address to sign in. Please use a different account or contact support.'))
      );
    }
    
    console.log('✅ User authenticated via Microsoft:', user.id, user.email);

    // Get or create workspace
    let workspace = await getMaybeDefaultWorkspace();
    let workspaceId: string;

    if (!workspace) {
      console.log('Creating default workspace for new user:', user.id);
      
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

    // After Supabase OAuth, redirect to Outlook OAuth flow to get tokens and create channel connection
    console.log('✅ User authenticated, redirecting to Outlook OAuth for channel connection');
    
    return NextResponse.redirect(
      new URL(`/api/auth/outlook?workspace_id=${workspaceId}&auto_connect=true`, request.url)
    );
  } catch (error) {
    console.error('Outlook sign-in callback error:', error);
    return NextResponse.redirect(
      toSiteURL(`/en/login?error=${encodeURIComponent(error instanceof Error ? error.message : 'signin_failed')}`)
    );
  }
}

