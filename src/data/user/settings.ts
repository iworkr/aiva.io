/**
 * Settings Server Actions
 * Handles workspace and user settings updates
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseUserServerActionClient } from '@/supabase-clients/user/createSupabaseUserServerActionClient';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { isWorkspaceMember } from './workspaces';
import { getWorkspacePlanType } from '@/rsc-data/user/subscriptions';
import { getEffectiveSyncFrequency, PLAN_SYNC_LIMITS } from '@/utils/subscriptions';

// ============================================================================
// SCHEMAS
// ============================================================================

const updateAISettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  autoClassify: z.boolean().optional(),
  autoExtractTasks: z.boolean().optional(),
  autoCreateEvents: z.boolean().optional(),
  defaultReplyTone: z.enum(['formal', 'professional', 'friendly', 'casual']).optional(),
  aiContext: z.string().optional(), // Context description for AI behavior
  aiRules: z.string().optional(), // Rules the AI must follow
});

const updateNotificationSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  notificationEmailAddresses: z.array(z.string().email()).optional(),
});

const updateAccountSettingsSchema = z.object({
  displayName: z.string().min(1).optional(),
});

const updateWorkspaceSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceName: z.string().min(1).optional(),
  timezone: z.string().optional(),
  syncFrequency: z.number().optional(),
});

const updateSyncSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  timezone: z.string().optional(),
  syncFrequency: z.number().optional(),
});

// Auto-Send Settings Schemas
const updateAutoSendSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  autoSendEnabled: z.boolean().optional(),
  autoSendDelayType: z.enum(['exact', 'random', 'instant']).optional(),
  autoSendDelayMin: z.number().min(1).max(120).optional(),
  autoSendDelayMax: z.number().min(1).max(120).optional(),
  autoSendConfidenceThreshold: z.number().min(0.50).max(0.95).optional(), // Unified threshold (50-95%)
  autoSendTimeStart: z.string().optional(), // "HH:MM" format
  autoSendTimeEnd: z.string().optional(),   // "HH:MM" format
  humanReviewForScheduling: z.boolean().optional(),
  humanReviewForCommitments: z.boolean().optional(),
  humanReviewForSensitive: z.boolean().optional(),
});

const pauseAutoSendSchema = z.object({
  workspaceId: z.string().uuid(),
});

const cancelScheduledSendSchema = z.object({
  workspaceId: z.string().uuid(),
  queueId: z.string().uuid(),
});

// Auto-Send Filter Settings Schema
const updateAutoSendFiltersSchema = z.object({
  workspaceId: z.string().uuid(),
  inboxType: z.enum(['work', 'personal', 'mixed']).optional(),
  excludedCategories: z.array(z.string()).optional(),
  excludedSenders: z.array(z.string()).optional(),
  domainWhitelist: z.array(z.string()).optional(),
  domainBlacklist: z.array(z.string()).optional(),
  maxRepliesPerThread: z.number().min(1).max(10).optional(),
  senderCooldownMinutes: z.number().min(0).max(1440).optional(), // 0-24 hours
});

const updateInboxZeroSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  inboxZeroEnabled: z.boolean().optional(),
  autoArchiveHandled: z.boolean().optional(),
  applyAivaLabel: z.boolean().optional(),
  dailyDigestEnabled: z.boolean().optional(),
  dailyDigestTime: z.string().optional(), // "HH:MM" format
  dailyDigestEmailAddresses: z.array(z.string().email()).optional(),
});

// ============================================================================
// AI SETTINGS
// ============================================================================

export const updateAISettingsAction = authActionClient
  .schema(updateAISettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...settings } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    // FEATURE ACCESS CHECKS
    const { hasFeatureAccess } = await import('@/lib/entitlements-guard');

    // CUSTOM PROMPTS CHECK: If trying to set custom AI context/rules, require Pro+ plan
    if ((settings.aiContext !== undefined || settings.aiRules !== undefined)) {
      const hasCustomPrompts = await hasFeatureAccess(workspaceId, 'customPrompts');
      if (!hasCustomPrompts) {
        throw new Error('Custom AI prompts require a Professional plan. Please upgrade to customize AI behavior.');
      }
    }

    // SCHEDULING ASSISTANT CHECK: If trying to enable auto-create events, require Pro+ plan
    if (settings.autoCreateEvents === true) {
      const hasSchedulingAssistant = await hasFeatureAccess(workspaceId, 'schedulingAssistant');
      if (!hasSchedulingAssistant) {
        throw new Error('Auto-create calendar events requires a Professional plan. Please upgrade.');
      }
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Get existing workspace settings
    const { data: existing } = await supabase
      .from('workspace_settings')
      .select('workspace_settings')
      .eq('workspace_id', workspaceId)
      .single();

    const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;

    // Update AI settings
    const updatedSettings = {
      ...currentSettings,
      ai: {
        ...((currentSettings.ai as Record<string, any>) || {}),
        autoClassify: settings.autoClassify,
        autoExtractTasks: settings.autoExtractTasks,
        autoCreateEvents: settings.autoCreateEvents,
        defaultReplyTone: settings.defaultReplyTone,
        context: settings.aiContext,
        rules: settings.aiRules,
      },
    };

    // Remove undefined values
    Object.keys(updatedSettings.ai).forEach((key) => {
      if ((updatedSettings.ai as Record<string, any>)[key] === undefined) {
        delete (updatedSettings.ai as Record<string, any>)[key];
      }
    });

    const { error } = await supabase
      .from('workspace_settings')
      .upsert({
        workspace_id: workspaceId,
        workspace_settings: updatedSettings,
      });

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// AUTO-GENERATE AI CONTEXT
// ============================================================================

/**
 * Auto-generate AI context from workspace data (Shopify, emails, etc.)
 */
