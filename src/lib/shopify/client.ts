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

// =====================================================
// SHOPIFY ORDER TYPES
// =====================================================
export interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  province_code?: string;
  country?: string;
  country_code?: string;
  zip?: string;
  phone?: string;
  company?: string;
}

export interface ShopifyLineItem {
  id: number;
  variant_id: number | null;
  product_id: number | null;
  title: string;
  variant_title: string | null;
  sku: string | null;
  vendor: string | null;
  quantity: number;
  price: string;
  total_discount: string;
  fulfillment_status: string | null;
  gift_card: boolean;
  name: string;
}

export interface ShopifyDiscountCode {
  code: string;
  amount: string;
  type: string;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  email: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  financial_status: string;
  fulfillment_status: string | null;
  note: string | null;
  tags: string;
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress | null;
  billing_address: ShopifyAddress | null;
  discount_codes: ShopifyDiscountCode[];
  customer?: ShopifyCustomer | null;
}

// =====================================================
// SHOPIFY CUSTOMER TYPES
// =====================================================
export interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  orders_count: number;
  total_spent: string;
  currency: string;
  accepts_marketing: boolean;
  accepts_marketing_updated_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string;
  note: string | null;
  verified_email: boolean;
  tax_exempt: boolean;
  default_address: ShopifyAddress | null;
}

// =====================================================
// SHOPIFY PRODUCT TYPES
// =====================================================
export interface ShopifyProductVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string | null;
  position: number;
  inventory_quantity: number;
  compare_at_price: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyProductImage {
  id: number;
  product_id: number;
  position: number;
  src: string;
  width: number;
  height: number;
  alt: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyProductOption {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  status: 'active' | 'draft' | 'archived';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string;
  template_suffix: string | null;
  variants: ShopifyProductVariant[];
  images: ShopifyProductImage[];
  options: ShopifyProductOption[];
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Shop access verification failed:', {
      shopDomain,
      tokenLength: accessToken.length,
      tokenPreview: `${accessToken.substring(0, 20)}...`,
      error: errorMessage,
    });
    return false;
  }
}

// =====================================================
// ORDER FUNCTIONS
// =====================================================

export interface OrdersQueryOptions {
  limit?: number;
  status?: 'open' | 'closed' | 'cancelled' | 'any';
  sinceId?: number;
  createdAtMin?: string;
  updatedAtMin?: string;
  fields?: string[];
}

/**
 * Fetch orders with options for sync
 */
export async function getOrders(
  shopDomain: string,
  accessToken: string,
  options: OrdersQueryOptions = {}
): Promise<ShopifyOrder[]> {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit || 250));
  params.set('status', options.status || 'any');
  
  if (options.sinceId) params.set('since_id', String(options.sinceId));
  if (options.createdAtMin) params.set('created_at_min', options.createdAtMin);
  if (options.updatedAtMin) params.set('updated_at_min', options.updatedAtMin);
  if (options.fields) params.set('fields', options.fields.join(','));

  const data = await shopifyAdminRequest<{ orders: ShopifyOrder[] }>(
    shopDomain,
    accessToken,
    `/orders.json?${params.toString()}`
  );
  return data.orders;
}

/**
 * Fetch recent orders for AI context (legacy function)
 */
export async function getRecentOrders(
  shopDomain: string,
  accessToken: string,
  limit: number = 50
): Promise<ShopifyOrder[]> {
  return getOrders(shopDomain, accessToken, { limit });
}

/**
 * Get order by ID
 */
export async function getOrderById(
  shopDomain: string,
  accessToken: string,
  orderId: string | number
): Promise<ShopifyOrder> {
  const data = await shopifyAdminRequest<{ order: ShopifyOrder }>(
    shopDomain,
    accessToken,
    `/orders/${orderId}.json`
  );
  return data.order;
}

/**
 * Get orders count
 */
export async function getOrdersCount(
  shopDomain: string,
  accessToken: string,
  status: 'open' | 'closed' | 'cancelled' | 'any' = 'any'
): Promise<number> {
  const data = await shopifyAdminRequest<{ count: number }>(
    shopDomain,
    accessToken,
    `/orders/count.json?status=${status}`
  );
  return data.count;
}

// =====================================================
// CUSTOMER FUNCTIONS
// =====================================================

export interface CustomersQueryOptions {
  limit?: number;
  sinceId?: number;
  createdAtMin?: string;
  updatedAtMin?: string;
  fields?: string[];
}

