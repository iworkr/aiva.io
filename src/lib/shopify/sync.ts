/**
 * Shopify Data Sync Service
 * Syncs orders, customers, and products from Shopify to Aiva database
 * All data is workspace-scoped for proper data isolation
 */

"use server";

import { supabaseAdminClient } from "@/supabase-clients/admin/supabaseAdminClient";
import {
  getOrders,
  getCustomers,
  getProductsList,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyProduct,
} from "./client";

// =====================================================
// TYPES
// =====================================================

export interface SyncOptions {
  /** Maximum records to sync per batch */
  maxRecords?: number;
  /** Force full sync (ignore cursor) */
  fullSync?: boolean;
  /** Sync records updated since this date */
  sinceDate?: string;
}

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
  syncLogId?: string;
}

interface ShopifyStore {
  id: string;
  shop_domain: string;
  access_token: string;
  workspace_id: string;
  sync_enabled: boolean;
  last_orders_sync_at: string | null;
  last_customers_sync_at: string | null;
  last_products_sync_at: string | null;
  orders_sync_cursor: string | null;
  customers_sync_cursor: string | null;
  products_sync_cursor: string | null;
}

// =====================================================
// SYNC LOG HELPERS
// =====================================================

async function createSyncLog(
  workspaceId: string,
  storeId: string,
  syncType: string
): Promise<string> {
  const supabase = supabaseAdminClient;
  
  const { data, error } = await supabase
    .from("shopify_sync_logs")
    .insert({
      workspace_id: workspaceId,
      shopify_store_id: storeId,
      sync_type: syncType,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Shopify Sync] Failed to create sync log:", error);
    throw error;
  }

  return data.id;
}

async function completeSyncLog(
  logId: string,
  result: SyncResult
): Promise<void> {
  const supabase = supabaseAdminClient;
  
  const startedAt = await supabase
    .from("shopify_sync_logs")
    .select("started_at")
    .eq("id", logId)
    .single();

  const durationMs = startedAt.data?.started_at
    ? Date.now() - new Date(startedAt.data.started_at).getTime()
    : null;

  await supabase
    .from("shopify_sync_logs")
    .update({
      status: result.success ? "completed" : "failed",
      records_synced: result.recordsSynced,
      records_created: result.recordsCreated,
      records_updated: result.recordsUpdated,
      errors: result.errors.length > 0 ? result.errors : null,
      error_message: result.errors.length > 0 ? result.errors[0] : null,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
    })
    .eq("id", logId);
}

// =====================================================
// ORDER SYNC
// =====================================================

/**
 * Sync Shopify orders for a store to the database
 */
