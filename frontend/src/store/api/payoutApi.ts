import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import {
  VendorPayout,
  VendorPayoutListResponse,
  VendorEarningsSummary,
  PayoutGenerateRequest,
  PayoutProcessRequest,
  PayoutStatus,
} from "@/types/payout";

/**
 * Payout API using RTK Query
 */
export const payoutApi = createApi({
  reducerPath: "payoutApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Payout"],
  endpoints: (builder) => ({
    // ============== Vendor Endpoints ==============

    // Get vendor earnings summary
    getVendorEarnings: builder.query<VendorEarningsSummary, void>({
      query: () => "/vendor/earnings",
      providesTags: ["Payout"],
    }),

    // List vendor payouts
    getVendorPayouts: builder.query<
      VendorPayoutListResponse,
      {
        status?: PayoutStatus;
        page?: number;
        size?: number;
      }
    >({
      query: ({ status, page = 1, size = 20 }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (status) params.append("status_filter", status);
        return `/vendor/payouts?${params.toString()}`;
      },
      providesTags: ["Payout"],
    }),

    // Get vendor payout by ID
    getVendorPayout: builder.query<VendorPayout, string>({
      query: (payoutId) => `/vendor/payouts/${payoutId}`,
      providesTags: (result, error, payoutId) => [
        { type: "Payout", id: payoutId },
      ],
    }),

    // ============== Admin Endpoints ==============

    // List all payouts
    getAdminPayouts: builder.query<
      VendorPayoutListResponse,
      {
        vendor_id?: string;
        status?: PayoutStatus;
        page?: number;
        size?: number;
      }
    >({
      query: ({ vendor_id, status, page = 1, size = 20 }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (vendor_id) params.append("vendor_id", vendor_id);
        if (status) params.append("status_filter", status);
        return `/admin/payouts?${params.toString()}`;
      },
      providesTags: ["Payout"],
    }),

    // Get payout by ID
    getAdminPayout: builder.query<VendorPayout, string>({
      query: (payoutId) => `/admin/payouts/${payoutId}`,
      providesTags: (result, error, payoutId) => [
        { type: "Payout", id: payoutId },
      ],
    }),

    // Generate payout batch
    generatePayoutBatch: builder.mutation<VendorPayout[], PayoutGenerateRequest>({
      query: (data) => ({
        url: "/admin/payouts/generate",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Payout"],
    }),

    // Process payout
    processPayout: builder.mutation<
      VendorPayout,
      { payoutId: string; data: PayoutProcessRequest }
    >({
      query: ({ payoutId, data }) => ({
        url: `/admin/payouts/${payoutId}/process`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { payoutId }) => [
        { type: "Payout", id: payoutId },
        "Payout",
      ],
    }),
  }),
});

export const {
  // Vendor hooks
  useGetVendorEarningsQuery,
  useGetVendorPayoutsQuery,
  useGetVendorPayoutQuery,
  // Admin hooks
  useGetAdminPayoutsQuery,
  useGetAdminPayoutQuery,
  useGeneratePayoutBatchMutation,
  useProcessPayoutMutation,
} = payoutApi;

