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

/**
 * Payment API using RTK Query
 */
export const paymentApi = createApi({
  reducerPath: "paymentApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Payment", "Order"],
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
  }),
});

export const {
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
  useGetPaymentStatusQuery,
} = paymentApi;

