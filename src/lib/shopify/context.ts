/**
 * Shopify AI Context Provider
 * Provides Shopify data context for AI responses
 * All data is workspace-scoped for proper data isolation
 * 
 * Note: This is a library file imported by server components/actions.
 * Pure formatting functions don't need "use server" directive.
 */

import { supabaseAdminClient } from "@/supabase-clients/admin/supabaseAdminClient";
import { createSupabaseUserServerComponentClient } from "@/supabase-clients/user/createSupabaseUserServerComponentClient";

// =====================================================
// TYPES
// =====================================================

export interface ShopifyStoreInfo {
  id: string;
  shopDomain: string;
  shopName: string | null;
  currency: string | null;
  isActive: boolean;
}

export interface ShopifyOrderSummary {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  email: string | null;
  totalPrice: number;
  currency: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  createdAt: string;
  lineItemsCount: number;
  trackingNumbers?: string[];
  trackingCompanies?: string[];
  trackingUrls?: string[];
}

export interface ShopifyCustomerSummary {
  customerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  ordersCount: number;
  totalSpent: number;
  currency: string | null;
}

export interface ShopifyProductSummary {
  productId: string;
  title: string;
  handle: string | null;
  vendor: string | null;
  status: string;
  variantsCount: number;
  priceRange: { min: number; max: number } | null;
}

export interface ShopifyContext {
  hasStore: boolean;
  store: ShopifyStoreInfo | null;
  recentOrders: ShopifyOrderSummary[];
  topCustomers: ShopifyCustomerSummary[];
  popularProducts: ShopifyProductSummary[];
  stats: {
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    ordersLast30Days: number;
    revenueLast30Days: number;
  };
}

export interface CustomerOrderHistory {
  customer: ShopifyCustomerSummary | null;
  orders: ShopifyOrderSummary[];
  totalSpent: number;
  orderCount: number;
}

// =====================================================
// CONTEXT FETCHING
// =====================================================

/**
 * Get Shopify context for a workspace
 * Used by AI to understand the e-commerce context
 */
