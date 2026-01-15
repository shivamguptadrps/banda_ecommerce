import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import {
  Vendor,
  Category,
  PaginatedResponse,
  CategoryAttribute,
  CategoryAttributeCreate,
  CategoryAttributeUpdate,
  CategoryAttributeListResponse,
  AttributeSegment,
  AttributeSegmentCreate,
  AttributeSegmentUpdate,
  AttributeSegmentListResponse,
  AttributeSegmentWithAttributes,
} from "@/types";

/**
 * Admin Vendor Response (includes admin-specific fields)
 */
export interface AdminVendor extends Vendor {
  user_email?: string;
  user_name?: string;
  user_phone?: string;
  rejection_reason?: string;
}

/**
 * Vendor Approval Request
 */
export interface VendorApprovalRequest {
  is_verified: boolean;
  commission_percent?: number;
  notes?: string;
}

/**
 * Vendor Suspend Request
 */
export interface VendorSuspendRequest {
  is_active: boolean;
}

/**
 * Service Zone
 */
export interface ServiceZone {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  delivery_fee: number;
  min_order_value: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Service Zone Create
 */
export interface ServiceZoneCreate {
  name: string;
  city: string;
  state: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  delivery_fee: number;
  min_order_value: number;
}

/**
 * Delivery Partner
 */
export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Delivery Partner Create
 */
export interface DeliveryPartnerCreate {
  name: string;
  phone: string;
  vehicle_type?: string;
  vehicle_number?: string;
  email?: string;
  password?: string;
}

/**
 * Delivery Partner Update
 */
export interface DeliveryPartnerUpdate {
  name?: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_active?: boolean;
  is_available?: boolean;
}

/**
 * Vendor Analytics
 */
export interface VendorAnalytics {
  total_revenue: number;
  today_revenue: number;
  week_revenue: number;
  month_revenue: number;
  total_orders: number;
  today_orders: number;
  week_orders: number;
  month_orders: number;
  status_breakdown: Record<string, number>;
  payment_breakdown: Record<string, { count: number; revenue: number }>;
  avg_order_value: number;
}

/**
 * Vendor List Analytics Item
 */
export interface VendorListAnalyticsItem {
  vendor_id: string;
  shop_name: string;
  email: string;
  phone: string;
  is_verified: boolean;
  is_active: boolean;
  city?: string;
  logo_url?: string;
  total_orders: number;
  total_revenue: number;
  today_orders: number;
  today_revenue: number;
  product_count: number;
  avg_order_value: number;
}

/**
 * Delivery Partner Analytics
 */
export interface DeliveryPartnerAnalytics {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  today_assigned: number;
  today_delivered: number;
  week_assigned: number;
  week_delivered: number;
  month_assigned: number;
  month_delivered: number;
  cod_total_orders: number;
  cod_collected: number;
  cod_collection_rate: number;
  avg_delivery_time_minutes: number;
  status_breakdown: Record<string, number>;
}

/**
 * Delivery Partner List Analytics Item
 */
export interface DeliveryPartnerListAnalyticsItem {
  delivery_partner_id: string;
  name: string;
  phone: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_active: boolean;
  is_available: boolean;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  today_assigned: number;
  today_delivered: number;
  cod_collected: number;
  avg_delivery_time_minutes: number;
}

/**
 * Vendor Analytics
 */
export interface VendorAnalytics {
  total_revenue: number;
  today_revenue: number;
  week_revenue: number;
  month_revenue: number;
  total_orders: number;
  today_orders: number;
  week_orders: number;
  month_orders: number;
  status_breakdown: Record<string, number>;
  payment_breakdown: Record<string, { count: number; revenue: number }>;
  avg_order_value: number;
}

/**
 * Vendor List Analytics Item
 */
export interface VendorListAnalyticsItem {
  vendor_id: string;
  shop_name: string;
  email: string;
  phone: string;
  is_verified: boolean;
  is_active: boolean;
  city?: string;
  logo_url?: string;
  total_orders: number;
  total_revenue: number;
  today_orders: number;
  today_revenue: number;
  product_count: number;
  avg_order_value: number;
}

/**
 * Delivery Partner Analytics
 */
export interface DeliveryPartnerAnalytics {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  today_assigned: number;
  today_delivered: number;
  week_assigned: number;
  week_delivered: number;
  month_assigned: number;
  month_delivered: number;
  cod_total_orders: number;
  cod_collected: number;
  cod_collection_rate: number;
  avg_delivery_time_minutes: number;
  status_breakdown: Record<string, number>;
}

/**
 * Delivery Partner List Analytics Item
 */
export interface DeliveryPartnerListAnalyticsItem {
  delivery_partner_id: string;
  name: string;
  phone: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_active: boolean;
  is_available: boolean;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  today_assigned: number;
  today_delivered: number;
  cod_collected: number;
  avg_delivery_time_minutes: number;
}

/**
 * Dashboard Stats
 */
export interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  active_vendors: number;
  total_products: number;
  pending_vendors: number;
  today_orders: number;
  today_revenue: number;
}

