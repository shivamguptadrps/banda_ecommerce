import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Analytics API using RTK Query
 */

// Vendor Analytics Types
export interface VendorDashboardStats {
  total_revenue: number;
  today_revenue: number;
  week_revenue: number;
  month_revenue: number;
  total_orders: number;
  today_orders: number;
  pending_orders: number;
  total_products: number;
  active_products: number;
  avg_order_value: number;
}

export interface SalesReportItem {
  period: string;
  order_count: number;
  revenue: number;
  avg_order_value: number;
}

export interface VendorSalesReport {
  items: SalesReportItem[];
  total_revenue: number;
  total_orders: number;
}

export interface ProductPerformanceItem {
  product_id: string;
  product_name: string;
  primary_image: string | null;
  order_count: number;
  total_quantity_sold: number;
  total_revenue: number;
}

export interface VendorProductPerformance {
  products: ProductPerformanceItem[];
}

// Admin Analytics Types
export interface AdminDashboardStats {
  total_vendors: number;
  verified_vendors: number;
  total_products: number;
  active_products: number;
  total_orders: number;
  today_orders: number;
  pending_orders: number;
  total_revenue: number;
  today_revenue: number;
  month_revenue: number;
  total_users: number;
  total_buyers: number;
}

export interface VendorPerformanceItem {
  vendor_id: string;
  shop_name: string;
  logo_url: string | null;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
}

export interface VendorPerformanceReport {
  vendors: VendorPerformanceItem[];
}

export interface RevenueReportItem {
  period: string;
  order_count: number;
  revenue: number;
  avg_order_value: number;
}

export interface RevenueReport {
  items: RevenueReportItem[];
  total_revenue: number;
  total_orders: number;
}

export interface DeliveryPartnerPerformanceItem {
  delivery_partner_id: string;
  name: string;
  phone: string;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  cod_collected: number;
}

export interface DeliveryPartnerPerformanceReport {
  delivery_partners: DeliveryPartnerPerformanceItem[];
}

export const analyticsApi = createApi({
  reducerPath: "analyticsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Analytics"],
  endpoints: (builder) => ({
    // Vendor Analytics
    getVendorDashboardStats: builder.query<VendorDashboardStats, void>({
      query: () => "/vendor/analytics/dashboard",
      providesTags: ["Analytics"],
    }),

    getVendorSalesReport: builder.query<
      VendorSalesReport,
      {
        start_date?: string; // YYYY-MM-DD
        end_date?: string; // YYYY-MM-DD
        group_by?: "day" | "week" | "month";
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.start_date) searchParams.append("start_date", params.start_date);
        if (params.end_date) searchParams.append("end_date", params.end_date);
        if (params.group_by) searchParams.append("group_by", params.group_by);
        return `/vendor/analytics/sales?${searchParams.toString()}`;
      },
      providesTags: ["Analytics"],
    }),

    getVendorProductPerformance: builder.query<
      VendorProductPerformance,
      { limit?: number }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append("limit", params.limit.toString());
        return `/vendor/analytics/products?${searchParams.toString()}`;
      },
      providesTags: ["Analytics"],
    }),

    // Admin Analytics
    getAdminDashboardStats: builder.query<AdminDashboardStats, void>({
      query: () => "/admin/analytics/dashboard",
      providesTags: ["Analytics"],
    }),

    getVendorPerformanceReport: builder.query<
      VendorPerformanceReport,
      { limit?: number }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append("limit", params.limit.toString());
        return `/admin/analytics/vendors?${searchParams.toString()}`;
      },
      providesTags: ["Analytics"],
    }),

    getRevenueReport: builder.query<
      RevenueReport,
      {
        start_date?: string; // YYYY-MM-DD
        end_date?: string; // YYYY-MM-DD
        group_by?: "day" | "week" | "month";
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.start_date) searchParams.append("start_date", params.start_date);
        if (params.end_date) searchParams.append("end_date", params.end_date);
        if (params.group_by) searchParams.append("group_by", params.group_by);
        return `/admin/analytics/revenue?${searchParams.toString()}`;
      },
      providesTags: ["Analytics"],
    }),

    getDeliveryPartnerPerformanceReport: builder.query<
      DeliveryPartnerPerformanceReport,
      { limit?: number }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append("limit", params.limit.toString());
        return `/admin/analytics/delivery-partners?${searchParams.toString()}`;
      },
      providesTags: ["Analytics"],
    }),
  }),
});

export const {
  // Vendor Analytics
  useGetVendorDashboardStatsQuery,
  useGetVendorSalesReportQuery,
  useGetVendorProductPerformanceQuery,
  // Admin Analytics
  useGetAdminDashboardStatsQuery,
  useGetVendorPerformanceReportQuery,
  useGetRevenueReportQuery,
  useGetDeliveryPartnerPerformanceReportQuery,
} = analyticsApi;

