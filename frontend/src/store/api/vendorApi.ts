/**
 * Vendor API
 * Public vendor store endpoints
 */

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

export interface VendorStoreStats {
  total_products: number;
  active_products: number;
  categories_count: number;
  total_orders: number;
  total_reviews: number;
  rating: number;
  joined_date: string;
}

export interface VendorListResponse {
  items: Vendor[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface VendorOrder {
  id: string;
  order_number: string;
  buyer_id?: string;
  vendor_id?: string;
  buyer_name?: string;
  buyer_phone?: string;
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
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  created_at: string;
  updated_at?: string;
}

export const vendorApi = createApi({
  reducerPath: "vendorApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Vendor"],
  endpoints: (builder) => ({
    // Public: Get vendor by ID
    getVendor: builder.query<Vendor, string>({
      query: (vendorId) => `/vendor/${vendorId}`,
      providesTags: (result, error, vendorId) => [{ type: "Vendor", id: vendorId }],
    }),

    // Public: Get store statistics
    getVendorStoreStats: builder.query<VendorStoreStats, string>({
      query: (vendorId) => `/vendor/${vendorId}/store/stats`,
      providesTags: (result, error, vendorId) => [{ type: "Vendor", id: `${vendorId}-stats` }],
    }),

    // Public: List vendors
    getVendors: builder.query<
      VendorListResponse,
      { city?: string; search?: string; page?: number; size?: number }
    >({
      query: ({ city, search, page = 1, size = 20 }) => {
        const params = new URLSearchParams();
        if (city) params.append("city", city);
        if (search) params.append("search", search);
        params.append("page", page.toString());
        params.append("size", size.toString());
        return `/vendor?${params.toString()}`;
      },
      providesTags: ["Vendor"],
    }),

    // Authenticated: Register vendor shop
    registerVendor: builder.mutation<
      Vendor,
      {
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
    >({
      query: (vendorData) => ({
        url: `/vendor/register`,
        method: "POST",
        body: vendorData,
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Authenticated: Get vendor profile (for vendor dashboard)
    getVendorProfile: builder.query<Vendor, void>({
      query: () => `/vendor/profile`,
      providesTags: ["Vendor"],
    }),

    // Authenticated: Get vendor stats (for vendor dashboard)
    getVendorStats: builder.query<any, void>({
      query: () => `/vendor/stats`,
      providesTags: ["Vendor"],
    }),

    // Authenticated: Update vendor profile
    updateVendorProfile: builder.mutation<
      Vendor,
      {
        shop_name?: string;
        description?: string;
        phone?: string;
        address_line_1?: string;
        address_line_2?: string;
        city?: string;
        state?: string;
        pincode?: string;
      }
    >({
      query: (data) => ({
        url: `/vendor/profile`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Authenticated: Get vendor orders
    getVendorOrders: builder.query<
      { items: any[]; total: number; page: number; size: number; pages: number },
      { page?: number; size?: number; status?: string }
    >({
      query: ({ page = 1, size = 20, status }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (status) params.append("status", status);
        return `/vendor/orders?${params.toString()}`;
      },
      providesTags: ["Vendor"],
    }),

    // Authenticated: Get single vendor order by ID
    getVendorOrder: builder.query<VendorOrder, string>({
      query: (orderId) => `/vendor/orders/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: "Vendor", id: `order-${orderId}` }],
    }),

    // Accept order (PLACED -> CONFIRMED)
    acceptOrder: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Reject order
    rejectOrder: builder.mutation<any, { orderId: string; reason?: string }>({
      query: ({ orderId, reason }) => ({
        url: `/vendor/orders/${orderId}/reject`,
        method: "POST",
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Confirm order
    confirmOrder: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/confirm`,
        method: "POST",
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Mark order as picked (CONFIRMED -> PICKED)
    markOrderPicked: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/pick`,
        method: "POST",
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Mark order as packed (PICKED -> PACKED)
    markOrderPacked: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/pack`,
        method: "POST",
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Ship order (PACKED -> OUT_FOR_DELIVERY)
    shipOrder: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/ship`,
        method: "POST",
      }),
      invalidatesTags: ["Vendor"],
    }),

    // Deliver order (OUT_FOR_DELIVERY -> DELIVERED)
    deliverOrder: builder.mutation<any, string>({
      query: (orderId) => ({
        url: `/vendor/orders/${orderId}/deliver`,
        method: "POST",
      }),
      invalidatesTags: ["Vendor"],
    }),
  }),
});

export const {
  useGetVendorQuery,
  useGetVendorStoreStatsQuery,
  useGetVendorsQuery,
  useRegisterVendorMutation,
  useGetVendorProfileQuery,
  useGetVendorStatsQuery,
  useUpdateVendorProfileMutation,
  useGetVendorOrdersQuery,
  useGetVendorOrderQuery,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useConfirmOrderMutation,
  useMarkOrderPickedMutation,
  useMarkOrderPackedMutation,
  useShipOrderMutation,
  useDeliverOrderMutation,
} = vendorApi;