export async function getShopifyContextForWorkspace(
  workspaceId: string,
  options: { useAdminClient?: boolean } = {}
): Promise<ShopifyContext> {
  const supabase = options.useAdminClient
    ? supabaseAdminClient
    : await createSupabaseUserServerComponentClient();

  const emptyContext: ShopifyContext = {
    hasStore: false,
    store: null,
    recentOrders: [],
    topCustomers: [],
    popularProducts: [],
    stats: {
      totalOrders: 0,
      totalCustomers: 0,
      totalProducts: 0,
      ordersLast30Days: 0,
      revenueLast30Days: 0,
    },
  };

  try {
    // Get the Shopify store for this workspace
    const { data: store, error: storeError } = await supabase
      .from("shopify_stores")
      .select("id, shop_domain, shop_name, currency, is_active")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (storeError || !store) {
      return emptyContext;
    }

    const storeInfo: ShopifyStoreInfo = {
      id: store.id,
      shopDomain: store.shop_domain,
      shopName: store.shop_name,
      currency: store.currency,
      isActive: store.is_active ?? true,
    };

    // Fetch recent orders (last 10)
    const { data: ordersData } = await supabase
      .from("shopify_orders")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id)
      .order("created_at_shopify", { ascending: false })
      .limit(10);

    const recentOrders: ShopifyOrderSummary[] = (ordersData || []).map((order) => {
      // Extract tracking information from fulfillments
      const fulfillments = (order.fulfillments as any) || [];
      const trackingNumbers: string[] = [];
      const trackingCompanies: string[] = [];
      const trackingUrls: string[] = [];

      fulfillments.forEach((fulfillment: any) => {
        if (fulfillment.tracking_number) {
          trackingNumbers.push(fulfillment.tracking_number);
        }
        if (fulfillment.tracking_numbers && Array.isArray(fulfillment.tracking_numbers)) {
          trackingNumbers.push(...fulfillment.tracking_numbers);
        }
        if (fulfillment.tracking_company) {
          trackingCompanies.push(fulfillment.tracking_company);
        }
        if (fulfillment.tracking_url) {
          trackingUrls.push(fulfillment.tracking_url);
        }
        if (fulfillment.tracking_urls && Array.isArray(fulfillment.tracking_urls)) {
          trackingUrls.push(...fulfillment.tracking_urls);
        }
      });

      return {
        orderId: order.id,
        orderNumber: order.order_number || order.name || `#${order.shopify_order_id}`,
        customerName: order.customer_name ?? null,
        email: order.email ?? null,
        totalPrice: order.total_price != null ? parseFloat(String(order.total_price)) : 0,
        currency: order.currency ?? null,
        financialStatus: order.financial_status ?? null,
        fulfillmentStatus: order.fulfillment_status ?? null,
        createdAt: order.created_at_shopify ?? new Date().toISOString(),
        lineItemsCount: Array.isArray(order.line_items) ? order.line_items.length : 0,
        trackingNumbers: trackingNumbers.length > 0 ? trackingNumbers : undefined,
        trackingCompanies: trackingCompanies.length > 0 ? [...new Set(trackingCompanies)] : undefined,
        trackingUrls: trackingUrls.length > 0 ? trackingUrls : undefined,
      };
    });

    // Fetch top customers by total spent (top 5)
    const { data: customersData } = await supabase
      .from("shopify_customers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id)
      .order("total_spent", { ascending: false })
      .limit(5);

    const topCustomers: ShopifyCustomerSummary[] = (customersData || []).map((customer) => ({
      customerId: customer.id,
      email: customer.email ?? null,
      firstName: customer.first_name ?? null,
      lastName: customer.last_name ?? null,
      ordersCount: customer.orders_count ?? 0,
      totalSpent: customer.total_spent != null ? parseFloat(String(customer.total_spent)) : 0,
      currency: customer.currency ?? null,
    }));

    // Fetch popular products (active only, top 5)
    const { data: productsData } = await supabase
      .from("shopify_products")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id)
      .eq("status", "active")
      .limit(5);

    const popularProducts: ShopifyProductSummary[] = (productsData || []).map((product) => {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const prices = variants
        .filter((v): v is { price?: string } => v !== null && typeof v === 'object')
        .map((v) => parseFloat(v.price || "0"))
        .filter((p) => !isNaN(p));
      
      return {
        productId: product.id,
        title: product.title ?? "Untitled",
        handle: product.handle ?? null,
        vendor: product.vendor ?? null,
        status: product.status ?? "unknown",
        variantsCount: variants.length,
        priceRange: prices.length > 0
          ? { min: Math.min(...prices), max: Math.max(...prices) }
          : null,
      };
    });

    // Calculate stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: totalOrders } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id);

    const { count: totalCustomers } = await supabase
      .from("shopify_customers")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id);

    const { count: totalProducts } = await supabase
      .from("shopify_products")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id)
      .eq("status", "active");

    const { data: recentOrdersStats } = await supabase
      .from("shopify_orders")
      .select("total_price")
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id)
      .gte("created_at_shopify", thirtyDaysAgo.toISOString());

    const ordersLast30Days = recentOrdersStats?.length || 0;
    const revenueLast30Days = (recentOrdersStats || []).reduce(
      (sum, order) => sum + (order.total_price != null ? parseFloat(String(order.total_price)) : 0),
      0
    );

    return {
      hasStore: true,
      store: storeInfo,
      recentOrders,
      topCustomers,
      popularProducts,
      stats: {
        totalOrders: totalOrders || 0,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        ordersLast30Days,
        revenueLast30Days,
      },
    };
  } catch (error) {
    console.error("[Shopify Context] Failed to fetch context:", error);
    return emptyContext;
  }
}

/**
 * Extract order number from text (e.g., "order 1001", "#1001", "order number 1001")
 */
