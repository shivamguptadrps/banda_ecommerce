import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Delivery Partner Types
 */
export interface DeliveryPartnerLogin {
  phone: string;
  otp: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_active: boolean;
  is_available: boolean;
}

export interface DeliveryPartnerOrder {
  id: string;
  order_number: string;
  buyer_name?: string;
  buyer_phone?: string;
  delivery_address_snapshot?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  total_amount: number;
  payment_mode: "online" | "cod";
  payment_status: string;
  order_status: string;
  delivery_otp?: string;
  placed_at: string;
  confirmed_at?: string;
  picked_at?: string;
  packed_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  total_items: number;
  items: Array<{
    product_name: string;
    quantity: number;
    sell_unit_label: string;
    total_price: number;
    price_per_unit?: number;
    product_image?: string;
    product_images?: string[];
    product_description?: string;
  }>;
  vendor_info?: {
    id: string;
    shop_name: string;
    phone?: string;
    email?: string;
  };
}

export interface DeliveryPartnerOrderListResponse {
  items: DeliveryPartnerOrder[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DeliveryOTPRequest {
  delivery_otp: string;
  cod_collected?: boolean;
}

export interface DeliveryFailureRequest {
  failure_reason: string;
  failure_notes?: string;
}

export interface DeliveryPartnerLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  delivery_partner: DeliveryPartner;
}

export interface DeliveryStats {
  total_deliveries: number;
  successful: number;
  failed: number;
  success_rate: number;
  total_orders_assigned: number;
  today_assigned: number;
  today_delivered: number;
  today_cod_revenue: number;
  week_delivered: number;
  month_delivered: number;
  currently_assigned: number;
  pending_deliveries: number;
  cod_total: number;
  cod_collected: number;
  cod_collection_rate: number;
  cod_revenue: number;
  avg_delivery_time_minutes: number | null;
}

/**
 * Delivery Partner API using RTK Query
 */
export const deliveryPartnerApi = createApi({
  reducerPath: "deliveryPartnerApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["DeliveryPartner", "DeliveryPartnerOrder"],
  endpoints: (builder) => ({
    // Login
    login: builder.mutation<DeliveryPartnerLoginResponse, DeliveryPartnerLogin>({
      query: (data) => ({
        url: "/delivery-partner/login",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DeliveryPartner"],
    }),

    // Get profile
    getProfile: builder.query<DeliveryPartner, void>({
      query: () => "/delivery-partner/profile",
      providesTags: ["DeliveryPartner"],
    }),

    // List orders
    getOrders: builder.query<
      DeliveryPartnerOrderListResponse,
      { page?: number; size?: number; status?: string }
    >({
      query: ({ page = 1, size = 10, status }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (status) params.append("status", status);
        return `/delivery-partner/orders?${params.toString()}`;
      },
      providesTags: ["DeliveryPartnerOrder"],
    }),

    // Get order by ID
    getOrder: builder.query<DeliveryPartnerOrder, string>({
      query: (orderId) => `/delivery-partner/orders/${orderId}`,
      providesTags: (result, error, orderId) => [
        { type: "DeliveryPartnerOrder", id: orderId },
      ],
    }),

    // Mark order as delivered
    markDelivered: builder.mutation<
      DeliveryPartnerOrder,
      { orderId: string; otpData: DeliveryOTPRequest }
    >({
      query: ({ orderId, otpData }) => ({
        url: `/delivery-partner/orders/${orderId}/deliver`,
        method: "POST",
        body: otpData,
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "DeliveryPartnerOrder", id: orderId },
        "DeliveryPartnerOrder",
      ],
    }),

    // Mark delivery as failed
    markFailed: builder.mutation<
      { message: string; delivery_history_id: string; attempt_number: number },
      { orderId: string; failureData: DeliveryFailureRequest }
    >({
      query: ({ orderId, failureData }) => ({
        url: `/delivery-partner/orders/${orderId}/fail`,
        method: "POST",
        body: failureData,
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "DeliveryPartnerOrder", id: orderId },
        "DeliveryPartnerOrder",
      ],
    }),

    // Retry delivery
    retryDelivery: builder.mutation<
      { message: string; delivery_history_id: string; attempt_number: number },
      string
    >({
      query: (orderId) => ({
        url: `/delivery-partner/orders/${orderId}/retry`,
        method: "POST",
      }),
      invalidatesTags: (result, error, orderId) => [
        { type: "DeliveryPartnerOrder", id: orderId },
        "DeliveryPartnerOrder",
      ],
    }),

    // Return order to vendor
    returnOrder: builder.mutation<
      { message: string; order_id: string; order_status: string },
      { orderId: string; returnReason?: string }
    >({
      query: ({ orderId, returnReason }) => ({
        url: `/delivery-partner/orders/${orderId}/return`,
        method: "POST",
        body: returnReason ? { return_reason: returnReason } : undefined,
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "DeliveryPartnerOrder", id: orderId },
        "DeliveryPartnerOrder",
      ],
    }),

    // Get delivery statistics
    getStats: builder.query<DeliveryStats, void>({
      query: () => "/delivery-partner/stats",
      providesTags: ["DeliveryPartner"],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetProfileQuery,
  useGetOrdersQuery,
  useGetOrderQuery,
  useMarkDeliveredMutation,
  useMarkFailedMutation,
  useRetryDeliveryMutation,
  useReturnOrderMutation,
  useGetStatsQuery,
} = deliveryPartnerApi;

