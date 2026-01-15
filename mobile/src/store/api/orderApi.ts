import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import { Order, OrderCreate, OrderListResponse } from "@/types/order";

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
    getOrders: builder.query<
      OrderListResponse,
      { page?: number; size?: number; status?: string }
    >({
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
    cancelOrder: builder.mutation<Order, { orderId: string; reason: string }>({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: "Order", id: orderId }],
    }),

    // Track order by order number
    trackOrder: builder.query<Order, string>({
      query: (orderNumber) => `/orders/track/${orderNumber}`,
      providesTags: (result, error, orderNumber) =>
        result ? [{ type: "Order", id: result.id }] : [],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderQuery,
  useGetOrdersQuery,
  useCancelOrderMutation,
  useTrackOrderQuery,
} = orderApi;