export const generateAIContextAction = authActionClient
  .schema(z.object({
    workspaceId: z.string().uuid(),
  }))
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    // CUSTOM PROMPTS CHECK: Generating AI context is a Pro+ feature
    const { hasFeatureAccess } = await import('@/lib/entitlements-guard');
    const hasCustomPrompts = await hasFeatureAccess(workspaceId, 'customPrompts');
    if (!hasCustomPrompts) {
      throw new Error('Custom AI context generation requires a Professional plan. Please upgrade.');
    }

    const supabase = await createSupabaseUserServerActionClient();
    
    console.log('[Generate Context] Starting context generation:', { workspaceId, userId });
    const contextParts: string[] = [];

    // Get workspace info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single();

    if (workspace) {
      contextParts.push(`You are an AI email assistant for ${workspace.name || 'this workspace'}.`);
    }

    // Get Shopify store info - try direct query first (more reliable in server actions)
    try {
      // Check stores linked to workspace_id first
      const { data: workspaceStores, error: workspaceError } = await supabase
        .from('shopify_stores')
        .select('shop_name, shop_domain, currency, is_active, workspace_id, linked_user_id')
        .eq('workspace_id', workspaceId)
        .limit(5);
      
      // Also check stores linked to the user (in case workspace_id isn't set)
      const { data: userStores, error: userError } = await supabase
        .from('shopify_stores')
        .select('shop_name, shop_domain, currency, is_active, workspace_id, linked_user_id')
        .eq('linked_user_id', userId)
        .limit(5);
      
      // Combine and deduplicate stores
      const allStores = [
        ...(workspaceStores || []),
        ...(userStores || []).filter(us => 
          !workspaceStores?.some(ws => ws.shop_domain === us.shop_domain)
        ),
      ];
      
      console.log('[Generate Context] Shopify stores found:', {
        workspaceId,
        userId,
        workspaceStoresCount: workspaceStores?.length || 0,
        userStoresCount: userStores?.length || 0,
        totalStores: allStores.length,
        stores: allStores.map(s => ({ 
          name: s.shop_name, 
          domain: s.shop_domain, 
          active: s.is_active,
          hasWorkspaceId: !!s.workspace_id,
          hasLinkedUserId: !!s.linked_user_id,
        })),
        workspaceError: workspaceError?.message,
        userError: userError?.message,
      });
      
      // Try to get active store first
      let store = allStores.find(s => s.is_active === true);
      
      // If no active store, use the first one (store might be linked but not marked active)
      if (!store && allStores.length > 0) {
        store = allStores[0];
        console.log('[Generate Context] No active store found, using first store:', store.shop_domain);
      }
      
      if (store) {
        const shopifyParts: string[] = [];
        shopifyParts.push(`\n## Shopify Store`);
        shopifyParts.push(`Store: ${store.shop_name || store.shop_domain}`);
        shopifyParts.push(`Currency: ${store.currency || 'USD'}`);
        
        // Get store ID to query synced data (workspace_id might not be set)
        const { data: storeData } = await supabase
          .from('shopify_stores')
          .select('id, workspace_id')
          .eq('shop_domain', store.shop_domain)
          .single();
        
        const storeId = storeData?.id;
        const storeHasWorkspaceId = !!storeData?.workspace_id;
        
        console.log('[Generate Context] Store data:', {
          storeId,
          storeHasWorkspaceId,
          storeWorkspaceId: storeData?.workspace_id,
        });
        
        // Query by shopify_store_id (primary) and optionally workspace_id if store has it
        // If store doesn't have workspace_id, products won't either, so only query by store_id
        let ordersQuery = supabase
          .from('shopify_orders')
          .select('*', { count: 'exact', head: true });
        if (storeId) {
          ordersQuery = ordersQuery.eq('shopify_store_id', storeId);
        }
        if (storeHasWorkspaceId && workspaceId) {
          ordersQuery = ordersQuery.eq('workspace_id', workspaceId);
        }
        const { count: totalOrders } = await ordersQuery;
        
        let customersQuery = supabase
          .from('shopify_customers')
          .select('*', { count: 'exact', head: true });
        if (storeId) {
          customersQuery = customersQuery.eq('shopify_store_id', storeId);
        }
        if (storeHasWorkspaceId && workspaceId) {
          customersQuery = customersQuery.eq('workspace_id', workspaceId);
        }
        const { count: totalCustomers } = await customersQuery;
        
        let productsQuery = supabase
          .from('shopify_products')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        if (storeId) {
          productsQuery = productsQuery.eq('shopify_store_id', storeId);
        }
        if (storeHasWorkspaceId && workspaceId) {
          productsQuery = productsQuery.eq('workspace_id', workspaceId);
        }
        const { count: totalProducts } = await productsQuery;
        
        console.log('[Generate Context] Data counts:', {
          totalOrders,
          totalCustomers,
          totalProducts,
          queryByStoreId: !!storeId,
          queryByWorkspaceId: storeHasWorkspaceId && !!workspaceId,
        });
        
        if (totalOrders || totalCustomers || totalProducts) {
          shopifyParts.push(`\n### Store Statistics`);
          if (totalOrders) shopifyParts.push(`- Total Orders: ${totalOrders}`);
          if (totalCustomers) shopifyParts.push(`- Total Customers: ${totalCustomers}`);
          if (totalProducts) shopifyParts.push(`- Active Products: ${totalProducts}`);
        }
        
        // Get products with full details
        let productsDataQuery = supabase
          .from('shopify_products')
          .select('title, vendor, product_type, body_html, variants, tags')
          .eq('status', 'active');
        if (storeId) {
          productsDataQuery = productsDataQuery.eq('shopify_store_id', storeId);
        }
        if (storeHasWorkspaceId && workspaceId) {
          productsDataQuery = productsDataQuery.eq('workspace_id', workspaceId);
        }
        const { data: products, error: productsError } = await productsDataQuery
          .order('created_at', { ascending: false })
          .limit(10);
        
        console.log('[Generate Context] Products query result:', {
          productCount: products?.length || 0,
          error: productsError?.message,
          queryByStoreId: !!storeId,
          queryByWorkspaceId: storeHasWorkspaceId && !!workspaceId,
        });
        
        if (products && products.length > 0) {
          shopifyParts.push(`\n### Products Available`);
          
          // Group by product type or vendor to show what the store sells
          const productTypes = new Set<string>();
          const vendors = new Set<string>();
          
          for (const product of products) {
            if (product.product_type) productTypes.add(product.product_type);
            if (product.vendor) vendors.add(product.vendor);
            
            // Extract price from variants
            let priceText = '';
            if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
              const prices = (product.variants as any[])
                .map((v: any) => parseFloat(v.price || '0'))
                .filter((p: number) => p > 0);
              if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                if (minPrice === maxPrice) {
                  priceText = ` - $${minPrice.toFixed(2)}`;
                } else {
                  priceText = ` - $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
                }
              }
            }
            
            let productDesc = `- ${product.title}${priceText}`;
            if (product.vendor) productDesc += ` (by ${product.vendor})`;
            shopifyParts.push(productDesc);
          }
          
          // Add summary of what the store sells
          if (productTypes.size > 0 || vendors.size > 0) {
            shopifyParts.push(`\n### What This Store Sells`);
            if (productTypes.size > 0) {
              shopifyParts.push(`Product Types: ${Array.from(productTypes).join(', ')}`);
            }
            if (vendors.size > 0) {
              shopifyParts.push(`Vendors/Brands: ${Array.from(vendors).join(', ')}`);
            }
          }
        } else if (totalProducts === 0) {
          // No products synced yet - provide helpful context
          shopifyParts.push(`\n### Products`);
          shopifyParts.push(`Note: No products have been synced to the store yet. If customers ask about products, thank them for their interest and let them know the store is still being set up, or that you'll need to check product availability.`);
        }
        
        contextParts.push(shopifyParts.join('\n'));
        console.log('[Generate Context] Successfully added Shopify context:', {
          storeName: store.shop_name || store.shop_domain,
          hasStats: !!(totalOrders || totalCustomers || totalProducts),
          productCount: products?.length || 0,
        });
      } else {
        console.log('[Generate Context] No Shopify store found for workspace:', {
          workspaceId,
          userId,
          workspaceStoresCount: workspaceStores?.length || 0,
          userStoresCount: userStores?.length || 0,
          totalStores: allStores.length,
          workspaceError: workspaceError?.message,
          userError: userError?.message,
        });
      }
    } catch (error) {
      console.error('[Generate Context] Failed to fetch Shopify store:', {
        error: error instanceof Error ? error.message : String(error),
        workspaceId,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    // Get channel connections to understand what channels are used
    const { data: connections } = await supabase
      .from('channel_connections')
      .select('provider, provider_account_name')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    if (connections && connections.length > 0) {
      const providers = [...new Set(connections.map(c => c.provider))];
      contextParts.push(`You handle messages from: ${providers.join(', ')}.`);
      
      if (connections.some(c => c.provider === 'gmail')) {
        const gmailAccounts = connections
          .filter(c => c.provider === 'gmail')
          .map(c => c.provider_account_name)
          .filter(Boolean);
        if (gmailAccounts.length > 0) {
          contextParts.push(`Gmail accounts: ${gmailAccounts.join(', ')}.`);
        }
      }
    }

    // Get recent message patterns to understand communication style
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('category, priority, actionability')
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (recentMessages && recentMessages.length > 0) {
      const categories = [...new Set(recentMessages.map(m => m.category).filter(Boolean))];
      const priorities = [...new Set(recentMessages.map(m => m.priority).filter(Boolean))];
      
      if (categories.length > 0) {
        contextParts.push(`Common message categories: ${categories.join(', ')}.`);
      }
      if (priorities.length > 0) {
        contextParts.push(`Message priorities typically range from: ${priorities.join(', ')}.`);
      }
    }

    // Default context if nothing found
    if (contextParts.length === 0) {
      contextParts.push('You are an AI email assistant. Your role is to help manage and respond to messages professionally and efficiently.');
    }

    const generatedContext = contextParts.join('\n\n');

    // Update workspace settings with generated context
    const { data: existing } = await supabase
      .from('workspace_settings')
      .select('workspace_settings')
      .eq('workspace_id', workspaceId)
      .single();

    const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;
    const updatedSettings = {
      ...currentSettings,
      ai: {
        ...((currentSettings.ai as Record<string, any>) || {}),
        context: generatedContext,
      },
    };

    await supabase
      .from('workspace_settings')
      .upsert({
        workspace_id: workspaceId,
        workspace_settings: updatedSettings,
      });

    revalidatePath(`/settings`);
    return { success: true, context: generatedContext };
  });

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

export const updateNotificationSettingsAction = authActionClient
  .schema(updateNotificationSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...settings } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Get existing workspace settings
    const { data: existing } = await supabase
      .from('workspace_settings')
      .select('workspace_settings')
      .eq('workspace_id', workspaceId)
      .single();

    const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;

    // Update notification settings
    const updatedSettings = {
      ...currentSettings,
      notifications: {
        ...((currentSettings.notifications as Record<string, any>) || {}),
        email: settings.emailNotifications,
        push: settings.pushNotifications,
      },
    };

    // Remove undefined values
    Object.keys(updatedSettings.notifications).forEach((key) => {
      if ((updatedSettings.notifications as Record<string, any>)[key] === undefined) {
        delete (updatedSettings.notifications as Record<string, any>)[key];
      }
    });

    // Build update object for direct columns (email addresses)
    const updateData: Record<string, any> = {
      workspace_settings: updatedSettings,
    };
    if (settings.notificationEmailAddresses !== undefined) {
      updateData.notification_email_addresses = settings.notificationEmailAddresses;
    }

    const { error } = await supabase
      .from('workspace_settings')
      .update(updateData)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// ACCOUNT SETTINGS
// ============================================================================

export const updateAccountSettingsAction = authActionClient
  .schema(updateAccountSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { displayName } = parsedInput;

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: displayName,
      })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// WORKSPACE SETTINGS
// ============================================================================

export const updateWorkspaceSettingsAction = authActionClient
  .schema(updateWorkspaceSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, workspaceName, timezone, syncFrequency } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Update workspace name if provided
    if (workspaceName) {
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .update({ name: workspaceName })
        .eq('id', workspaceId);

      if (workspaceError) throw new Error(workspaceError.message);
    }

    // Update workspace settings (timezone, sync frequency)
    if (timezone !== undefined || syncFrequency !== undefined) {
      const { data: existing } = await supabase
        .from('workspace_settings')
        .select('workspace_settings')
        .eq('workspace_id', workspaceId)
        .single();

      const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;

      const updatedSettings = {
        ...currentSettings,
        timezone: timezone !== undefined ? timezone : currentSettings.timezone,
        syncFrequency: syncFrequency !== undefined ? syncFrequency : currentSettings.syncFrequency,
      };

      const { error: settingsError } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          workspace_settings: updatedSettings,
        });

      if (settingsError) throw new Error(settingsError.message);
    }

    revalidatePath(`/settings`);
    revalidatePath(`/workspace/${workspaceId}`);
    return { success: true };
  });

