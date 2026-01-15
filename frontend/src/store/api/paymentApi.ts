import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Payment Types
 */
export interface PaymentCreate {
  order_id: string;
  amount: number;
  currency?: string;
}

export interface PaymentVerify {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface Payment {
  id: string;
  order_id: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount: number;
  currency: string;
  status: "pending" | "created" | "authorized" | "captured" | "paid" | "failed" | "refunded";
  method?: string;
  failure_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface PaymentLog {
  id: string;
  payment_id: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface PaymentCreateOrderResponse {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  order_id: string;
  key_id: string; // Razorpay key ID for frontend
}

export interface PaymentStatusResponse {
  payment?: Payment;
  order_status: string;
  payment_status: string;
}

export interface PaymentListResponse {
  items: Payment[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PaymentLogListResponse {
  items: PaymentLog[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DuplicatePaymentDetection {
  order_id: string;
  duplicate_payments: Payment[];
  total_amount: number;
  status: "duplicate_detected" | "no_duplicate" | "requires_review";
}

/**
 * Payment API using RTK Query
 */
export const paymentApi = createApi({
  reducerPath: "paymentApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Payment", "PaymentLog"],
  endpoints: (builder) => ({
    // Create Razorpay order
    createPaymentOrder: builder.mutation<PaymentCreateOrderResponse, PaymentCreate>({
      query: (data) => ({
        url: "/payments/create-order",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Payment"],
    }),

    // Verify payment
    verifyPayment: builder.mutation<Payment, PaymentVerify>({
      query: (data) => ({
        url: "/payments/verify",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Payment", "Order"], // Invalidate order to refresh status
    }),

    // Get payment status
    getPaymentStatus: builder.query<PaymentStatusResponse, string>({
      query: (orderId) => `/payments/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: "Payment", id: orderId }],
    }),

    // ============== Vendor Payment Endpoints ==============

    // Get payments for vendor order
    getVendorOrderPayments: builder.query<PaymentListResponse, string>({
      query: (orderId) => `/payments/vendor/orders/${orderId}/payments`,
      providesTags: (result, error, orderId) => [
        { type: "Payment", id: `order-${orderId}` },
      ],
    }),

    // Get payment logs for vendor
    getVendorPaymentLogs: builder.query<
      PaymentLogListResponse,
      { orderId: string; paymentId: string; page?: number; size?: number }
    >({
      query: ({ orderId, paymentId, page = 1, size = 50 }) =>
        `/payments/vendor/orders/${orderId}/payments/${paymentId}/logs?page=${page}&size=${size}`,
      providesTags: (result, error, { paymentId }) => [
        { type: "PaymentLog", id: paymentId },
      ],
    }),

    // Check for duplicate payments (Vendor)
    checkDuplicatePaymentsVendor: builder.query<DuplicatePaymentDetection, string>({
      query: (orderId) => `/payments/vendor/orders/${orderId}/payments/duplicate-check`,
      providesTags: (result, error, orderId) => [
        { type: "Payment", id: `duplicate-${orderId}` },
      ],
    }),

    // ============== Admin Payment Endpoints ==============

    // List all payments (Admin) - Enhanced
    getAdminPayments: builder.query<
      PaymentListResponse,
      {
        page?: number;
        size?: number;
        status?: string;
        order_id?: string;
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        date_from?: string;
        date_to?: string;
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.size) searchParams.append("size", params.size.toString());
        if (params.status) searchParams.append("status", params.status);
        if (params.order_id) searchParams.append("order_id", params.order_id);
        if (params.razorpay_order_id)
          searchParams.append("razorpay_order_id", params.razorpay_order_id);
        if (params.razorpay_payment_id)
          searchParams.append("razorpay_payment_id", params.razorpay_payment_id);
        if (params.date_from) searchParams.append("date_from", params.date_from);
        if (params.date_to) searchParams.append("date_to", params.date_to);
        return `/payments/admin/payments?${searchParams.toString()}`;
      },
      providesTags: ["Payment"],
    }),

    // Get payment with logs (Admin)
    getAdminPaymentWithLogs: builder.query<Payment & { logs: PaymentLog[] }, string>({
      query: (paymentId) => `/payments/admin/payments/${paymentId}`,
      providesTags: (result, error, paymentId) => [
        { type: "Payment", id: paymentId },
        { type: "PaymentLog", id: paymentId },
      ],
    }),

    // Get payment logs (Admin)
    getAdminPaymentLogs: builder.query<
      PaymentLogListResponse,
      { paymentId: string; page?: number; size?: number }
    >({
      query: ({ paymentId, page = 1, size = 50 }) =>
        `/payments/admin/payments/${paymentId}/logs?page=${page}&size=${size}`,
      providesTags: (result, error, { paymentId }) => [
        { type: "PaymentLog", id: paymentId },
      ],
    }),

    // Check all duplicate payments (Admin)
    checkAllDuplicatePayments: builder.query<
      DuplicatePaymentDetection[],
      { order_id?: string }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.order_id) searchParams.append("order_id", params.order_id);
        return `/payments/admin/payments/duplicate-check?${searchParams.toString()}`;
      },
      providesTags: ["Payment"],
    }),

    // Initiate refund (Admin)
    initiateRefund: builder.mutation<
      { refund_id: string; payment_id: string; amount: number; status: string; created_at: string },
      { paymentId: string; amount?: number; reason?: string }
    >({
      query: ({ paymentId, amount, reason }) => ({
        url: `/payments/admin/payments/${paymentId}/refund`,
        method: "POST",
        body: { amount, reason },
      }),
      invalidatesTags: ["Payment"],
    }),
  }),
});

export const {
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
  useGetPaymentStatusQuery,
  // Vendor hooks
  useGetVendorOrderPaymentsQuery,
  useGetVendorPaymentLogsQuery,
  useCheckDuplicatePaymentsVendorQuery,
  // Admin hooks
  useGetAdminPaymentsQuery,
  useGetAdminPaymentWithLogsQuery,
  useGetAdminPaymentLogsQuery,
  useCheckAllDuplicatePaymentsQuery,
  useInitiateRefundMutation,
} = paymentApi;
