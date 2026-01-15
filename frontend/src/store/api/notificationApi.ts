import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Notification Types
 */
export type NotificationType =
  | "order_placed"
  | "order_confirmed"
  | "order_picked"
  | "order_packed"
  | "order_out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "order_returned"
  | "payment_success"
  | "payment_failed"
  | "payment_refunded"
  | "new_order"
  | "low_stock"
  | "product_approved"
  | "product_rejected"
  | "new_vendor_registration"
  | "high_value_order"
  | "payment_failure"
  | "order_assigned"
  | "delivery_reminder";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unread_count: number;
  page: number;
  size: number;
  pages: number;
}

export interface NotificationUnreadCountResponse {
  unread_count: number;
}

/**
 * Notification API
 */
export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Notification"],
  endpoints: (builder) => ({
    // Get notifications
    getNotifications: builder.query<
      NotificationListResponse,
      {
        page?: number;
        size?: number;
        unread_only?: boolean;
        type?: NotificationType;
      }
    >({
      query: (params = {}) => ({
        url: "/notifications",
        params: {
          page: params.page || 1,
          size: params.size || 20,
          unread_only: params.unread_only || false,
          type: params.type,
        },
      }),
      providesTags: ["Notification"],
    }),

    // Get unread count
    getUnreadCount: builder.query<NotificationUnreadCountResponse, void>({
      query: () => "/notifications/unread-count",
      providesTags: ["Notification"],
    }),

    // Mark notification as read
    markAsRead: builder.mutation<Notification, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Notification"],
    }),

    // Mark all notifications as read
    markAllAsRead: builder.mutation<{ message: string; count: number }, void>({
      query: () => ({
        url: "/notifications/mark-all-read",
        method: "PUT",
      }),
      invalidatesTags: ["Notification"],
    }),

    // Delete notification
    deleteNotification: builder.mutation<{ message: string }, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useLazyGetUnreadCountQuery,
} = notificationApi;