// ============================================================================
// SYNC SETTINGS (Timezone & Sync Frequency - No Workspace Name)
// ============================================================================

export const updateSyncSettingsAction = authActionClient
  .schema(updateSyncSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, timezone, syncFrequency } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Update workspace settings (timezone, sync frequency)
    if (timezone !== undefined || syncFrequency !== undefined) {
      const { data: existing } = await supabase
        .from('workspace_settings')
        .select('workspace_settings')
        .eq('workspace_id', workspaceId)
        .single();

      const currentSettings = (existing?.workspace_settings || {}) as Record<string, any>;

      // Validate and enforce sync frequency based on plan
      let effectiveSyncFrequency = currentSettings.syncFrequency;
      if (syncFrequency !== undefined) {
        // Get workspace plan type to enforce sync limits
        const planType = await getWorkspacePlanType(workspaceId);
        const planLimits = PLAN_SYNC_LIMITS[planType];
        
        // Enforce minimum sync frequency for the plan
        effectiveSyncFrequency = getEffectiveSyncFrequency(planType, syncFrequency);
        
        // If user tried to set a faster frequency than allowed, inform them
        if (syncFrequency < planLimits.minSyncIntervalMinutes) {
          console.log(`Sync frequency ${syncFrequency} mins adjusted to ${effectiveSyncFrequency} mins for ${planType} plan`);
        }
      }

      const updatedSettings = {
        ...currentSettings,
        timezone: timezone !== undefined ? timezone : currentSettings.timezone,
        syncFrequency: effectiveSyncFrequency,
      };

      const { error: settingsError } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          workspace_settings: updatedSettings,
        });

      if (settingsError) throw new Error(settingsError.message);
    }

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// AUTO-SEND SETTINGS
// ============================================================================