export async function syncShopifyOrders(
  storeId: string,
  workspaceId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const supabase = supabaseAdminClient;
  const result: SyncResult = {
    success: false,
    recordsSynced: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    errors: [],
  };

  console.log(`[Shopify Sync] Starting orders sync for store ${storeId}`);

  try {
    // Create sync log
    const syncLogId = await createSyncLog(workspaceId, storeId, "orders");
    result.syncLogId = syncLogId;

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from("shopify_stores")
      .select("*")
      .eq("id", storeId)
      .eq("workspace_id", workspaceId)
      .single();

    if (storeError || !store) {
      throw new Error(`Store not found: ${storeError?.message || "No data"}`);
    }

    // Check if sync is enabled
    if (!store.sync_enabled) {
      console.log(`[Shopify Sync] Sync disabled for store ${storeId}`);
      result.success = true;
      await completeSyncLog(syncLogId, result);
      return result;
    }

    // Fetch orders from Shopify
    const fetchOptions: {
      limit: number;
      updatedAtMin?: string;
    } = {
      limit: options.maxRecords || 250,
    };

    // Use incremental sync if we have a last sync date and not forcing full sync
    if (!options.fullSync && store.last_orders_sync_at) {
      fetchOptions.updatedAtMin = store.last_orders_sync_at;
    } else if (options.sinceDate) {
      fetchOptions.updatedAtMin = options.sinceDate;
    }

    console.log(`[Shopify Sync] Fetching orders with options:`, fetchOptions);

    const orders = await getOrders(
      store.shop_domain,
      store.access_token,
      fetchOptions
    );

    console.log(`[Shopify Sync] Fetched ${orders.length} orders from Shopify`);

    // Upsert orders to database
    for (const order of orders) {
      try {
        const orderData = transformOrderForDatabase(order, workspaceId, storeId);
        
        const { data: existing } = await supabase
          .from("shopify_orders")
          .select("id")
          .eq("shopify_store_id", storeId)
          .eq("shopify_order_id", order.id)
          .single();

        if (existing) {
          // Update existing order
          await supabase
            .from("shopify_orders")
            .update(orderData as any)
            .eq("id", existing.id);
          result.recordsUpdated++;
        } else {
          // Insert new order
          await supabase
            .from("shopify_orders")
            .insert(orderData as any);
          result.recordsCreated++;
        }
        result.recordsSynced++;
      } catch (orderError) {
        const errorMsg = orderError instanceof Error ? orderError.message : "Unknown error";
        console.error(`[Shopify Sync] Failed to sync order ${order.id}:`, errorMsg);
        result.errors.push(`Order ${order.id}: ${errorMsg}`);
      }
    }

    // Update store with last sync time
    await supabase
      .from("shopify_stores")
      .update({
        last_orders_sync_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    result.success = true;
    console.log(`[Shopify Sync] Orders sync completed:`, {
      synced: result.recordsSynced,
      created: result.recordsCreated,
      updated: result.recordsUpdated,
      errors: result.errors.length,
    });

    await completeSyncLog(syncLogId, result);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Shopify Sync] Orders sync failed:`, errorMsg);
    result.errors.push(errorMsg);
    
    if (result.syncLogId) {
      await completeSyncLog(result.syncLogId, result);
    }
    
    return result;
  }
}

function transformOrderForDatabase(
  order: ShopifyOrder,
  workspaceId: string,
  storeId: string
) {
  // Build customer name from line item or customer object
  const customerName = order.customer
    ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
    : null;

  // Extract tracking information from fulfillments
  const fulfillments = order.fulfillments || [];
  const trackingInfo = fulfillments
    .filter((f: any) => f.tracking_number || (f.tracking_numbers && f.tracking_numbers.length > 0))
    .map((f: any) => ({
      tracking_company: f.tracking_company || null,
      tracking_number: f.tracking_number || (f.tracking_numbers && f.tracking_numbers[0]) || null,
      tracking_numbers: f.tracking_numbers || (f.tracking_number ? [f.tracking_number] : []),
      tracking_url: f.tracking_url || null,
      tracking_urls: f.tracking_urls || (f.tracking_url ? [f.tracking_url] : []),
      status: f.status || null,
      shipped_at: f.shipped_at || null,
    }));

  return {
    workspace_id: workspaceId,
    shopify_store_id: storeId,
    shopify_order_id: order.id,
    order_number: String(order.order_number),
    name: order.name,
    email: order.email ? order.email.toLowerCase().trim() : null, // Normalize email to lowercase
    customer_name: customerName,
    total_price: parseFloat(order.total_price),
    subtotal_price: parseFloat(order.subtotal_price),
    total_tax: parseFloat(order.total_tax),
    total_discounts: parseFloat(order.total_discounts),
    currency: order.currency,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
    cancelled_at: order.cancelled_at,
    closed_at: order.closed_at,
    line_items: order.line_items,
    shipping_address: order.shipping_address,
    billing_address: order.billing_address,
    discount_codes: order.discount_codes,
    fulfillments: fulfillments.length > 0 ? fulfillments : null, // Store full fulfillments
    note: order.note,
    tags: order.tags,
    created_at_shopify: order.created_at,
    updated_at_shopify: order.updated_at,
    processed_at: order.processed_at,
    synced_at: new Date().toISOString(),
  };
}

// =====================================================
// CUSTOMER SYNC
// =====================================================

/**
 * Sync Shopify customers for a store to the database
 */
export async function syncShopifyCustomers(
  storeId: string,
  workspaceId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const supabase = supabaseAdminClient;
  const result: SyncResult = {
    success: false,
    recordsSynced: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    errors: [],
  };

  console.log(`[Shopify Sync] Starting customers sync for store ${storeId}`);

  try {
    // Create sync log
    const syncLogId = await createSyncLog(workspaceId, storeId, "customers");
    result.syncLogId = syncLogId;

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from("shopify_stores")
      .select("*")
      .eq("id", storeId)
      .eq("workspace_id", workspaceId)
      .single();

    if (storeError || !store) {
      throw new Error(`Store not found: ${storeError?.message || "No data"}`);
    }

    // Check if sync is enabled
    if (!store.sync_enabled) {
      console.log(`[Shopify Sync] Sync disabled for store ${storeId}`);
      result.success = true;
      await completeSyncLog(syncLogId, result);
      return result;
    }

    // Fetch customers from Shopify
    const fetchOptions: {
      limit: number;
      updatedAtMin?: string;
    } = {
      limit: options.maxRecords || 250,
    };

    // Use incremental sync if we have a last sync date and not forcing full sync
    if (!options.fullSync && store.last_customers_sync_at) {
      fetchOptions.updatedAtMin = store.last_customers_sync_at;
    } else if (options.sinceDate) {
      fetchOptions.updatedAtMin = options.sinceDate;
    }

    console.log(`[Shopify Sync] Fetching customers with options:`, fetchOptions);

    const customers = await getCustomers(
      store.shop_domain,
      store.access_token,
      fetchOptions
    );

    console.log(`[Shopify Sync] Fetched ${customers.length} customers from Shopify`);

    // Upsert customers to database
    for (const customer of customers) {
      try {
        const customerData = transformCustomerForDatabase(customer, workspaceId, storeId);
        
        const { data: existing } = await supabase
          .from("shopify_customers")
          .select("id")
          .eq("shopify_store_id", storeId)
          .eq("shopify_customer_id", customer.id)
          .single();

        if (existing) {
          // Update existing customer
          await supabase
            .from("shopify_customers")
            .update(customerData as any)
            .eq("id", existing.id);
          result.recordsUpdated++;
        } else {
          // Insert new customer
          await supabase
            .from("shopify_customers")
            .insert(customerData as any);
          result.recordsCreated++;
        }
        result.recordsSynced++;
      } catch (customerError) {
        const errorMsg = customerError instanceof Error ? customerError.message : "Unknown error";
        console.error(`[Shopify Sync] Failed to sync customer ${customer.id}:`, errorMsg);
        result.errors.push(`Customer ${customer.id}: ${errorMsg}`);
      }
    }

    // Update store with last sync time
    await supabase
      .from("shopify_stores")
      .update({
        last_customers_sync_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    result.success = true;
    console.log(`[Shopify Sync] Customers sync completed:`, {
      synced: result.recordsSynced,
      created: result.recordsCreated,
      updated: result.recordsUpdated,
      errors: result.errors.length,
    });

    await completeSyncLog(syncLogId, result);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Shopify Sync] Customers sync failed:`, errorMsg);
    result.errors.push(errorMsg);
    
    if (result.syncLogId) {
      await completeSyncLog(result.syncLogId, result);
    }
    
    return result;
  }
}

