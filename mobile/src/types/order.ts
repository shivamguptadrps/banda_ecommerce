/**
 * Order Types for Mobile App
 */

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "picked"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned"
  | "pending"
  | "processing"
  | "shipped";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  sell_unit_id?: string;
  product_name: string;
  sell_unit_label: string;
  unit_value: number;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  stock_quantity_used: number;
  // Return Policy Snapshot
  return_eligible: boolean;
  return_window_days?: number;
  return_deadline?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  buyer_id?: string;
  vendor_id?: string;
  order_status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_mode: "online" | "cod";
  payment_status: "pending" | "paid" | "failed" | "refunded" | "created" | "authorized" | "captured";
  delivery_address_snapshot?: string;
  delivery_distance_km?: number;
  delivery_otp?: string;
  notes?: string;
  cancellation_reason?: string;
  placed_at: string;
  confirmed_at?: string;
  picked_at?: string;
  packed_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  processing_at?: string;
  shipped_at?: string;
  total_items: number;
  is_cancellable: boolean;
  vendor?: {
    id: string;
    shop_name: string;
    phone?: string;
  };
  created_at: string;
  updated_at?: string;
}

export interface OrderCancel {
  reason: string;
}

export interface OrderCreate {
  delivery_address_id: string;
  payment_mode: "online" | "cod";
  notes?: string;
  coupon_code?: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