export const updateAutoSendSettingsAction = authActionClient
  .schema(updateAutoSendSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...settings } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    
    if (settings.autoSendEnabled !== undefined) {
      updateData.auto_send_enabled = settings.autoSendEnabled;
    }
    if (settings.autoSendDelayType !== undefined) {
      updateData.auto_send_delay_type = settings.autoSendDelayType;
    }
    if (settings.autoSendDelayMin !== undefined) {
      updateData.auto_send_delay_min = settings.autoSendDelayMin;
    }
    if (settings.autoSendDelayMax !== undefined) {
      updateData.auto_send_delay_max = settings.autoSendDelayMax;
    }
    if (settings.autoSendConfidenceThreshold !== undefined) {
      updateData.auto_send_confidence_threshold = settings.autoSendConfidenceThreshold;
    }
    if (settings.autoSendTimeStart !== undefined) {
      updateData.auto_send_time_start = settings.autoSendTimeStart;
    }
    if (settings.autoSendTimeEnd !== undefined) {
      updateData.auto_send_time_end = settings.autoSendTimeEnd;
    }
    if (settings.humanReviewForScheduling !== undefined) {
      updateData.human_review_for_scheduling = settings.humanReviewForScheduling;
    }
    if (settings.humanReviewForCommitments !== undefined) {
      updateData.human_review_for_commitments = settings.humanReviewForCommitments;
    }
    if (settings.humanReviewForSensitive !== undefined) {
      updateData.human_review_for_sensitive = settings.humanReviewForSensitive;
    }

    // If enabling, ensure paused is false
    if (settings.autoSendEnabled === true) {
      updateData.auto_send_paused = false;
      updateData.auto_send_paused_at = null;
    }

    const { error } = await supabase
      .from('workspace_settings')
      .update(updateData)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