function transformCustomerForDatabase(
  customer: ShopifyCustomer,
  workspaceId: string,
  storeId: string
) {
  // Parse tags from comma-separated string to array
  const tags = customer.tags
    ? customer.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return {
    workspace_id: workspaceId,
    shopify_store_id: storeId,
    shopify_customer_id: customer.id,
    email: customer.email ? customer.email.toLowerCase().trim() : null, // Normalize email to lowercase
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    orders_count: customer.orders_count,
    total_spent: parseFloat(customer.total_spent),
    currency: customer.currency,
    accepts_marketing: customer.accepts_marketing,
    accepts_marketing_updated_at: customer.accepts_marketing_updated_at,
    tags: tags,
    note: customer.note,
    default_address: customer.default_address,
    verified_email: customer.verified_email,
    tax_exempt: customer.tax_exempt,
    created_at_shopify: customer.created_at,
    updated_at_shopify: customer.updated_at,
    synced_at: new Date().toISOString(),
  };
}

// =====================================================
// PRODUCT SYNC
// =====================================================

/**
 * Sync Shopify products for a store to the database
 */
export async function syncShopifyProducts(
  storeId: string,
  workspaceId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const supabase = supabaseAdminClient;
  const result: SyncResult = {
    success: false,
    recordsSynced: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    errors: [],
  };

  console.log(`[Shopify Sync] Starting products sync for store ${storeId}`);

  try {
    // Create sync log
    const syncLogId = await createSyncLog(workspaceId, storeId, "products");
    result.syncLogId = syncLogId;

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from("shopify_stores")
      .select("*")
      .eq("id", storeId)
      .eq("workspace_id", workspaceId)
      .single();

    if (storeError || !store) {
      throw new Error(`Store not found: ${storeError?.message || "No data"}`);
    }

    // Check if sync is enabled
    if (!store.sync_enabled) {
      console.log(`[Shopify Sync] Sync disabled for store ${storeId}`);
      result.success = true;
      await completeSyncLog(syncLogId, result);
      return result;
    }

    // Fetch products from Shopify
    const fetchOptions: {
      limit: number;
      updatedAtMin?: string;
    } = {
      limit: options.maxRecords || 250,
    };

    // Use incremental sync if we have a last sync date and not forcing full sync
    if (!options.fullSync && store.last_products_sync_at) {
      fetchOptions.updatedAtMin = store.last_products_sync_at;
    } else if (options.sinceDate) {
      fetchOptions.updatedAtMin = options.sinceDate;
    }

    console.log(`[Shopify Sync] Fetching products with options:`, fetchOptions);

    const products = await getProductsList(
      store.shop_domain,
      store.access_token,
      fetchOptions
    );

    console.log(`[Shopify Sync] Fetched ${products.length} products from Shopify`);

    // Upsert products to database
    for (const product of products) {
      try {
        const productData = transformProductForDatabase(product, workspaceId, storeId);
        
        const { data: existing } = await supabase
          .from("shopify_products")
          .select("id")
          .eq("shopify_store_id", storeId)
          .eq("shopify_product_id", product.id)
          .single();

        if (existing) {
          // Update existing product
          await supabase
            .from("shopify_products")
            .update(productData as any)
            .eq("id", existing.id);
          result.recordsUpdated++;
        } else {
          // Insert new product
          await supabase
            .from("shopify_products")
            .insert(productData as any);
          result.recordsCreated++;
        }
        result.recordsSynced++;
      } catch (productError) {
        const errorMsg = productError instanceof Error ? productError.message : "Unknown error";
        console.error(`[Shopify Sync] Failed to sync product ${product.id}:`, errorMsg);
        result.errors.push(`Product ${product.id}: ${errorMsg}`);
      }
    }

    // Update store with last sync time
    await supabase
      .from("shopify_stores")
      .update({
        last_products_sync_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    result.success = true;
    console.log(`[Shopify Sync] Products sync completed:`, {
      synced: result.recordsSynced,
      created: result.recordsCreated,
      updated: result.recordsUpdated,
      errors: result.errors.length,
    });

    await completeSyncLog(syncLogId, result);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Shopify Sync] Products sync failed:`, errorMsg);
    result.errors.push(errorMsg);
    
    if (result.syncLogId) {
      await completeSyncLog(result.syncLogId, result);
    }
    
    return result;
  }
}

function transformProductForDatabase(
  product: ShopifyProduct,
  workspaceId: string,
  storeId: string
) {
  // Parse tags from comma-separated string to array
  const tags = product.tags
    ? product.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return {
    workspace_id: workspaceId,
    shopify_store_id: storeId,
    shopify_product_id: product.id,
    title: product.title,
    handle: product.handle,
    body_html: product.body_html,
    vendor: product.vendor,
    product_type: product.product_type,
    status: product.status,
    published_at: product.published_at,
    variants: product.variants,
    images: product.images,
    options: product.options,
    tags: tags,
    template_suffix: product.template_suffix,
    created_at_shopify: product.created_at,
    updated_at_shopify: product.updated_at,
    synced_at: new Date().toISOString(),
  };
}

// =====================================================
// FULL SYNC
// =====================================================

export interface FullSyncResult {
  orders: SyncResult;
  customers: SyncResult;
  products: SyncResult;
  success: boolean;
  totalRecordsSynced: number;
}

/**
 * Sync all Shopify data (orders, customers, products) for a store
 */
export async function syncAllShopifyData(
  storeId: string,
  workspaceId: string,
  options: SyncOptions = {}
): Promise<FullSyncResult> {
  console.log(`[Shopify Sync] Starting full sync for store ${storeId}`);

  const ordersResult = await syncShopifyOrders(storeId, workspaceId, options);
  const customersResult = await syncShopifyCustomers(storeId, workspaceId, options);
  const productsResult = await syncShopifyProducts(storeId, workspaceId, options);

  const result: FullSyncResult = {
    orders: ordersResult,
    customers: customersResult,
    products: productsResult,
    success: ordersResult.success && customersResult.success && productsResult.success,
    totalRecordsSynced:
      ordersResult.recordsSynced +
      customersResult.recordsSynced +
      productsResult.recordsSynced,
  };

  console.log(`[Shopify Sync] Full sync completed:`, {
    success: result.success,
    totalRecords: result.totalRecordsSynced,
    ordersErrors: ordersResult.errors.length,
    customersErrors: customersResult.errors.length,
    productsErrors: productsResult.errors.length,
  });

  return result;
}

// =====================================================
// SYNC ALL ACTIVE STORES
// =====================================================

export interface AllStoresSyncResult {
  storesProcessed: number;
  storesSucceeded: number;
  storesFailed: number;
  totalRecordsSynced: number;
  errors: string[];
}

/**
 * Sync all active Shopify stores
 * Used by cron job to sync all connected stores
 */
export async function syncAllActiveStores(
  options: SyncOptions = {}
): Promise<AllStoresSyncResult> {
  const supabase = supabaseAdminClient;
  
  const result: AllStoresSyncResult = {
    storesProcessed: 0,
    storesSucceeded: 0,
    storesFailed: 0,
    totalRecordsSynced: 0,
    errors: [],
  };

  console.log("[Shopify Sync] Starting sync for all active stores");

  try {
    // Get all active stores with linked workspaces
    const { data: stores, error: storesError } = await supabase
      .from("shopify_stores")
      .select("id, workspace_id, shop_domain, sync_enabled")
      .eq("is_active", true)
      .eq("sync_enabled", true)
      .not("workspace_id", "is", null);

    if (storesError) {
      throw new Error(`Failed to fetch stores: ${storesError.message}`);
    }

    if (!stores || stores.length === 0) {
      console.log("[Shopify Sync] No active stores to sync");
      return result;
    }

    console.log(`[Shopify Sync] Found ${stores.length} active stores to sync`);

    // Sync each store
    for (const store of stores) {
      result.storesProcessed++;
      
      if (!store.workspace_id) {
        console.log(`[Shopify Sync] Skipping store ${store.shop_domain} - no workspace_id`);
        result.storesFailed++;
        continue;
      }
      
      try {
        console.log(`[Shopify Sync] Syncing store: ${store.shop_domain}`);
        
        const syncResult = await syncAllShopifyData(
          store.id,
          store.workspace_id,
          options
        );

        if (syncResult.success) {
          result.storesSucceeded++;
          result.totalRecordsSynced += syncResult.totalRecordsSynced;
        } else {
          result.storesFailed++;
          const allErrors = [
            ...syncResult.orders.errors,
            ...syncResult.customers.errors,
            ...syncResult.products.errors,
          ];
          result.errors.push(`${store.shop_domain}: ${allErrors.join("; ")}`);
        }
      } catch (storeError) {
        result.storesFailed++;
        const errorMsg = storeError instanceof Error ? storeError.message : "Unknown error";
        console.error(`[Shopify Sync] Store ${store.shop_domain} sync failed:`, errorMsg);
        result.errors.push(`${store.shop_domain}: ${errorMsg}`);
      }
    }

    console.log("[Shopify Sync] All stores sync completed:", result);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Shopify Sync] All stores sync failed:", errorMsg);
    result.errors.push(errorMsg);
    return result;
  }
}

