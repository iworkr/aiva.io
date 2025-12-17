/**
 * Shopify Admin API Client
 * Utilities for interacting with Shopify's Admin API
 */

export interface ShopInfo {
  id: number;
  name: string;
  email: string;
  domain: string;
  myshopify_domain: string;
  shop_owner: string;
  plan_name: string;
  currency: string;
  timezone: string;
  country_code: string;
  country_name: string;
}

export interface ShopifyApiError {
  errors: string | Record<string, string[]>;
}

/**
 * Base function to make authenticated requests to Shopify Admin API
 */
async function shopifyAdminRequest<T>(
  shopDomain: string,
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
  const url = `https://${shopDomain}/admin/api/${apiVersion}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`Shopify API error for ${endpoint}:`, response.status, errorData);
    throw new Error(
      `Shopify API error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }
  
  return response.json();
}

/**
 * Fetch shop information including owner email
 */
export async function getShopInfo(
  shopDomain: string,
  accessToken: string
): Promise<ShopInfo> {
  const data = await shopifyAdminRequest<{ shop: ShopInfo }>(
    shopDomain,
    accessToken,
    '/shop.json'
  );
  return data.shop;
}

/**
 * Fetch shop owner email (convenience function)
 */
export async function getShopOwnerEmail(
  shopDomain: string,
  accessToken: string
): Promise<{ email: string; name: string }> {
  const shop = await getShopInfo(shopDomain, accessToken);
  return {
    email: shop.email,
    name: shop.shop_owner,
  };
}

/**
 * Verify the shop installation is still valid
 */
export async function verifyShopAccess(
  shopDomain: string,
  accessToken: string
): Promise<boolean> {
  try {
    await getShopInfo(shopDomain, accessToken);
    return true;
  } catch (error) {
    console.error('Shop access verification failed:', error);
    return false;
  }
}

/**
 * Fetch recent orders for AI context
 */
export async function getRecentOrders(
  shopDomain: string,
  accessToken: string,
  limit: number = 50
): Promise<unknown[]> {
  const data = await shopifyAdminRequest<{ orders: unknown[] }>(
    shopDomain,
    accessToken,
    `/orders.json?status=any&limit=${limit}`
  );
  return data.orders;
}

/**
 * Fetch recent customers for AI context
 */
export async function getRecentCustomers(
  shopDomain: string,
  accessToken: string,
  limit: number = 50
): Promise<unknown[]> {
  const data = await shopifyAdminRequest<{ customers: unknown[] }>(
    shopDomain,
    accessToken,
    `/customers.json?limit=${limit}`
  );
  return data.customers;
}

/**
 * Fetch products for AI context
 */
export async function getProducts(
  shopDomain: string,
  accessToken: string,
  limit: number = 50
): Promise<unknown[]> {
  const data = await shopifyAdminRequest<{ products: unknown[] }>(
    shopDomain,
    accessToken,
    `/products.json?limit=${limit}`
  );
  return data.products;
}

/**
 * Search customers by email
 */
export async function searchCustomersByEmail(
  shopDomain: string,
  accessToken: string,
  email: string
): Promise<unknown[]> {
  const data = await shopifyAdminRequest<{ customers: unknown[] }>(
    shopDomain,
    accessToken,
    `/customers/search.json?query=email:${encodeURIComponent(email)}`
  );
  return data.customers;
}

/**
 * Get order by ID
 */
export async function getOrderById(
  shopDomain: string,
  accessToken: string,
  orderId: string | number
): Promise<unknown> {
  const data = await shopifyAdminRequest<{ order: unknown }>(
    shopDomain,
    accessToken,
    `/orders/${orderId}.json`
  );
  return data.order;
}