export const pauseAutoSendAction = authActionClient
  .schema(pauseAutoSendSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Set paused flag
    const { error: settingsError } = await supabase
      .from('workspace_settings')
      .update({
        auto_send_paused: true,
        auto_send_paused_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId);

    if (settingsError) throw new Error(settingsError.message);

    // Cancel all pending items in queue
    const { error: queueError } = await supabase
      .from('auto_send_queue')
      .update({ status: 'cancelled' })
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending');

    if (queueError) {
      console.error('Failed to cancel queued items:', queueError);
    }

    // Log the pause action
    await supabase.from('auto_send_log').insert({
      workspace_id: workspaceId,
      action: 'paused',
      details: { reason: 'manual_kill_switch' },
    });

    revalidatePath(`/settings`);
    return { success: true, paused: true };
  });

export const resumeAutoSendAction = authActionClient
  .schema(pauseAutoSendSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    const { error } = await supabase
      .from('workspace_settings')
      .update({
        auto_send_paused: false,
        auto_send_paused_at: null,
      })
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true, paused: false };
  });

export const cancelScheduledSendAction = authActionClient
  .schema(cancelScheduledSendSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, queueId } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Get the queue item to log details
    const { data: queueItem } = await supabase
      .from('auto_send_queue')
      .select('message_id, draft_id, confidence_score')
      .eq('id', queueId)
      .eq('workspace_id', workspaceId)
      .single();

    // Update status to cancelled
    const { error } = await supabase
      .from('auto_send_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending'); // Only cancel if still pending

    if (error) throw new Error(error.message);

    // Log the cancellation
    if (queueItem) {
      await supabase.from('auto_send_log').insert({
        workspace_id: workspaceId,
        queue_id: queueId,
        message_id: queueItem.message_id,
        draft_id: queueItem.draft_id,
        action: 'cancelled',
        confidence_score: queueItem.confidence_score,
        details: { reason: 'user_cancelled' },
      });
    }

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// AUTO-SEND FILTER SETTINGS
// ============================================================================

