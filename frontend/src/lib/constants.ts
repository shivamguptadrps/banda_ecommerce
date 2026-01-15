/**
 * Application Constants
 */

// API - Use relative path for Next.js proxy in development
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

// App Info
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Banda";
export const APP_DESCRIPTION = process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Quick Commerce for Your City";

// Auth
export const ACCESS_TOKEN_KEY = "banda_access_token";
export const REFRESH_TOKEN_KEY = "banda_refresh_token";
export const USER_KEY = "banda_user";

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

// Cart
export const CART_KEY = "banda_cart";
export const MAX_CART_QUANTITY = 10;

// Order Status
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "warning",
  confirmed: "primary",
  processing: "primary",
  shipped: "primary",
  delivered: "success",
  cancelled: "error",
  returned: "error",
};

// Payment
export const PAYMENT_MODES = {
  ONLINE: "online",
  COD: "cod",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: "admin",
  VENDOR: "vendor",
  BUYER: "buyer",
} as const;

// Routes
export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  PRODUCTS: "/products",
  PRODUCT: (slug: string) => `/product/${slug}`,
  CATEGORIES: "/category",
  CATEGORY: (slug: string) => `/category/${slug}`,
  VENDOR_STORE: (id: string) => `/vendor/${id}`,

  // Buyer
  CART: "/cart",
  CHECKOUT: "/checkout",
  ORDERS: "/orders",
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  PROFILE: "/profile",
  ADDRESSES: "/addresses",

  // Vendor
  VENDOR_LOGIN: "/vendor/login",
  VENDOR_ONBOARDING: "/vendor/onboarding",
  VENDOR_DASHBOARD: "/vendor/dashboard",
  VENDOR_PRODUCTS: "/vendor/products",
  VENDOR_ORDERS: "/vendor/orders",
  VENDOR_SETTINGS: "/vendor/settings",

  // Admin
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin",
  ADMIN_VENDORS: "/admin/vendors",
  ADMIN_CATEGORIES: "/admin/categories",
  ADMIN_ATTRIBUTES: "/admin/attributes",
  ADMIN_SEGMENTS: "/admin/segments",
  ADMIN_ORDERS: "/admin/orders",
  ADMIN_DELIVERY_PARTNERS: "/admin/delivery-partners",
  ADMIN_COUPONS: "/admin/coupons",

  // Delivery Partner
  DELIVERY_PARTNER_LOGIN: "/delivery-partner/login",
  DELIVERY_PARTNER_DASHBOARD: "/delivery-partner",
  DELIVERY_PARTNER_ORDERS: "/delivery-partner/orders",
  DELIVERY_PARTNER_ORDER: (id: string) => `/delivery-partner/orders/${id}`,
  DELIVERY_PARTNER_STATS: "/delivery-partner/stats",
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

