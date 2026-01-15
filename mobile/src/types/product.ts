/**
 * Product Types for Mobile App
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
  primary_image?: string;
  min_price?: number;
  max_price?: number;
  is_in_stock?: boolean;
  created_at?: string;
  updated_at?: string;
  images: ProductImage[];
  sell_units: SellUnit[];
  inventory?: Inventory;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  url?: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

export interface SellUnit {
  id: string;
  product_id: string;
  label: string;
  unit_value: number;
  price: number;
  compare_price?: number;
  mrp?: number;
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

export interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  vendor: string | null;
  min_price: number | null;
  primary_image: string | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  sell_unit_id: string;
  quantity: number;
  product: Product;
  sell_unit: SellUnit;
  created_at?: string;
  updated_at?: string;
}

export interface Cart {
  id: string;
  buyer_id?: string;
  user_id?: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee?: number;
  discount?: number;
  discount_amount?: number;
  coupon_code?: string | null;
  total_items?: number;
  is_empty?: boolean;
  total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AddToCartRequest {
  product_id: string;
  sell_unit_id: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

