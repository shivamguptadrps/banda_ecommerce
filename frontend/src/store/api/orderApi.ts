import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Order Types
 */
export interface OrderCreate {
  delivery_address_id: string;
  payment_mode: "online" | "cod"; // Backend accepts lowercase "cod" and "online"
  notes?: string;
  coupon_code?: string;
}

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
  // Product image for display
  product_image?: string;
  // Return policy snapshot
  return_eligible?: boolean;
  return_window_days?: number;
  return_deadline?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  buyer_id?: string;
  vendor_id?: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_mode: "online" | "cod";
  payment_status: "pending" | "paid" | "failed" | "refunded" | "created" | "authorized" | "captured";
  razorpay_order_id?: string; // For online payments
  order_status: "placed" | "confirmed" | "picked" | "packed" | "out_for_delivery" | "delivered" | "cancelled" | "returned" | "pending" | "processing" | "shipped"; // New statuses + legacy
  delivery_address_snapshot?: string;
  delivery_distance_km?: number;
  delivery_otp?: string; // 6-digit OTP for delivery confirmation
  notes?: string;
  cancellation_reason?: string;
  placed_at: string;
  confirmed_at?: string;
  picked_at?: string;
  packed_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  // Legacy timestamps (for backward compatibility)
  processing_at?: string;
  shipped_at?: string;
  items: OrderItem[];
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

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface OrderCancel {
  reason: string;
}

/**
 * Order API using RTK Query
 */
export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Order", "Cart"],
  endpoints: (builder) => ({
    // Create order
    createOrder: builder.mutation<Order, OrderCreate>({
      query: (data) => ({
        url: "/orders",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Order", "Cart"], // Invalidate cart after order creation
    }),

    // Get order by ID
    getOrder: builder.query<Order, string>({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: "Order", id: orderId }],
    }),

    // List orders
    getOrders: builder.query<OrderListResponse, { page?: number; size?: number; status?: string }>({
      query: ({ page = 1, size = 10, status }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (status) params.append("status", status);
        return `/orders?${params.toString()}`;
      },
      providesTags: ["Order"],
    }),

    // Cancel order
    cancelOrder: builder.mutation<Order, { orderId: string; data: OrderCancel }>({
      query: ({ orderId, data }) => ({
        url: `/orders/${orderId}/cancel`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: "Order", id: orderId }],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderQuery,
  useGetOrdersQuery,
  useCancelOrderMutation,
} = orderApi;

