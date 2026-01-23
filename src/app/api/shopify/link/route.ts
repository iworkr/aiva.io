import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyLinkToken } from '@/lib/shopify/tokens';
import { getShopOwnerEmail } from '@/lib/shopify/client';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { createSupabaseUserRouteHandlerClient } from '@/supabase-clients/user/createSupabaseUserRouteHandlerClient';
import { getSoloWorkspace } from '@/data/user/workspaces';
import { syncAllShopifyData } from '@/lib/shopify/sync';

export const dynamic = 'force-dynamic';

/**
 * Link a Shopify store to an Aiva account
 * 
 * Two modes:
 * 1. linkMethod: "shopify" - Create/link account using Shopify email
 * 2. linkMethod: "existing_account" - Link to currently logged-in Aiva account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, linkMethod } = body;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }
    
    if (!linkMethod || !['shopify', 'existing_account'].includes(linkMethod)) {
      return NextResponse.json(
        { error: 'Invalid link method' },
        { status: 400 }
      );
    }
    
    // Verify token
    let tokenData;
    try {
      tokenData = verifyLinkToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token. Please try again from Shopify.' },
        { status: 401 }
      );
    }
    
    const { shop, accessToken } = tokenData;
    
    let userId: string;
    
    if (linkMethod === 'shopify') {
      // Get shop owner email from Shopify
      const { email, name } = await getShopOwnerEmail(shop, accessToken);
      
      if (!email) {
        return NextResponse.json(
          { error: 'Could not retrieve shop email from Shopify' },
          { status: 400 }
        );
      }
      
      // Check if user with this email already exists
      const { data: existingUsers } = await supabaseAdminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);
      
      if (existingUser) {
        // User exists - link to this account
        userId = existingUser.id;
        
        // Auto-sign in the user by creating a session
        const { error: signInError } = await supabaseAdminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });
        
        if (signInError) {
          console.error('Failed to generate sign-in link:', signInError);
        }
      } else {
        // Create new user account
        const tempPassword = crypto.randomUUID(); // They can set password later or use magic link
        
        const { data: newUser, error: createError } = await supabaseAdminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm since Shopify verified their email
          user_metadata: {
            full_name: name,
            display_name: name,
            from_shopify: true,
            shopify_shop: shop,
          },
        });
        
        if (createError || !newUser.user) {
          console.error('Failed to create user:', createError);
          return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
          );
        }
        
        userId = newUser.user.id;
        
        // Create user profile
        await supabaseAdminClient
          .from('user_profiles')
          .upsert({
            id: userId,
            full_name: name,
            display_name: name,
          });
      }
      
      // Set a secure cookie that the client can use to complete sign-in
      const cookieStore = await cookies();
      cookieStore.set('shopify_linked_user', email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 300, // 5 minutes
        path: '/',
      });
      
    } else {
      // existing_account - use currently logged in user
      const supabase = await createSupabaseUserRouteHandlerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Not logged in. Please log in to your Aiva account first.' },
          { status: 401 }
        );
      }
      
      userId = user.id;
    }
    
    // Get user's workspace
    let workspaceId: string | null = null;
    try {
      const soloWorkspace = await getSoloWorkspace();
      workspaceId = soloWorkspace.id;
      console.log(`[Shopify Link] Found workspace ${workspaceId} for user ${userId}`);
    } catch (error) {
      console.warn(`[Shopify Link] Could not get workspace for user ${userId}:`, error);
      // Continue without workspace_id - it can be set later
    }
    
    // Link the shop to the user and workspace
    const { data: updatedShop, error: updateError } = await supabaseAdminClient
      .from('shopify_stores')
      .update({
        linked_user_id: userId,
        workspace_id: workspaceId,
        link_method: linkMethod,
        sync_enabled: true, // Enable sync by default
        updated_at: new Date().toISOString(),
      })
      .eq('shop_domain', shop)
      .select('id')
      .single();
    
    if (updateError || !updatedShop) {
      console.error('Failed to link shop:', updateError);
      return NextResponse.json(
        { error: 'Failed to link Shopify store' },
        { status: 500 }
      );
    }
    
    // Ensure entitlements are linked to workspace (handles both existing and future entitlements)
    if (workspaceId) {
      try {
        const { ensureEntitlementsLinkedToWorkspace } = await import('@/lib/entitlements');
        await ensureEntitlementsLinkedToWorkspace(shop, workspaceId);
      } catch (entitlementError) {
        console.warn('[Shopify Link] Failed to ensure entitlement linking (non-blocking):', entitlementError);
        // Don't fail the link if entitlement linking fails
      }
    }
    
    // Trigger initial sync if workspace is set
    if (workspaceId) {
      try {
        console.log(`[Shopify Link] Triggering initial sync for store ${updatedShop.id}`);
        // Run sync in background - don't wait for it
        syncAllShopifyData(updatedShop.id, workspaceId, {
          maxRecords: 250,
          fullSync: true,
        }).catch((syncError) => {
          console.error('[Shopify Link] Initial sync error (non-blocking):', syncError);
        });
      } catch (syncError) {
        console.error('[Shopify Link] Failed to trigger initial sync:', syncError);
        // Don't fail the link if sync fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Shopify store linked successfully',
      shop,
      userId,
      workspaceId,
      syncTriggered: !!workspaceId,
    });
  } catch (error) {
    console.error('Shopify link error:', error);
    return NextResponse.json(
      { error: 'Failed to link account' },
      { status: 500 }
    );
  }
}

/**
 * GET handler for completing link after OAuth login redirect
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/dashboard?error=missing_token', request.url));
  }
  
  // Get current user
  const supabase = await createSupabaseUserRouteHandlerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.redirect(new URL(`/login?next=/shopify/link?token=${token}`, request.url));
  }
  
  // Verify and decode token
  let tokenData;
  try {
    tokenData = verifyLinkToken(token);
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.redirect(new URL('/dashboard?error=invalid_token', request.url));
  }
  
  const { shop } = tokenData;
  
  // Get user's workspace
  let workspaceId: string | null = null;
  try {
    const soloWorkspace = await getSoloWorkspace();
    workspaceId = soloWorkspace.id;
    console.log(`[Shopify Link GET] Found workspace ${workspaceId} for user ${user.id}`);
  } catch (error) {
    console.warn(`[Shopify Link GET] Could not get workspace for user ${user.id}:`, error);
  }
  
  // Link the shop to current user and workspace
  const { data: updatedShop, error: updateError } = await supabaseAdminClient
    .from('shopify_stores')
    .update({
      linked_user_id: user.id,
      workspace_id: workspaceId,
      link_method: 'existing_account',
      sync_enabled: true, // Enable sync by default
      updated_at: new Date().toISOString(),
    })
    .eq('shop_domain', shop)
    .select('id')
    .single();
  
  if (updateError || !updatedShop) {
    console.error('Failed to link shop:', updateError);
    return NextResponse.redirect(new URL('/dashboard?error=link_failed', request.url));
  }
  
  // Ensure entitlements are linked to workspace (handles both existing and future entitlements)
  if (workspaceId) {
    try {
      const { ensureEntitlementsLinkedToWorkspace } = await import('@/lib/entitlements');
      await ensureEntitlementsLinkedToWorkspace(shop, workspaceId);
    } catch (entitlementError) {
      console.warn('[Shopify Link GET] Failed to ensure entitlement linking (non-blocking):', entitlementError);
      // Don't fail the link if entitlement linking fails
    }
  }
  
  // Trigger initial sync if workspace is set
  if (workspaceId) {
    try {
      console.log(`[Shopify Link GET] Triggering initial sync for store ${updatedShop.id}`);
      // Run sync in background - don't wait for it
      syncAllShopifyData(updatedShop.id, workspaceId, {
        maxRecords: 250,
        fullSync: true,
      }).catch((syncError) => {
        console.error('[Shopify Link GET] Initial sync error (non-blocking):', syncError);
      });
    } catch (syncError) {
      console.error('[Shopify Link GET] Failed to trigger initial sync:', syncError);
    }
  }
  
  return NextResponse.redirect(new URL('/dashboard?from=shopify&linked=true', request.url));
}
