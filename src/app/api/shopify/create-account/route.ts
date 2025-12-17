/**
 * Create Aiva Account from Shopify
 * 
 * This endpoint handles the "Continue with Shopify" flow:
 * 1. Creates a new Aiva account using the Shopify store owner's email
 * 2. Links the Shopify store to the new account
 * 3. Returns a magic link URL for INSTANT login (no email needed!)
 * 
 * Since the user is already authenticated with Shopify (which verified their email),
 * we can safely auto-login them by generating a magic link and redirecting to it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/supabase-clients/admin/supabaseAdminClient';

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

    // Link the Shopify store to this user
    const { error: linkError } = await supabaseAdminClient
      .from('shopify_stores')
      .update({
        linked_user_id: userId,
        link_method: 'shopify',
        updated_at: new Date().toISOString(),
      })
      .eq('id', shop.id);

    if (linkError) {
      console.error('Failed to link shop:', linkError);
      return NextResponse.json(
        { error: 'Failed to link Shopify store' },
        { status: 500 }
      );
    }

    // Generate magic link for INSTANT login (no email needed!)
    // Since Shopify has already verified the user's identity, we can auto-login
    const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
    const redirectUrl = `${appUrl}/en/dashboard?from=shopify&shop=${shopDomain}&linked=true`;

    const { data: magicLinkData, error: magicLinkError } = await supabaseAdminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (magicLinkError || !magicLinkData?.properties?.action_link) {
      console.error('Failed to generate magic link:', magicLinkError);
      // Fallback: redirect to login page with context
      return NextResponse.json({
        success: true,
        accountExists,
        userId,
        redirectUrl: `/en/login?from=shopify&shop=${shopDomain}&email=${encodeURIComponent(email)}`,
        message: 'Account linked! Please log in to continue.',
      });
    }

    // Return the magic link URL - client will redirect to this for instant login!
    return NextResponse.json({
      success: true,
      accountExists,
      userId,
      // This is the magic link that logs them in immediately
      loginUrl: magicLinkData.properties.action_link,
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
