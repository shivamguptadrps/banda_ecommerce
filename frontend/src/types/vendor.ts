/**
 * Vendor Types
 */

export interface Vendor {
  id: string;
  user_id: string;
  shop_name: string;
  description?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address_line_1: string;
  address_line_2?: string;
  address?: string; // Legacy field
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  delivery_radius_km?: number;
  is_verified: boolean;
  is_active: boolean;
  is_suspended?: boolean;
  rating?: number;
  total_orders?: number;
  total_reviews?: number;
  cod_enabled?: boolean;
  created_at: string;
  updated_at?: string;
  // Admin-specific fields
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

export interface VendorCreate {
  shop_name: string;
  description?: string;
  phone?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  delivery_radius_km?: number;
}

export interface VendorUpdate {
  shop_name?: string;
  description?: string;
  logo_url?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  delivery_radius_km?: number;
  cod_enabled?: boolean;
}

export interface VendorStats {
  total_products: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  today_orders: number;
  today_revenue: number;
  this_week_orders: number;
  this_week_revenue: number;
}

