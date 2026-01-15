import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export interface Vendor {
  id: string;
  user_id?: string;
  shop_name: string;
  description?: string;
  logo_url?: string;
  city: string;
  state?: string;
  rating: number;
  total_orders: number;
  total_reviews: number;
  is_verified: boolean;
  cod_enabled: boolean;
  delivery_radius_km: number;
  address_line_1?: string;
  address_line_2?: string;
  pincode?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VendorStats {
  total_revenue: number;
  this_week_revenue: number;
  total_orders: number;
  today_orders: number;
  total_products: number;
  pending_orders: number;
}

export interface VendorOrder {
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
  razorpay_order_id?: string;
  order_status: "placed" | "confirmed" | "picked" | "packed" | "out_for_delivery" | "delivered" | "cancelled" | "returned" | "pending" | "processing" | "shipped";
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
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    sell_unit_label: string;
    quantity: number;
    price_locked: number;
    total: number;
    return_eligible?: boolean;
    return_window_days?: number;
    return_conditions?: string;
  }>;
  total_items: number;
  is_cancellable: boolean;
  buyer_name?: string;
  buyer_phone?: string;
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  created_at: string;
  updated_at?: string;
}

export interface VendorOrderListResponse {
  items: VendorOrder[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface VendorUpdateData {
  shop_name?: string;
  description?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export const vendorApi = createApi({
  reducerPath: "vendorApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Vendor", "VendorOrder"],
  endpoints: (builder) => ({
    // Get vendor profile
    getVendorProfile: builder.query<Vendor, void>({
      query: () => `/vendor/profile`,
      providesTags: ["Vendor"],
    }),

    // Get vendor stats
    getVendorStats: builder.query<VendorStats, void>({
      query: () => `/vendor/stats`,
      providesTags: ["Vendor"],
    }),

    // Update vendor profile
    updateVendorProfile: builder.mutation<Vendor, VendorUpdateData>({
      query: (data) => ({
        url: `/vendor/profile`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Get vendor orders
    getVendorOrders: builder.query<
      VendorOrderListResponse,
      { page?: number; size?: number; status?: string }
    >({
      query: ({ page = 1, size = 20, status }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (status) params.append("status", status);
        return `/vendor/orders?${params.toString()}`;
      },
      providesTags: ["VendorOrder"],
    }),

    // Get single vendor order
    getVendorOrder: builder.query<VendorOrder, string>({
      query: (orderId) => `/vendor/orders/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: "VendorOrder", id: orderId }],
    }),

    // Accept order
    acceptOrder: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["VendorOrder", "Vendor"],
    }),

    // Reject order
    rejectOrder: builder.mutation<any, { orderId: string; reason?: string }>({
      query: ({ orderId, reason }) => ({
        url: `/vendor/orders/${orderId}/reject`,
        method: "POST",
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: ["VendorOrder", "Vendor"],
    }),

    // Mark order as picked
    markOrderPicked: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/pick`,
        method: "POST",
      }),
      invalidatesTags: ["VendorOrder", "Vendor"],
    }),

    // Mark order as packed
    markOrderPacked: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/pack`,
        method: "POST",
      }),
      invalidatesTags: ["VendorOrder", "Vendor"],
    }),
  }),
});

export const {
  useGetVendorProfileQuery,
  useGetVendorStatsQuery,
  useUpdateVendorProfileMutation,
  useGetVendorOrdersQuery,
  useGetVendorOrderQuery,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useMarkOrderPickedMutation,
  useMarkOrderPackedMutation,
} = vendorApi;