/**
 * Fetch customers with options for sync
 */
export async function getCustomers(
  shopDomain: string,
  accessToken: string,
  options: CustomersQueryOptions = {}
): Promise<ShopifyCustomer[]> {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit || 250));
  
  if (options.sinceId) params.set('since_id', String(options.sinceId));
  if (options.createdAtMin) params.set('created_at_min', options.createdAtMin);
  if (options.updatedAtMin) params.set('updated_at_min', options.updatedAtMin);
  if (options.fields) params.set('fields', options.fields.join(','));

  const data = await shopifyAdminRequest<{ customers: ShopifyCustomer[] }>(
    shopDomain,
    accessToken,
    `/customers.json?${params.toString()}`
  );
  return data.customers;
}

/**
 * Fetch recent customers for AI context (legacy function)
 */
export async function getRecentCustomers(
  shopDomain: string,
  accessToken: string,
  limit: number = 50
): Promise<ShopifyCustomer[]> {
  return getCustomers(shopDomain, accessToken, { limit });
}

/**
 * Search customers by email
 */
export async function searchCustomersByEmail(
  shopDomain: string,
  accessToken: string,
  email: string
): Promise<ShopifyCustomer[]> {
  const data = await shopifyAdminRequest<{ customers: ShopifyCustomer[] }>(
    shopDomain,
    accessToken,
    `/customers/search.json?query=email:${encodeURIComponent(email)}`
  );
  return data.customers;
}

/**
 * Get customer by ID
 */
export async function getCustomerById(
  shopDomain: string,
  accessToken: string,
  customerId: string | number
): Promise<ShopifyCustomer> {
  const data = await shopifyAdminRequest<{ customer: ShopifyCustomer }>(
    shopDomain,
    accessToken,
    `/customers/${customerId}.json`
  );
  return data.customer;
}

/**
 * Get customers count
 */
export async function getCustomersCount(
  shopDomain: string,
  accessToken: string
): Promise<number> {
  const data = await shopifyAdminRequest<{ count: number }>(
    shopDomain,
    accessToken,
    `/customers/count.json`
  );
  return data.count;
}

// =====================================================
// PRODUCT FUNCTIONS
// =====================================================

export interface ProductsQueryOptions {
  limit?: number;
  sinceId?: number;
  createdAtMin?: string;
  updatedAtMin?: string;
  publishedStatus?: 'published' | 'unpublished' | 'any';
  status?: 'active' | 'draft' | 'archived';
  fields?: string[];
}

/**
 * Fetch products with options for sync
 */
export async function getProductsList(
  shopDomain: string,
  accessToken: string,
  options: ProductsQueryOptions = {}
): Promise<ShopifyProduct[]> {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit || 250));
  
  if (options.sinceId) params.set('since_id', String(options.sinceId));
  if (options.createdAtMin) params.set('created_at_min', options.createdAtMin);
  if (options.updatedAtMin) params.set('updated_at_min', options.updatedAtMin);
  if (options.publishedStatus) params.set('published_status', options.publishedStatus);
  if (options.status) params.set('status', options.status);
  if (options.fields) params.set('fields', options.fields.join(','));

  const data = await shopifyAdminRequest<{ products: ShopifyProduct[] }>(
    shopDomain,
    accessToken,
    `/products.json?${params.toString()}`
  );
  return data.products;
}

/**
 * Fetch products for AI context (legacy function)
 */
export async function getProducts(
  shopDomain: string,
  accessToken: string,
  limit: number = 50
): Promise<ShopifyProduct[]> {
  return getProductsList(shopDomain, accessToken, { limit });
}

/**
 * Get product by ID
 */
export async function getProductById(
  shopDomain: string,
  accessToken: string,
  productId: string | number
): Promise<ShopifyProduct> {
  const data = await shopifyAdminRequest<{ product: ShopifyProduct }>(
    shopDomain,
    accessToken,
    `/products/${productId}.json`
  );
  return data.product;
}

/**
 * Get products count
 */
export async function getProductsCount(
  shopDomain: string,
  accessToken: string,
  status?: 'active' | 'draft' | 'archived'
): Promise<number> {
  const params = status ? `?status=${status}` : '';
  const data = await shopifyAdminRequest<{ count: number }>(
    shopDomain,
    accessToken,
    `/products/count.json${params}`
  );
  return data.count;
}

