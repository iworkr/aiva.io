#!/usr/bin/env node

/**
 * Script to fix user entitlement by linking it to workspace
 * Usage: node scripts/fix-user-entitlement.mjs apprevtest1@shopify.com
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/fix-user-entitlement.mjs <email>');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixUserEntitlement() {
  console.log(`\n🔧 Fixing entitlement for: ${email}\n`);

  try {
    // 1. Find user by email from user_application_settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_application_settings')
      .select('id')
      .eq('email_readonly', email)
      .single();

    if (settingsError || !userSettings) {
      console.error('❌ User not found in user_application_settings');
      console.error('Error:', settingsError);
      return;
    }

    const userId = userSettings.id;
    console.log(`✅ Found user ID: ${userId}\n`);

    // 2. Get user's workspaces
    const { data: workspaceMembers, error: membersError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_member_id', userId);

    if (membersError) {
      console.error('Error fetching workspace members:', membersError);
      return;
    }

    const workspaceIds = workspaceMembers?.map(w => w.workspace_id) || [];
    
    if (workspaceIds.length === 0) {
      console.error('❌ No workspaces found for user');
      return;
    }

    const workspaceId = workspaceIds[0]; // Use first workspace
    console.log(`✅ Found workspace: ${workspaceId}\n`);

    // 3. Get Shopify stores linked to this user
    const { data: shops, error: shopsError } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, workspace_id')
      .eq('linked_user_id', userId);

    if (shopsError) {
      console.error('Error fetching shops:', shopsError);
      return;
    }

    if (!shops || shops.length === 0) {
      console.error('❌ No Shopify stores found for user');
      return;
    }

    const shop = shops[0];
    console.log(`✅ Found shop: ${shop.shop_domain}\n`);

    // 4. Get entitlement by shop domain
    const { data: entitlement, error: entitlementError } = await supabase
      .from('entitlements')
      .select('*')
      .eq('shop_domain', shop.shop_domain)
      .single();

    if (entitlementError || !entitlement) {
      console.error('❌ No entitlement found for shop domain:', shop.shop_domain);
      console.error('Error:', entitlementError);
      return;
    }

    console.log(`✅ Found entitlement:`);
    console.log(`   Plan: ${entitlement.plan}`);
    console.log(`   Status: ${entitlement.status}`);
    console.log(`   Current workspace_id: ${entitlement.workspace_id || 'NULL'}\n`);

    // 5. Check if already linked
    if (entitlement.workspace_id === workspaceId) {
      console.log('✅ Entitlement is already linked to workspace!');
      return;
    }

    // 6. Update entitlement to link to workspace
    console.log(`🔗 Linking entitlement to workspace...`);
    const { data: updatedEntitlement, error: updateError } = await supabase
      .from('entitlements')
      .update({ workspace_id: workspaceId })
      .eq('id', entitlement.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update entitlement:', updateError);
      return;
    }

    console.log(`✅ Successfully linked entitlement to workspace!`);
    console.log(`   Entitlement ID: ${updatedEntitlement.id}`);
    console.log(`   Workspace ID: ${updatedEntitlement.workspace_id}`);
    console.log(`   Plan: ${updatedEntitlement.plan}`);
    console.log(`   Status: ${updatedEntitlement.status}\n`);

    // 7. Also ensure shop is linked to workspace
    if (shop.workspace_id !== workspaceId) {
      console.log(`🔗 Also linking shop to workspace...`);
      const { error: shopUpdateError } = await supabase
        .from('shopify_stores')
        .update({ workspace_id: workspaceId })
        .eq('id', shop.id);

      if (shopUpdateError) {
        console.warn('⚠️  Warning: Failed to update shop workspace_id:', shopUpdateError);
      } else {
        console.log(`✅ Shop linked to workspace\n`);
      }
    }

    console.log(`🎉 Fix complete! User should now see ${updatedEntitlement.plan} plan in dashboard.\n`);

  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserEntitlement();
