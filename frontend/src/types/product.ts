/**
 * Product Types
 */

export interface Product {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_rating?: number;
  category_id?: string;
  category_name?: string;
  name: string;
  slug: string;
  description?: string;
  stock_unit: "kg" | "piece" | "liter" | "gram" | "dozen" | "pack";
  is_active?: boolean;
  is_featured?: boolean;
  rating?: number;
  review_count?: number;
  // Return Policy
  return_eligible: boolean;
  return_window_days?: number;
  return_conditions?: string;
  // From backend - computed fields
  primary_image?: string;
  min_price?: number;
  max_price?: number;
  is_in_stock?: boolean;
  // Timestamps
  created_at?: string;
  updated_at?: string;
  // Related data
  images: ProductImage[];
  sell_units: SellUnit[];
  inventory?: Inventory;
  attribute_values?: ProductAttributeValue[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;  // Backend uses image_url
  url?: string;       // Alias for compatibility
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

export interface SellUnit {
  id: string;
  product_id: string;
  label: string;           // e.g., "500g", "1kg", "1 piece"
  unit_value: number;      // Value in stock_unit (e.g., 0.5, 1, 1)
  price: number;
  compare_price?: number;  // Original price from backend
  mrp?: number;            // Alias for compare_price
  discount_percent?: number;
  is_active: boolean;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Inventory {
  product_id: string;
  available_quantity: number;
  reserved_quantity: number;
  low_stock_threshold?: number;
}

export interface SellUnitCreate {
  label: string;
  unit_value: number;
  price: number;
  compare_price?: number;
}

export interface ProductCreate {
  category_id?: string;
  name: string;
  description?: string;
  stock_unit: string;
  initial_stock?: number;
  low_stock_threshold?: number;
  sell_units?: SellUnitCreate[];
  // Return Policy (Mandatory)
  return_eligible: boolean;
  return_window_days?: number; // Required if return_eligible = true
  return_conditions?: string;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  category_id?: string;
  stock_unit?: string;
  is_active?: boolean;
  // Return Policy
  return_eligible?: boolean;
  return_window_days?: number;
  return_conditions?: string;
}

export interface SellUnitUpdate {
  label?: string;
  unit_value?: number;
  price?: number;
  compare_price?: number;
  is_active?: boolean;
}

export interface InventoryUpdate {
  available_quantity?: number;
  low_stock_threshold?: number;
}

export interface StockAdjustment {
  quantity: number;
  reason?: string;
}

export interface ProductFilters {
  category_id?: string;
  vendor_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort_by?: "name" | "price_low" | "price_high" | "rating" | "newest";
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * Cart Types
 */
export interface CartItem {
  id: string;
  product_id: string;
  sell_unit_id: string;
  quantity: number;
  product: Product;
  sell_unit: SellUnit;
}

export interface Cart {
  id: string;
  buyer_id: string;
  items: CartItem[];
  total_items: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface AddToCartRequest {
  product_id: string;
  sell_unit_id: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

