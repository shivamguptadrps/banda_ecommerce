/**
 * Return Request Types for Mobile App
 */

export type ReturnStatus = "requested" | "approved" | "rejected" | "completed";
export type ReturnReason = "damaged" | "wrong_item" | "quality" | "other";

export interface ReturnRequest {
  id: string;
  order_id: string;
  order_item_id: string;
  buyer_id?: string;
  reason: ReturnReason;
  description?: string;
  images?: string[];
  status: ReturnStatus;
  refund_amount: number;
  admin_notes?: string;
  vendor_notes?: string;
  created_at: string;
  resolved_at?: string;
  // Related data
  order_number?: string;
  product_name?: string;
  order_item_quantity?: number;
}

export interface ReturnRequestCreate {
  order_item_id: string;
  reason: ReturnReason;
  description?: string;
  images?: string[];
}

export interface ReturnRequestUpdate {
  status?: ReturnStatus;
  admin_notes?: string;
  vendor_notes?: string;
  refund_amount?: number;
}

export interface ReturnRequestListResponse {
  items: ReturnRequest[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

