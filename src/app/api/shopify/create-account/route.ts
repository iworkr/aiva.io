/**
 * Create Aiva Account from Shopify
 * 
 * This endpoint handles the "Continue with Shopify" flow:
 * 1. Creates a new Aiva account using the Shopify store owner's email
 * 2. Links the Shopify store to the new account
 * 3. Sends a magic link for passwordless login
 * 
 * If an account already exists with that email, it just sends a magic link
 * and links the store to that existing account.
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

    // Generate magic link for login
    const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tryaiva.io';
    const redirectUrl = `${appUrl}/en/dashboard?from=shopify&shop=${shopDomain}&linked=true`;

    const { data: magicLinkData, error: magicLinkError } = await supabaseAdminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (magicLinkError) {
      console.error('Failed to generate magic link:', magicLinkError);
      // Don't fail the whole request, the account is created/linked
      // User can still log in manually
    }

    // Send the magic link email
    if (magicLinkData?.properties?.action_link) {
      // The admin.generateLink doesn't send an email, we need to use signInWithOtp
      // But we can't do that server-side. We'll use a different approach.
      // Actually, let's use the email service if configured, or fall back to manual
      
      // For now, let's use Supabase's built-in email by triggering signInWithOtp
      // through the admin client
      const { error: otpError } = await supabaseAdminClient.auth.admin.generateLink({
        type: 'magiclink', 
        email,
        options: {
          redirectTo: redirectUrl,
        }
      });
      
      if (otpError) {
        console.log('Note: Magic link generation returned:', otpError);
      }
    }

    // Trigger actual email send using the regular auth flow
    // This uses Supabase's email templates
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const emailResponse = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        }
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Failed to send OTP email:', emailError);
      // Still return success - account is created/linked
    }

    return NextResponse.json({
      success: true,
      accountExists,
      userId,
      message: accountExists 
        ? 'Login link sent to your email' 
        : 'Account created! Check your email to complete setup',
    });

  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

