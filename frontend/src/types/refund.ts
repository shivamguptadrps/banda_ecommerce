/**
 * Refund Types
 */

export type RefundStatus = "initiated" | "processed" | "failed";

export interface Refund {
  id: string;
  order_id: string;
  payment_id?: string;
  return_request_id?: string;
  amount: number;
  razorpay_refund_id?: string;
  status: RefundStatus;
  failure_reason?: string;
  created_at: string;
  processed_at?: string;
  // Related data
  order_number?: string;
}

export interface RefundCreate {
  return_request_id: string;
  amount?: number;
  reason?: string;
}

export interface RefundListResponse {
  items: Refund[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