export const updateAutoSendFiltersAction = authActionClient
  .schema(updateAutoSendFiltersSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...settings } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    
    if (settings.inboxType !== undefined) {
      updateData.inbox_type = settings.inboxType;
    }
    if (settings.excludedCategories !== undefined) {
      updateData.auto_send_excluded_categories = settings.excludedCategories;
    }
    if (settings.excludedSenders !== undefined) {
      updateData.auto_send_excluded_senders = settings.excludedSenders;
    }
    if (settings.domainWhitelist !== undefined) {
      updateData.auto_send_domain_whitelist = settings.domainWhitelist;
    }
    if (settings.domainBlacklist !== undefined) {
      updateData.auto_send_domain_blacklist = settings.domainBlacklist;
    }
    if (settings.maxRepliesPerThread !== undefined) {
      updateData.auto_send_max_replies_per_thread = settings.maxRepliesPerThread;
    }
    if (settings.senderCooldownMinutes !== undefined) {
      updateData.auto_send_sender_cooldown_minutes = settings.senderCooldownMinutes;
    }

    const { error } = await supabase
      .from('workspace_settings')
      .update(updateData)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    return { success: true };
  });

// ============================================================================
// INBOX ZERO SETTINGS
// ============================================================================

export const updateInboxZeroSettingsAction = authActionClient
  .schema(updateInboxZeroSettingsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, ...settings } = parsedInput;

    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) throw new Error('Not a workspace member');

    const supabase = await createSupabaseUserServerActionClient();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    
    if (settings.inboxZeroEnabled !== undefined) {
      updateData.inbox_zero_enabled = settings.inboxZeroEnabled;
    }
    if (settings.autoArchiveHandled !== undefined) {
      updateData.auto_archive_handled = settings.autoArchiveHandled;
    }
    if (settings.applyAivaLabel !== undefined) {
      updateData.apply_aiva_label = settings.applyAivaLabel;
    }
    if (settings.dailyDigestEnabled !== undefined) {
      updateData.daily_digest_enabled = settings.dailyDigestEnabled;
    }
    if (settings.dailyDigestTime !== undefined) {
      updateData.daily_digest_time = settings.dailyDigestTime;
    }
    if (settings.dailyDigestEmailAddresses !== undefined) {
      updateData.daily_digest_email_addresses = settings.dailyDigestEmailAddresses;
    }

    const { error } = await supabase
      .from('workspace_settings')
      .update(updateData)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(error.message);

    revalidatePath(`/settings`);
    revalidatePath(`/`); // Revalidate homepage to update message counts
    return { success: true };
  });

