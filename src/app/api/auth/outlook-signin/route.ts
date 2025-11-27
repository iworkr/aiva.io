/**
 * Outlook/Microsoft OAuth Sign-In Route
 * Combines authentication with automatic Outlook channel connection
 * 
 * Flow:
 * 1. User signs in with Microsoft (Supabase OAuth)
 * 2. After auth, automatically redirects to Outlook OAuth for channel connection
 * 3. Creates/assigns workspace if needed
 * 4. Redirects to inbox with Outlook connected
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getMaybeDefaultWorkspace } from '@/data/user/workspaces';
import { createWorkspaceDirectly } from '@/data/user/workspaces-helpers';
import { toSiteURL } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseUserRouteHandlerClient();
    
    // Check if user is already authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // If user is already authenticated, skip to Outlook OAuth
    if (user) {
      // Get or create workspace
      let workspace = await getMaybeDefaultWorkspace();
      
      if (!workspace) {
        // Create default workspace
        const userName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 
                        'User';
        
        const workspaceId = await createWorkspaceDirectly(
          user.id,
          `Aiva – ${userName}`,
          'solo',
          true
        );

        return NextResponse.redirect(
          new URL(`/api/auth/outlook?workspace_id=${workspaceId}&auto_connect=true`, request.url)
        );
      } else {
        return NextResponse.redirect(
          new URL(`/api/auth/outlook?workspace_id=${workspace.workspace.id}&auto_connect=true`, request.url)
        );
      }
    }

    // Build callback URL for Supabase OAuth
    const callbackUrl = new URL(toSiteURL('/api/auth/outlook-signin/callback'), request.url);
    
    // Initiate Supabase OAuth with Microsoft
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      console.error('Outlook sign-in OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/en/login?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }

    if (!data?.url) {
      return NextResponse.redirect(
        new URL('/en/login?error=oauth_initiation_failed', request.url)
      );
    }

    return NextResponse.redirect(data.url);
  } catch (error) {
    console.error('Outlook sign-in initiation error:', error);
    return NextResponse.redirect(
      new URL('/en/login?error=signin_failed', request.url)
    );
  }
}