/**
 * Order Status
 */
export type OrderStatus = 
  | "placed" 
  | "confirmed" 
  | "picked" 
  | "packed" 
  | "out_for_delivery" 
  | "delivered" 
  | "cancelled" 
  | "returned"
  | "pending"  // Legacy: maps to placed
  | "processing"  // Legacy: maps to picked
  | "ready"  // Legacy: maps to packed
  | "shipped";  // Legacy: maps to out_for_delivery

/**
 * Admin Order
 */
export interface AdminOrder {
  id: string;
  order_number: string;
  buyer_id: string;
  vendor_id: string;
  delivery_address_id: string;
  total_amount: number;
  delivery_fee: number;
  grand_total: number;
  status: OrderStatus;
  payment_mode: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Joined fields
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  vendor?: {
    id: string;
    shop_name: string;
  };
  items?: Array<{
    id: string;
    product_name: string;
    sell_unit_label: string;
    quantity: number;
    price_locked: number;
    total: number;
  }>;
}

/**
 * Order Stats
 */
export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  delivered_today: number;
  total_revenue: number;
}

/**
 * Admin API using RTK Query
 */
export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["AdminVendor", "AdminCategory", "AdminOrder", "ServiceZone", "DashboardStats", "CategoryAttribute", "AttributeSegment", "DeliveryPartner", "Coupon"],
  endpoints: (builder) => ({
    // ============== Dashboard ==============
    
    // Get dashboard stats (mock for now, can add backend endpoint later)
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => "/admin/stats",
      providesTags: ["DashboardStats"],
    }),

    // ============== Vendor Management ==============

    // Get all vendors
    getAdminVendors: builder.query<
      PaginatedResponse<AdminVendor>,
      { page?: number; size?: number; city?: string; is_verified?: boolean; is_active?: boolean; search?: string }
    >({
      query: ({ page = 1, size = 20, city, is_verified, is_active, search }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (city) params.append("city", city);
        if (is_verified !== undefined) params.append("is_verified", is_verified.toString());
        if (is_active !== undefined) params.append("is_active", is_active.toString());
        if (search) params.append("search", search);
        return `/admin/vendors?${params.toString()}`;
      },
      providesTags: ["AdminVendor"],
    }),

    // Get pending vendors
    getPendingVendors: builder.query<PaginatedResponse<AdminVendor>, { page?: number; size?: number }>({
      query: ({ page = 1, size = 20 }) => `/admin/vendors/pending?page=${page}&size=${size}`,
      providesTags: ["AdminVendor"],
    }),

    // Get vendor details
    getAdminVendorById: builder.query<AdminVendor, string>({
      query: (id) => `/admin/vendors/${id}`,
      providesTags: (result, error, id) => [{ type: "AdminVendor", id }],
    }),

    // Approve/Reject vendor
    approveVendor: builder.mutation<AdminVendor, { id: string; data: VendorApprovalRequest }>({
      query: ({ id, data }) => ({
        url: `/admin/vendors/${id}/approve`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AdminVendor"],
    }),

    // Suspend/Reactivate vendor
    suspendVendor: builder.mutation<AdminVendor, { id: string; data: VendorSuspendRequest }>({
      query: ({ id, data }) => ({
        url: `/admin/vendors/${id}/suspend`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AdminVendor"],
    }),

    // ============== Category Management ==============

    // Get all categories (admin view - includes inactive)
    getAdminCategories: builder.query<{ items: Category[]; total: number }, { include_inactive?: boolean }>({
      query: ({ include_inactive = true }) => `/admin/categories?include_inactive=${include_inactive}`,
      providesTags: ["AdminCategory"],
    }),

    // Create category
    createCategory: builder.mutation<Category, { name: string; parent_id?: string; description?: string; image_url?: string }>({
      query: (data) => ({
        url: "/admin/categories",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AdminCategory"],
    }),

    // Update category
    updateCategory: builder.mutation<Category, { id: string; data: { name?: string; is_active?: boolean; description?: string; parent_id?: string } }>({
      query: ({ id, data }) => ({
        url: `/admin/categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AdminCategory"],
    }),

    // Delete category
    deleteCategory: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdminCategory"],
    }),

    // Upload category image
    uploadCategoryImage: builder.mutation<Category, { categoryId: string; file: File }>({
      query: ({ categoryId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/admin/categories/${categoryId}/upload-image`,
          method: "POST",
          body: formData,
          prepareHeaders: (headers) => {
            headers.delete("Content-Type"); // Let browser set Content-Type with boundary
            return headers;
          },
        };
      },
      invalidatesTags: ["AdminCategory", "Category"],
    }),

    // ============== Service Zone Management ==============

    // Get service zones
    getServiceZones: builder.query<
      PaginatedResponse<ServiceZone>,
      { page?: number; size?: number; city?: string; is_active?: boolean }
    >({
      query: ({ page = 1, size = 20, city, is_active }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (city) params.append("city", city);
        if (is_active !== undefined) params.append("is_active", is_active.toString());
        return `/admin/service-zones?${params.toString()}`;
      },
      providesTags: ["ServiceZone"],
    }),

    // Create service zone
    createServiceZone: builder.mutation<ServiceZone, ServiceZoneCreate>({
      query: (data) => ({
        url: "/admin/service-zones",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ServiceZone"],
    }),

    // Update service zone
    updateServiceZone: builder.mutation<ServiceZone, { id: string; data: Partial<ServiceZoneCreate> & { is_active?: boolean } }>({
      query: ({ id, data }) => ({
        url: `/admin/service-zones/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ServiceZone"],
    }),

    // Delete service zone
    deleteServiceZone: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/service-zones/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ServiceZone"],
    }),

    // ============== Order Management ==============

    // Get all orders
    getAdminOrders: builder.query<
      PaginatedResponse<AdminOrder>,
      { page?: number; size?: number; status?: OrderStatus; vendor_id?: string; search?: string }
    >({
      query: ({ page = 1, size = 20, status, vendor_id, search }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (status) params.append("status", status);
        if (vendor_id) params.append("vendor_id", vendor_id);
        if (search) params.append("search", search);
        return `/admin/orders?${params.toString()}`;
      },
      transformResponse: (response: any) => {
        // Transform order_status to status for frontend compatibility
        if (response?.items) {
          response.items = response.items.map((order: any) => ({
            ...order,
            status: order.order_status || order.status,
            grand_total: order.total_amount || order.grand_total,
          }));
        }
        return response;
      },
      providesTags: ["AdminOrder"],
    }),

    // Get order stats
    getOrderStats: builder.query<OrderStats, void>({
      query: () => "/admin/orders/stats",
      providesTags: ["AdminOrder"],
    }),

    // Get order by ID
    getAdminOrderById: builder.query<AdminOrder, string>({
      query: (id) => `/admin/orders/${id}`,
      providesTags: (result, error, id) => [{ type: "AdminOrder", id }],
    }),

    // Update order status
    updateOrderStatus: builder.mutation<AdminOrder, { id: string; status: OrderStatus }>({
      query: ({ id, status }) => ({
        url: `/admin/orders/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["AdminOrder"],
    }),

    // Assign order to delivery partner
    assignOrderToDeliveryPartner: builder.mutation<AdminOrder, { id: string; delivery_partner_id: string }>({
      query: ({ id, delivery_partner_id }) => ({
        url: `/admin/orders/${id}/assign-delivery-partner`,
        method: "POST",
        body: { delivery_partner_id },
      }),
      invalidatesTags: ["AdminOrder"],
    }),

    // ============== Category Attributes ==============

    // Get attributes for a category (including inherited)
    getCategoryAttributes: builder.query<
      CategoryAttributeListResponse,
      { categoryId: string; ownOnly?: boolean; includeInactive?: boolean }
    >({
      query: ({ categoryId, ownOnly = false, includeInactive = false }) => {
        const params = new URLSearchParams();
        if (ownOnly) params.append("own_only", "true");
        if (includeInactive) params.append("include_inactive", "true");
        return `/admin/categories/${categoryId}/attributes?${params.toString()}`;
      },
      providesTags: (result, error, { categoryId }) => [
        { type: "CategoryAttribute", id: categoryId },
        "CategoryAttribute",
      ],
    }),

    // Get single attribute
    getAttribute: builder.query<CategoryAttribute, string>({
      query: (id) => `/admin/attributes/${id}`,
      providesTags: (result, error, id) => [{ type: "CategoryAttribute", id }],
    }),

    // Create attribute
    createAttribute: builder.mutation<CategoryAttribute, CategoryAttributeCreate>({
      query: (data) => ({
        url: `/admin/categories/${data.category_id}/attributes`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["CategoryAttribute"],
    }),

    // Update attribute
    updateAttribute: builder.mutation<CategoryAttribute, { id: string; data: CategoryAttributeUpdate }>({
      query: ({ id, data }) => ({
        url: `/admin/attributes/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["CategoryAttribute"],
    }),

    // Delete attribute
    deleteAttribute: builder.mutation<{ message: string }, { id: string; hardDelete?: boolean }>({
      query: ({ id, hardDelete = false }) => ({
        url: `/admin/attributes/${id}?hard_delete=${hardDelete}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CategoryAttribute"],
    }),

    // ============== Attribute Segments ==============

    // Get segments for a category
    getCategorySegments: builder.query<
      AttributeSegmentListResponse,
      { categoryId: string; includeInactive?: boolean; withAttributes?: boolean }
    >({
      query: ({ categoryId, includeInactive = false, withAttributes = false }) => {
        const params = new URLSearchParams();
        if (includeInactive) params.append("include_inactive", "true");
        if (withAttributes) params.append("with_attributes", "true");
        return `/admin/categories/${categoryId}/segments?${params.toString()}`;
      },
      providesTags: (result, error, { categoryId }) => [
        { type: "AttributeSegment", id: categoryId },
        "AttributeSegment",
      ],
    }),

    // Get single segment
    getSegment: builder.query<AttributeSegmentWithAttributes, string>({
      query: (id) => `/admin/segments/${id}`,
      providesTags: (result, error, id) => [{ type: "AttributeSegment", id }],
    }),

    // Create segment
    createSegment: builder.mutation<AttributeSegment, AttributeSegmentCreate>({
      query: (data) => ({
        url: `/admin/categories/${data.category_id}/segments`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AttributeSegment", "CategoryAttribute"],
    }),

    // Update segment
    updateSegment: builder.mutation<AttributeSegment, { id: string; data: AttributeSegmentUpdate }>({
      query: ({ id, data }) => ({
        url: `/admin/segments/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AttributeSegment"],
    }),

    // Delete segment
    deleteSegment: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/segments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AttributeSegment", "CategoryAttribute"],
    }),

    // Reorder segments
    reorderSegments: builder.mutation<
      { message: string },
      { categoryId: string; segmentOrders: Array<{ segment_id: string; display_order: number }> }
    >({
      query: ({ categoryId, segmentOrders }) => ({
        url: `/admin/categories/${categoryId}/segments/reorder`,
        method: "POST",
        body: segmentOrders,
      }),
      invalidatesTags: ["AttributeSegment"],
    }),

    // ============== Delivery Partner Management ==============

    // Get delivery partners
    getDeliveryPartners: builder.query<
      PaginatedResponse<DeliveryPartner>,
      { page?: number; size?: number; is_active?: boolean; is_available?: boolean; search?: string }
    >({
      query: ({ page = 1, size = 20, is_active, is_available, search }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (is_active !== undefined) params.append("is_active", is_active.toString());
        if (is_available !== undefined) params.append("is_available", is_available.toString());
        if (search) params.append("search", search);
        return `/admin/delivery-partners?${params.toString()}`;
      },
      providesTags: ["DeliveryPartner"],
    }),

    // Get delivery partner by ID
    getDeliveryPartnerById: builder.query<DeliveryPartner, string>({
      query: (id) => `/admin/delivery-partners/${id}`,
      providesTags: (result, error, id) => [{ type: "DeliveryPartner", id }],
    }),

    // Create delivery partner
    createDeliveryPartner: builder.mutation<DeliveryPartner, DeliveryPartnerCreate>({
      query: (data) => ({
        url: "/admin/delivery-partners",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DeliveryPartner"],
    }),

    // Update delivery partner
    updateDeliveryPartner: builder.mutation<DeliveryPartner, { id: string; data: DeliveryPartnerUpdate }>({
      query: ({ id, data }) => ({
        url: `/admin/delivery-partners/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "DeliveryPartner", id }, "DeliveryPartner"],
    }),

    // Delete delivery partner
    deleteDeliveryPartner: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/delivery-partners/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DeliveryPartner"],
    }),

    // ============== Coupon Management ==============

    // List coupons
    getAdminCoupons: builder.query<
      PaginatedResponse<Coupon>,
      { page?: number; size?: number; search?: string; is_active?: boolean }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.size) searchParams.append("size", params.size.toString());
        if (params.search) searchParams.append("search", params.search);
        if (params.is_active !== undefined) searchParams.append("is_active", params.is_active.toString());
        return `/admin/coupons?${searchParams.toString()}`;
      },
      providesTags: ["Coupon"],
    }),

    // Get coupon by ID
    getAdminCouponById: builder.query<Coupon, string>({
      query: (id) => `/admin/coupons/${id}`,
      providesTags: (result, error, id) => [{ type: "Coupon", id }],
    }),

    // Create coupon
    createCoupon: builder.mutation<Coupon, CouponCreate>({
      query: (data) => ({
        url: "/admin/coupons",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Coupon"],
    }),

    // Update coupon
    updateCoupon: builder.mutation<Coupon, { id: string; data: CouponUpdate }>({
      query: ({ id, data }) => ({
        url: `/admin/coupons/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Coupon", id }, "Coupon"],
    }),

    // Delete coupon (soft delete - disable)
    deleteCoupon: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/coupons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Coupon", id }, "Coupon"],
    }),

    // ============== Analytics ==============
    
    getVendorAnalytics: builder.query<
      VendorAnalytics,
      {
        vendor_id?: string;
        start_date?: string;
        end_date?: string;
        status?: string;
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.vendor_id) searchParams.append("vendor_id", params.vendor_id);
        if (params.start_date) searchParams.append("start_date", params.start_date);
        if (params.end_date) searchParams.append("end_date", params.end_date);
        if (params.status) searchParams.append("status", params.status);
        return `/admin/analytics/vendors?${searchParams.toString()}`;
      },
      providesTags: ["DashboardStats"],
    }),

    getVendorListAnalytics: builder.query<
      VendorListAnalyticsItem[],
      {
        search?: string;
        is_verified?: boolean;
        is_active?: boolean;
        start_date?: string;
        end_date?: string;
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append("search", params.search);
        if (params.is_verified !== undefined) searchParams.append("is_verified", String(params.is_verified));
        if (params.is_active !== undefined) searchParams.append("is_active", String(params.is_active));
        if (params.start_date) searchParams.append("start_date", params.start_date);
        if (params.end_date) searchParams.append("end_date", params.end_date);
        return `/admin/analytics/vendors/list?${searchParams.toString()}`;
      },
      providesTags: ["DashboardStats"],
    }),

    getDeliveryPartnerAnalytics: builder.query<
      DeliveryPartnerAnalytics,
      {
        delivery_partner_id?: string;
        start_date?: string;
        end_date?: string;
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.delivery_partner_id) searchParams.append("delivery_partner_id", params.delivery_partner_id);
        if (params.start_date) searchParams.append("start_date", params.start_date);
        if (params.end_date) searchParams.append("end_date", params.end_date);
        return `/admin/analytics/delivery-partners?${searchParams.toString()}`;
      },
      providesTags: ["DashboardStats"],
    }),

    getDeliveryPartnerListAnalytics: builder.query<
      DeliveryPartnerListAnalyticsItem[],
      {
        search?: string;
        is_active?: boolean;
        start_date?: string;
        end_date?: string;
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append("search", params.search);
        if (params.is_active !== undefined) searchParams.append("is_active", String(params.is_active));
        if (params.start_date) searchParams.append("start_date", params.start_date);
        if (params.end_date) searchParams.append("end_date", params.end_date);
        return `/admin/analytics/delivery-partners/list?${searchParams.toString()}`;
      },
      providesTags: ["DashboardStats"],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetAdminVendorsQuery,
  useGetPendingVendorsQuery,
  useGetAdminVendorByIdQuery,
  useApproveVendorMutation,
  useSuspendVendorMutation,
  useGetAdminCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useUploadCategoryImageMutation,
  useGetServiceZonesQuery,
  useCreateServiceZoneMutation,
  useUpdateServiceZoneMutation,
  useDeleteServiceZoneMutation,
  // Order hooks
  useGetAdminOrdersQuery,
  useGetOrderStatsQuery,
  useGetAdminOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useAssignOrderToDeliveryPartnerMutation,
  // Attribute hooks
  useGetCategoryAttributesQuery,
  useGetAttributeQuery,
  useCreateAttributeMutation,
  useUpdateAttributeMutation,
  useDeleteAttributeMutation,
  // Segment hooks
  useGetCategorySegmentsQuery,
  useGetSegmentQuery,
  useCreateSegmentMutation,
  useUpdateSegmentMutation,
  useDeleteSegmentMutation,
  useReorderSegmentsMutation,
  // Delivery Partner hooks
  useGetDeliveryPartnersQuery,
  useGetDeliveryPartnerByIdQuery,
  useCreateDeliveryPartnerMutation,
  useUpdateDeliveryPartnerMutation,
  useDeleteDeliveryPartnerMutation,
  // Coupon hooks
  useGetAdminCouponsQuery,
  useGetAdminCouponByIdQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  // Analytics hooks
  useGetVendorAnalyticsQuery,
  useGetVendorListAnalyticsQuery,
  useGetDeliveryPartnerAnalyticsQuery,
  useGetDeliveryPartnerListAnalyticsQuery,
} = adminApi;

