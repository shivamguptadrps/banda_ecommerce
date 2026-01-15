/**
 * Vendor Payout Types
 */

export type PayoutStatus = "pending" | "processed" | "failed";

export interface VendorPayoutItem {
  id: string;
  payout_id: string;
  order_id?: string;
  order_amount: number;
  commission: number;
  net_amount: number;
  created_at: string;
  // Related data
  order_number?: string;
}

export interface VendorPayout {
  id: string;
  vendor_id: string;
  period_start: string; // ISO date string
  period_end: string; // ISO date string
  total_orders: number;
  gross_amount: number;
  commission_amount: number;
  refund_deductions: number;
  net_amount: number;
  status: PayoutStatus;
  transaction_id?: string;
  created_at: string;
  processed_at?: string;
  // Related data
  vendor_name?: string;
  items?: VendorPayoutItem[];
}

export interface PayoutGenerateRequest {
  vendor_id?: string;
  period_start: string; // ISO date string
  period_end: string; // ISO date string
}

export interface PayoutProcessRequest {
  transaction_id?: string;
  notes?: string;
}

export interface VendorPayoutListResponse {
  items: VendorPayout[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface VendorEarningsSummary {
  total_earnings: number;
  pending_payouts: number;
  processed_payouts: number;
  current_period_earnings: number;
  total_orders: number;
  commission_rate: number;
}

