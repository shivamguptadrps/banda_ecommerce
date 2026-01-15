import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import {
  Refund,
  RefundCreate,
  RefundListResponse,
  RefundStatus,
} from "@/types/refund";

/**
 * Refund API using RTK Query
 */
export const refundApi = createApi({
  reducerPath: "refundApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Refund"],
  endpoints: (builder) => ({
    // Create refund (Admin only)
    createRefund: builder.mutation<Refund, RefundCreate>({
      query: (data) => ({
        url: "/admin/refunds",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Refund", "ReturnRequest"],
    }),

    // List refunds (Admin only)
    getRefunds: builder.query<
      RefundListResponse,
      {
        order_id?: string;
        status?: RefundStatus;
        page?: number;
        size?: number;
      }
    >({
      query: ({ order_id, status, page = 1, size = 20 }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (order_id) params.append("order_id", order_id);
        if (status) params.append("status_filter", status);
        return `/admin/refunds?${params.toString()}`;
      },
      providesTags: ["Refund"],
    }),

    // Get refund by ID (Admin only)
    getRefund: builder.query<Refund, string>({
      query: (refundId) => `/admin/refunds/${refundId}`,
      providesTags: (result, error, refundId) => [
        { type: "Refund", id: refundId },
      ],
    }),
  }),
});

export const {
  useCreateRefundMutation,
  useGetRefundsQuery,
  useGetRefundQuery,
} = refundApi;

