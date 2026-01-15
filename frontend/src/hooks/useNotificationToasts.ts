"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated } from "@/store/slices/authSlice";
import {
  useGetNotificationsQuery,
  Notification,
  NotificationType,
} from "@/store/api/notificationApi";

/**
 * Hook to show toast notifications for critical notifications
 * This listens for new unread notifications and shows toasts for critical ones
 */
export function useNotificationToasts() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { data, refetch, isFetching } = useGetNotificationsQuery(
    { page: 1, size: 10, unread_only: true },
    {
      pollingInterval: 30000, // Poll every 30 seconds
      skip: !isAuthenticated, // Skip if not authenticated
    }
  );

  const shownNotificationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data?.items) return;

    const notifications = data.items;
    const criticalTypes: NotificationType[] = [
      "order_confirmed",
      "order_delivered",
      "payment_success",
      "payment_failed",
      "new_order",
      "order_cancelled",
    ];

    notifications.forEach((notification: Notification) => {
      // Skip if already shown
      if (shownNotificationIds.current.has(notification.id)) {
        return;
      }

      // Only show toasts for critical notifications
      if (
        criticalTypes.includes(notification.type) ||
        notification.priority === "critical" ||
        notification.priority === "high"
      ) {
        shownNotificationIds.current.add(notification.id);

        // Show toast based on notification type
        if (notification.type === "order_confirmed") {
          toast.success(notification.message, {
            duration: 5000,
            icon: "✅",
          });
        } else if (notification.type === "order_delivered") {
          toast.success(notification.message, {
            duration: 5000,
            icon: "🎉",
          });
        } else if (notification.type === "payment_success") {
          toast.success(notification.message, {
            duration: 5000,
            icon: "💳",
          });
        } else if (notification.type === "payment_failed") {
          toast.error(notification.message, {
            duration: 6000,
            icon: "❌",
          });
        } else if (notification.type === "new_order") {
          toast(notification.message, {
            duration: 5000,
            icon: "🛒",
            style: {
              background: "#F59E0B",
              color: "#fff",
            },
          });
        } else if (notification.type === "order_cancelled") {
          toast.error(notification.message, {
            duration: 5000,
            icon: "⚠️",
          });
        } else {
          // Generic toast for other critical/high priority notifications
          toast(notification.message, {
            duration: 4000,
            icon: notification.priority === "critical" ? "🔴" : "⚠️",
          });
        }
      }
    });

    // Clean up old notification IDs (keep only last 100)
    if (shownNotificationIds.current.size > 100) {
      const idsArray = Array.from(shownNotificationIds.current);
      shownNotificationIds.current = new Set(idsArray.slice(-50));
    }
  }, [data]);

  // Refetch when window gains focus (only if authenticated and query is enabled)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const handleFocus = () => {
      // Only refetch if query is actually enabled (not skipped)
      if (!isFetching) {
        refetch().catch(() => {
          // Silently handle refetch errors (query might not be started yet)
        });
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetch, isAuthenticated, isFetching]);
}