// Get auto-send filter settings for a workspace
export async function getAutoSendFilters(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('workspace_settings')
    .select(`
      inbox_type,
      auto_send_excluded_categories,
      auto_send_excluded_senders,
      auto_send_domain_whitelist,
      auto_send_domain_blacklist,
      auto_send_max_replies_per_thread,
      auto_send_sender_cooldown_minutes
    `)
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  // Return defaults if no settings found
  return {
    inboxType: data?.inbox_type ?? 'work',
    excludedCategories: data?.auto_send_excluded_categories ?? ['marketing', 'newsletter', 'junk_email', 'social', 'notification'],
    excludedSenders: data?.auto_send_excluded_senders ?? ['noreply@', 'no-reply@', 'donotreply@', 'mailer-daemon@', 'postmaster@', 'notifications@', 'alert@', 'system@', 'automated@', 'bounce@', 'newsletter@', 'marketing@'],
    domainWhitelist: data?.auto_send_domain_whitelist ?? [],
    domainBlacklist: data?.auto_send_domain_blacklist ?? [],
    maxRepliesPerThread: data?.auto_send_max_replies_per_thread ?? 1,
    senderCooldownMinutes: data?.auto_send_sender_cooldown_minutes ?? 60,
  };
}

// Get auto-send queue for a workspace
export async function getAutoSendQueue(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('auto_send_queue')
    .select(`
      *,
      message:messages(subject, sender_email, sender_name),
      draft:message_drafts(body)
    `)
    .eq('workspace_id', workspaceId)
    .order('scheduled_send_at', { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  return data || [];
}

// Get auto-send settings for a workspace
export async function getAutoSendSettings(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('workspace_settings')
    .select(`
      auto_send_enabled,
      auto_send_delay_type,
      auto_send_delay_min,
      auto_send_delay_max,
      auto_send_confidence_threshold,
      auto_send_time_start,
      auto_send_time_end,
      auto_send_paused,
      auto_send_paused_at,
      human_review_for_scheduling,
      human_review_for_commitments,
      human_review_for_sensitive
    `)
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  // Return defaults if no settings found
  return {
    autoSendEnabled: data?.auto_send_enabled ?? false,
    autoSendDelayType: data?.auto_send_delay_type ?? 'random',
    autoSendDelayMin: data?.auto_send_delay_min ?? 10,
    autoSendDelayMax: data?.auto_send_delay_max ?? 30,
    autoSendConfidenceThreshold: data?.auto_send_confidence_threshold ?? 0.85,
    autoSendTimeStart: data?.auto_send_time_start ?? '09:00',
    autoSendTimeEnd: data?.auto_send_time_end ?? '21:00',
    autoSendPaused: data?.auto_send_paused ?? false,
    autoSendPausedAt: data?.auto_send_paused_at,
    humanReviewForScheduling: data?.human_review_for_scheduling ?? true,
    humanReviewForCommitments: data?.human_review_for_commitments ?? true,
    humanReviewForSensitive: data?.human_review_for_sensitive ?? true,
  };
}

// Get recent auto-send log entries
export async function getAutoSendLog(workspaceId: string, userId: string, limit = 20) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('auto_send_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// GET SETTINGS
// ============================================================================

export async function getWorkspaceSettings(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('workspace_settings')
    .select('workspace_settings, inbox_zero_enabled, auto_archive_handled, apply_aiva_label, daily_digest_enabled, daily_digest_time, daily_digest_email_addresses, notification_email_addresses')
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" - that's okay, return defaults
    throw new Error(error.message);
  }

  return {
    ...(data?.workspace_settings && typeof data.workspace_settings === 'object' ? data.workspace_settings : {}),
    inboxZero: {
      enabled: data?.inbox_zero_enabled ?? true,
      autoArchiveHandled: data?.auto_archive_handled ?? true,
      applyAivaLabel: data?.apply_aiva_label ?? true,
      dailyDigestEnabled: data?.daily_digest_enabled ?? true,
      dailyDigestTime: data?.daily_digest_time || '18:00',
      dailyDigestEmailAddresses: data?.daily_digest_email_addresses || null,
    },
    notificationEmailAddresses: data?.notification_email_addresses || null,
  };
}

export async function getUserProfile(userId: string) {
  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getWorkspace(workspaceId: string, userId: string) {
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) throw new Error('Not a workspace member');

  const supabase = await createSupabaseUserServerActionClient();

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

