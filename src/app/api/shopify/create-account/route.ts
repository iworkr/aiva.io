/**
 * Create Aiva Account from Shopify
 * 
 * This endpoint handles the "Continue with Shopify" flow:
 * 1. Creates a new Aiva account using the Shopify store owner's email
 * 2. Links the Shopify store to the new account
 * 3. Returns a URL to /api/shopify/session for server-side login (no hash tokens!)
 * 
 * Since the user is already authenticated with Shopify (which verified their email),
 * we can safely auto-login them by creating a server-side session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';
import { generateLinkToken } from '@/lib/shopify/tokens';
import { getSoloWorkspace } from '@/data/user/workspaces';
import { syncAllShopifyData } from '@/lib/shopify/sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopDomain, email, name } = body;

    if (!shopDomain || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: shopDomain and email' },
        { status: 400 }
      );
    }

    // Check if the shop exists and is active
    const { data: shop, error: shopError } = await supabaseAdminClient
      .from('shopify_stores')
      .select('id, linked_user_id, access_token')
      .eq('shop_domain', shopDomain)
      .eq('is_active', true)
      .single();

    if (shopError || !shop) {
      console.error('Shop not found:', shopError);
      return NextResponse.json(
        { error: 'Shop not found. Please reinstall the app from Shopify.' },
        { status: 404 }
      );
    }

    // Check if an account with this email already exists
    const { data: existingUsers } = await supabaseAdminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    let accountExists = false;

    if (existingUser) {
      // Account exists - we'll link to it
      userId = existingUser.id;
      accountExists = true;
      console.log(`Found existing user ${userId} for email ${email}`);
    } else {
      // Create new user account
      const { data: newUser, error: createError } = await supabaseAdminClient.auth.admin.createUser({
        email,
        email_confirm: true, // Auto-confirm since Shopify verified their email
        user_metadata: {
          full_name: name || email.split('@')[0],
          display_name: name || email.split('@')[0],
          from_shopify: true,
          shopify_shop: shopDomain,
        },
      });

      if (createError || !newUser.user) {
        console.error('Failed to create user:', createError);
        return NextResponse.json(
          { error: 'Failed to create account. Please try again.' },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
      console.log(`Created new user ${userId} for email ${email}`);

      // Create user profile
      await supabaseAdminClient
        .from('user_profiles')
        .upsert({
          id: userId,
          full_name: name || email.split('@')[0],
          display_name: name || email.split('@')[0],
        });
    }

    // Get user's workspace
    let workspaceId: string | null = null;
    try {
      const soloWorkspace = await getSoloWorkspace();
      workspaceId = soloWorkspace.id;
      console.log(`[Shopify Create Account] Found workspace ${workspaceId} for user ${userId}`);
    } catch (error) {
      console.warn(`[Shopify Create Account] Could not get workspace for user ${userId}:`, error);
      // Continue without workspace_id - it can be set later
    }
    
    // Link the Shopify store to this user and workspace
    const { data: updatedShop, error: linkError } = await supabaseAdminClient
      .from('shopify_stores')
      .update({
        linked_user_id: userId,
        workspace_id: workspaceId,
        link_method: 'shopify',
        sync_enabled: true, // Enable sync by default
        updated_at: new Date().toISOString(),
      })
      .eq('id', shop.id)
      .select('id')
      .single();

    if (linkError || !updatedShop) {
      console.error('Failed to link shop:', linkError);
      return NextResponse.json(
        { error: 'Failed to link Shopify store' },
        { status: 500 }
      );
    }
    
    // Ensure entitlements are linked to workspace (handles both existing and future entitlements)
    if (workspaceId) {
      try {
        const { ensureEntitlementsLinkedToWorkspace } = await import('@/lib/entitlements');
        await ensureEntitlementsLinkedToWorkspace(shopDomain, workspaceId);
      } catch (entitlementError) {
        console.warn('[Shopify Create Account] Failed to ensure entitlement linking (non-blocking):', entitlementError);
        // Don't fail the account creation if entitlement linking fails
      }
    }
    
    // Trigger initial sync if workspace is set
    if (workspaceId) {
      try {
        console.log(`[Shopify Create Account] Triggering initial sync for store ${updatedShop.id}`);
        // Run sync in background - don't wait for it
        syncAllShopifyData(updatedShop.id, workspaceId, {
          maxRecords: 250,
          fullSync: true,
        }).catch((syncError) => {
          console.error('[Shopify Create Account] Initial sync error (non-blocking):', syncError);
        });
      } catch (syncError) {
        console.error('[Shopify Create Account] Failed to trigger initial sync:', syncError);
        // Don't fail the account creation if sync fails
      }

      // Register webhooks for real-time order updates
      try {
        console.log(`[Shopify Create Account] Registering webhooks for store ${updatedShop.id}`);
        const { registerShopifyWebhooks } = await import('@/lib/shopify/webhooks');
        registerShopifyWebhooks(updatedShop.id).catch((webhookError) => {
          console.error('[Shopify Create Account] Webhook registration error (non-blocking):', webhookError);
        });
      } catch (webhookError) {
        console.error('[Shopify Create Account] Failed to register webhooks:', webhookError);
        // Don't fail the account creation if webhook registration fails
      }
    }

    // Generate a secure token for server-side session creation
    // This avoids the unreliable hash token approach
    const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
    
    // Get the shop's access token to generate a link token
    const { data: shopWithToken } = await supabaseAdminClient
      .from('shopify_stores')
      .select('access_token')
      .eq('shop_domain', shopDomain)
      .single();

    if (!shopWithToken?.access_token) {
      console.error('Shop access token not found');
      return NextResponse.json({
        success: true,
        accountExists,
        userId,
        redirectUrl: `/en/login?from=shopify&shop=${shopDomain}&email=${encodeURIComponent(email)}`,
        message: 'Account linked! Please log in to continue.',
      });
    }

    // Generate link token for secure session creation
    const token = generateLinkToken(shopDomain, shopWithToken.access_token);
    
    // Build URL to server-side session endpoint (same as auto-login uses)
    const sessionUrl = new URL('/api/shopify/session', appUrl);
    sessionUrl.searchParams.set('shop', shopDomain);
    sessionUrl.searchParams.set('token', token);
    sessionUrl.searchParams.set('redirectTo', '/en/dashboard?from=shopify&linked=true');

    // Return the session URL - client will redirect to this for instant login!
    return NextResponse.json({
      success: true,
      accountExists,
      userId,
      // This URL creates a server-side session (no hash tokens!)
      loginUrl: sessionUrl.toString(),
      message: accountExists 
        ? 'Welcome back! Logging you in...' 
        : 'Account created! Logging you in...',
    });

  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
