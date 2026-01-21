/**
 * Application Constants
 */

// Import API URL from dedicated config file
import API_URL from '@/config/api';

// Re-export API_URL for backward compatibility
export { API_URL };

// App Info
export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || "Banda Baazar";
export const APP_DESCRIPTION = process.env.EXPO_PUBLIC_APP_DESCRIPTION || "Quick Commerce for Your City";

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
  DELIVERY_PARTNER: "delivery_partner",
} as const;

