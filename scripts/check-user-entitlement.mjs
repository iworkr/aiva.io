#!/usr/bin/env node

/**
 * Script to check user entitlement status
 * Usage: node scripts/check-user-entitlement.mjs apprevtest1@shopify.com
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
  console.error('Usage: node scripts/check-user-entitlement.mjs <email>');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:');
console.log('  Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
console.log('  Env file path:', envPath);
console.log();

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

async function checkUserEntitlement() {
  console.log(`\n🔍 Checking entitlement for: ${email}\n`);

  try {
    // 1. Find user by email
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}\n`);

    // 2. Get user's workspaces
    const { data: workspaceMembers, error: membersError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('workspace_member_id', user.id);

    if (membersError) {
      console.error('Error fetching workspace members:', membersError);
    }

    const workspaceIds = workspaceMembers?.map(w => w.workspace_id) || [];
    console.log(`📁 Workspaces: ${workspaceIds.length}`);
    workspaceIds.forEach((id, idx) => {
      const role = workspaceMembers?.[idx]?.role;
      console.log(`   ${idx + 1}. ${id} (${role})`);
    });
    console.log();

    // 3. Get Shopify stores linked to this user
    const { data: shops, error: shopsError } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, shop_name, workspace_id, linked_user_id, is_active')
      .eq('linked_user_id', user.id);

    if (shopsError) {
      console.error('Error fetching shops:', shopsError);
    }

    console.log(`🛒 Shopify Stores: ${shops?.length || 0}`);
    shops?.forEach((shop, idx) => {
      console.log(`   ${idx + 1}. ${shop.shop_domain}`);
      console.log(`      Name: ${shop.shop_name || 'N/A'}`);
      console.log(`      Workspace ID: ${shop.workspace_id || 'NOT LINKED'}`);
      console.log(`      Active: ${shop.is_active}`);
    });
    console.log();

    // 4. Get entitlements by workspace
    const entitlementsByWorkspace = [];
    if (workspaceIds.length > 0) {
      const { data: workspaceEntitlements, error: workspaceEntitlementsError } = await supabase
        .from('entitlements')
        .select('*')
        .in('workspace_id', workspaceIds);

      if (workspaceEntitlementsError) {
        console.error('Error fetching workspace entitlements:', workspaceEntitlementsError);
      } else if (workspaceEntitlements) {
        entitlementsByWorkspace.push(...workspaceEntitlements);
      }
    }

    // 5. Get entitlements by shop domain
    const shopDomains = shops?.map(s => s.shop_domain) || [];
    const entitlementsByShop = [];
    if (shopDomains.length > 0) {
      const { data: shopEntitlements, error: shopEntitlementsError } = await supabase
        .from('entitlements')
        .select('*')
        .in('shop_domain', shopDomains);

      if (shopEntitlementsError) {
        console.error('Error fetching shop entitlements:', shopEntitlementsError);
      } else if (shopEntitlements) {
        entitlementsByShop.push(...shopEntitlements);
      }
    }

    console.log(`💳 Entitlements:`);
    console.log(`   By Workspace: ${entitlementsByWorkspace.length}`);
    entitlementsByWorkspace.forEach((ent, idx) => {
      console.log(`   ${idx + 1}. Plan: ${ent.plan}, Status: ${ent.status}`);
      console.log(`      Workspace ID: ${ent.workspace_id}`);
      console.log(`      Shop Domain: ${ent.shop_domain || 'N/A'}`);
      console.log(`      Provider: ${ent.provider}`);
    });

    console.log(`   By Shop Domain: ${entitlementsByShop.length}`);
    entitlementsByShop.forEach((ent, idx) => {
      console.log(`   ${idx + 1}. Plan: ${ent.plan}, Status: ${ent.status}`);
      console.log(`      Workspace ID: ${ent.workspace_id || 'NOT LINKED'}`);
      console.log(`      Shop Domain: ${ent.shop_domain}`);
      console.log(`      Provider: ${ent.provider}`);
    });
    console.log();

    // 6. Analysis
    console.log(`📊 Analysis:`);
    console.log(`   Has Workspace: ${workspaceIds.length > 0 ? '✅' : '❌'}`);
    console.log(`   Has Shop: ${shopDomains.length > 0 ? '✅' : '❌'}`);
    console.log(`   Has Entitlement: ${entitlementsByWorkspace.length > 0 || entitlementsByShop.length > 0 ? '✅' : '❌'}`);
    console.log(`   Entitlement Linked to Workspace: ${entitlementsByWorkspace.length > 0 ? '✅' : '❌'}`);
    console.log(`   Entitlement Linked to Shop Only: ${entitlementsByShop.length > 0 && entitlementsByWorkspace.length === 0 ? '⚠️  YES (PROBLEM!)' : '✅'}`);
    
    const activeEntitlements = [...entitlementsByWorkspace, ...entitlementsByShop].filter(
      e => e.status === 'active' || e.status === 'trialing'
    );
    console.log(`   Active Entitlements: ${activeEntitlements.length}`);
    activeEntitlements.forEach(ent => {
      console.log(`      - ${ent.plan} (${ent.status})`);
    });

    // 7. Problem diagnosis
    console.log(`\n🔧 Problem Diagnosis:`);
    
    if (entitlementsByShop.length > 0 && entitlementsByWorkspace.length === 0) {
      console.log(`   ⚠️  ISSUE FOUND: Entitlement exists but is NOT linked to workspace!`);
      console.log(`   📝 Solution: Need to link entitlement to workspace`);
      console.log(`   🔗 Shop Domain: ${entitlementsByShop[0].shop_domain}`);
      console.log(`   📁 Workspace ID: ${workspaceIds[0] || 'NONE FOUND'}`);
      
      if (workspaceIds.length > 0 && shops && shops.length > 0 && shops[0].workspace_id) {
        console.log(`\n   ✅ Shop is linked to workspace: ${shops[0].workspace_id}`);
        console.log(`   💡 Fix: Update entitlement to link workspace_id`);
      } else {
        console.log(`\n   ❌ Shop is NOT linked to workspace`);
        console.log(`   💡 Fix: First link shop to workspace, then link entitlement`);
      }
    } else if (entitlementsByWorkspace.length > 0) {
      console.log(`   ✅ Entitlement is properly linked to workspace`);
    } else {
      console.log(`   ❌ No entitlement found at all`);
      console.log(`   💡 Check if subscription was created in Shopify`);
    }

    console.log();

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserEntitlement();
