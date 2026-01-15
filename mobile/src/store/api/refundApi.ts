import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import {
  Refund,
  RefundCreate,
  RefundListResponse,
  RefundStatus,
} from "@/types/refund";

/**
 * Refund API using RTK Query (Admin only - for future use)
 */
export const refundApi = createApi({
  reducerPath: "refundApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Refund"],
  endpoints: (builder) => ({
    // List refunds (Admin only - for future admin app)
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

    // Get refund by ID
    getRefund: builder.query<Refund, string>({
      query: (refundId) => `/admin/refunds/${refundId}`,
      providesTags: (result, error, refundId) => [
        { type: "Refund", id: refundId },
      ],
    }),
  }),
});

export const {
  useGetRefundsQuery,
  useGetRefundQuery,
} = refundApi;

