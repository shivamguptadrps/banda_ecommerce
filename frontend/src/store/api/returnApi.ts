import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import {
  ReturnRequest,
  ReturnRequestCreate,
  ReturnRequestUpdate,
  ReturnRequestListResponse,
  ReturnStatus,
} from "@/types/return";

/**
 * Return Request API using RTK Query
 */
export const returnApi = createApi({
  reducerPath: "returnApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ReturnRequest"],
  endpoints: (builder) => ({
    // Create return request
    createReturnRequest: builder.mutation<
      ReturnRequest,
      { orderId: string; data: ReturnRequestCreate }
    >({
      query: ({ orderId, data }) => ({
        url: `/orders/${orderId}/return`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ReturnRequest"],
    }),

    // List return requests
    getReturnRequests: builder.query<
      ReturnRequestListResponse,
      {
        order_id?: string;
        status?: ReturnStatus;
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
        return `/returns?${params.toString()}`;
      },
      providesTags: ["ReturnRequest"],
    }),

    // Get return request by ID
    getReturnRequest: builder.query<ReturnRequest, string>({
      query: (returnRequestId) => `/returns/${returnRequestId}`,
      providesTags: (result, error, returnRequestId) => [
        { type: "ReturnRequest", id: returnRequestId },
      ],
    }),

    // Vendor: Approve/Reject return request
    vendorRespondToReturn: builder.mutation<
      ReturnRequest,
      { returnRequestId: string; data: ReturnRequestUpdate }
    >({
      query: ({ returnRequestId, data }) => ({
        url: `/vendor/returns/${returnRequestId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { returnRequestId }) => [
        { type: "ReturnRequest", id: returnRequestId },
        "ReturnRequest",
      ],
    }),

    // Admin: Approve return request
    adminApproveReturn: builder.mutation<
      ReturnRequest,
      { returnRequestId: string; notes?: string }
    >({
      query: ({ returnRequestId, notes }) => ({
        url: `/admin/returns/${returnRequestId}/approve`,
        method: "PUT",
        body: notes ? { admin_notes: notes } : {},
      }),
      invalidatesTags: (result, error, { returnRequestId }) => [
        { type: "ReturnRequest", id: returnRequestId },
        "ReturnRequest",
      ],
    }),

    // Admin: Reject return request
    adminRejectReturn: builder.mutation<
      ReturnRequest,
      { returnRequestId: string; notes: string }
    >({
      query: ({ returnRequestId, notes }) => ({
        url: `/admin/returns/${returnRequestId}/reject`,
        method: "PUT",
        body: { notes },
      }),
      invalidatesTags: (result, error, { returnRequestId }) => [
        { type: "ReturnRequest", id: returnRequestId },
        "ReturnRequest",
      ],
    }),
  }),
});

export const {
  useCreateReturnRequestMutation,
  useGetReturnRequestsQuery,
  useGetReturnRequestQuery,
  useVendorRespondToReturnMutation,
  useAdminApproveReturnMutation,
  useAdminRejectReturnMutation,
} = returnApi;