function extractOrderNumber(text: string): string | null {
  if (!text) return null;
  
  // Patterns: "order 1001", "order #1001", "order number 1001", "#1001", "1001"
  const patterns = [
    /order\s*(?:number|#)?\s*(\d+)/i,
    /#(\d+)/,
    /\b(\d{3,})\b/, // 3+ digit number (likely order number)
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get order history for a specific customer email
 * Also searches by order number if mentioned in the message
 * Used by AI to provide personalized responses
 */
export async function getCustomerOrderHistory(
  workspaceId: string,
  email: string,
  options: { useAdminClient?: boolean; messageText?: string; orderNumber?: string } = {}
): Promise<CustomerOrderHistory> {
  const supabase = options.useAdminClient
    ? supabaseAdminClient
    : await createSupabaseUserServerComponentClient();

  const emptyHistory: CustomerOrderHistory = {
    customer: null,
    orders: [],
    totalSpent: 0,
    orderCount: 0,
  };

  if (!email) {
    return emptyHistory;
  }

  try {
    // Get the Shopify store for this workspace
    const { data: store } = await supabase
      .from("shopify_stores")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!store) {
      return emptyHistory;
    }

    // Normalize email for query (handle case-insensitive matching)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find customer by email (use case-insensitive comparison to handle existing mixed-case data)
    const { data: customer } = await supabase
      .from("shopify_customers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id)
      .ilike("email", normalizedEmail) // Use ilike for case-insensitive matching
      .limit(1)
      .maybeSingle();

    // Extract order number from message if provided
    let extractedOrderNumber: string | undefined = options.orderNumber;
    if (!extractedOrderNumber && options.messageText) {
      const extracted = extractOrderNumber(options.messageText);
      if (extracted) {
        extractedOrderNumber = extracted;
        console.log(`[Shopify Context] Extracted order number from message: ${extractedOrderNumber}`);
      }
    }
    
    // Get orders for this email (even if no customer record exists)
    // Also search by order number if mentioned in the message
    let ordersQuery = supabase
      .from("shopify_orders")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("shopify_store_id", store.id);
    
    // If order number is mentioned, search by order number (more specific)
    // Otherwise, search by email
    if (extractedOrderNumber) {
      ordersQuery = ordersQuery.eq("order_number", extractedOrderNumber);
      console.log(`[Shopify Context] Searching by order number: ${extractedOrderNumber}`);
    } else {
      ordersQuery = ordersQuery.ilike("email", normalizedEmail); // Use ilike for case-insensitive matching
    }
    
    const { data: ordersData } = await ordersQuery
      .order("created_at_shopify", { ascending: false })
      .limit(20);

    const orders: ShopifyOrderSummary[] = (ordersData || []).map((order) => {
      // Extract tracking information from fulfillments
      const fulfillments = (order.fulfillments as any) || [];
      const trackingNumbers: string[] = [];
      const trackingCompanies: string[] = [];
      const trackingUrls: string[] = [];

      fulfillments.forEach((fulfillment: any) => {
        if (fulfillment.tracking_number) {
          trackingNumbers.push(fulfillment.tracking_number);
        }
        if (fulfillment.tracking_numbers && Array.isArray(fulfillment.tracking_numbers)) {
          trackingNumbers.push(...fulfillment.tracking_numbers);
        }
        if (fulfillment.tracking_company) {
          trackingCompanies.push(fulfillment.tracking_company);
        }
        if (fulfillment.tracking_url) {
          trackingUrls.push(fulfillment.tracking_url);
        }
        if (fulfillment.tracking_urls && Array.isArray(fulfillment.tracking_urls)) {
          trackingUrls.push(...fulfillment.tracking_urls);
        }
      });

      return {
        orderId: order.id,
        orderNumber: order.order_number || order.name || `#${order.shopify_order_id}`,
        customerName: order.customer_name ?? null,
        email: order.email ?? null,
        totalPrice: order.total_price != null ? parseFloat(String(order.total_price)) : 0,
        currency: order.currency ?? null,
        financialStatus: order.financial_status ?? null,
        fulfillmentStatus: order.fulfillment_status ?? null,
        createdAt: order.created_at_shopify ?? new Date().toISOString(),
        lineItemsCount: Array.isArray(order.line_items) ? order.line_items.length : 0,
        trackingNumbers: trackingNumbers.length > 0 ? trackingNumbers : undefined,
        trackingCompanies: trackingCompanies.length > 0 ? [...new Set(trackingCompanies)] : undefined,
        trackingUrls: trackingUrls.length > 0 ? trackingUrls : undefined,
      };
    });

    const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    return {
      customer: customer
        ? {
            customerId: customer.id,
            email: customer.email ?? null,
            firstName: customer.first_name ?? null,
            lastName: customer.last_name ?? null,
            ordersCount: customer.orders_count ?? 0,
            totalSpent: customer.total_spent != null ? parseFloat(String(customer.total_spent)) : 0,
            currency: customer.currency ?? null,
          }
        : null,
      orders,
      totalSpent,
      orderCount: orders.length,
    };
  } catch (error) {
    console.error("[Shopify Context] Failed to fetch customer history:", error);
    return emptyHistory;
  }
}

// =====================================================
// AI CONTEXT FORMATTING
// =====================================================

/**
 * Format Shopify context for AI system prompt
 */
export function formatShopifyContextForAI(context: ShopifyContext): string {
  if (!context.hasStore || !context.store) {
    return "";
  }

  const lines: string[] = [
    `\n## Shopify Store Context`,
    `Store: ${context.store.shopName || context.store.shopDomain}`,
    `Currency: ${context.store.currency || "USD"}`,
    ``,
    `### Store Statistics`,
    `- Total Orders: ${context.stats.totalOrders}`,
    `- Total Customers: ${context.stats.totalCustomers}`,
    `- Active Products: ${context.stats.totalProducts}`,
    `- Orders (Last 30 days): ${context.stats.ordersLast30Days}`,
    `- Revenue (Last 30 days): ${formatCurrency(context.stats.revenueLast30Days, context.store.currency)}`,
  ];

  if (context.recentOrders.length > 0) {
    lines.push(``, `### Recent Orders`);
    for (const order of context.recentOrders.slice(0, 5)) {
      const status = [
        order.financialStatus,
        order.fulfillmentStatus,
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(
        `- Order ${order.orderNumber}: ${formatCurrency(order.totalPrice, order.currency)} (${status || "pending"}) - ${order.customerName || order.email || "Guest"}`
      );
    }
  }

  if (context.popularProducts.length > 0) {
    lines.push(``, `### Products Available`);
    for (const product of context.popularProducts.slice(0, 5)) {
      const priceInfo = product.priceRange
        ? ` - ${formatCurrency(product.priceRange.min, context.store.currency)}${
            product.priceRange.max !== product.priceRange.min
              ? ` to ${formatCurrency(product.priceRange.max, context.store.currency)}`
              : ""
          }`
        : "";
      lines.push(`- ${product.title}${priceInfo}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format customer order history for AI context
 */
export function formatCustomerHistoryForAI(history: CustomerOrderHistory): string {
  if (history.orderCount === 0) {
    return "";
  }

  const lines: string[] = [
    `## Customer Order History`,
  ];

  if (history.customer) {
    const name = [history.customer.firstName, history.customer.lastName]
      .filter(Boolean)
      .join(" ");
    lines.push(
      `Customer: ${name || history.customer.email || "Unknown"}`,
      `Total Orders: ${history.customer.ordersCount}`,
      `Total Spent: ${formatCurrency(history.customer.totalSpent, history.customer.currency)}`,
      ``
    );
  }

  if (history.orders.length > 0) {
    lines.push(`### Recent Orders (Most Recent First):`);
    for (const order of history.orders.slice(0, 5)) {
      const financialStatus = order.financialStatus || "unknown";
      const fulfillmentStatus = order.fulfillmentStatus || "unfulfilled";
      const date = new Date(order.createdAt).toLocaleDateString();
      
      // Build status description
      let statusDescription = "";
      if (financialStatus === "paid" && fulfillmentStatus === "fulfilled") {
        statusDescription = "✅ Paid & Shipped";
        // Add tracking info if available
        if (order.trackingNumbers && order.trackingNumbers.length > 0) {
          const trackingText = order.trackingNumbers.map((num, idx) => {
            const company = order.trackingCompanies?.[idx] || 'shipping';
            return `${company}: ${num}`;
          }).join(', ');
          statusDescription += ` (Tracking: ${trackingText})`;
        }
      } else if (financialStatus === "paid" && fulfillmentStatus === "partial") {
        statusDescription = "✅ Paid & Partially Shipped";
      } else if (financialStatus === "paid" && fulfillmentStatus === "unfulfilled") {
        statusDescription = "✅ Paid, Not Yet Shipped";
      } else if (financialStatus === "pending") {
        statusDescription = "⏳ Payment Pending";
      } else if (financialStatus === "refunded") {
        statusDescription = "↩️ Refunded";
      } else {
        statusDescription = `${financialStatus}/${fulfillmentStatus}`;
      }
      
      lines.push(
        `**Order ${order.orderNumber}** (${date})`,
        `  - Amount: ${formatCurrency(order.totalPrice, order.currency)}`,
        `  - Status: ${statusDescription}`,
        `  - Items: ${order.lineItemsCount} item(s)`,
        ``
      );
    }
    
    lines.push(`💡 When the customer asks about "my recent order" or "order status", refer to the most recent order above (Order ${history.orders[0].orderNumber}).`);
  }

  return lines.join("\n");
}

// =====================================================
// HELPERS
// =====================================================

function formatCurrency(amount: number, currency?: string | null): string {
  const currencyCode = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

