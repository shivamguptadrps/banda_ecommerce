"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  CheckCheck,
  Trash2,
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Bell,
} from "lucide-react";
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  Notification,
} from "@/store/api/notificationApi";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
// Simple date formatter
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return then.toLocaleDateString();
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Notification Center Component
 * Displays a list of notifications with actions
 */
export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const router = useRouter();
  const { data, isLoading, refetch } = useGetNotificationsQuery(
    { page: 1, size: 50 },
    { skip: !isOpen }
  );
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  // Refetch when opened
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const notifications = data?.items || [];
  const unreadCount = data?.unread_count || 0;

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id).unwrap();
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      router.push(notification.action_url);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead().unwrap();
      refetch();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId).unwrap();
      refetch();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    if (type.startsWith("order_")) {
      if (type === "order_placed" || type === "order_confirmed") {
        return <ShoppingBag className="h-5 w-5" />;
      } else if (type === "order_picked" || type === "order_packed") {
        return <Package className="h-5 w-5" />;
      } else if (type === "order_out_for_delivery") {
        return <Truck className="h-5 w-5" />;
      } else if (type === "order_delivered") {
        return <CheckCircle className="h-5 w-5" />;
      } else if (type === "order_cancelled") {
        return <XCircle className="h-5 w-5" />;
      }
    } else if (type.startsWith("payment_")) {
      if (type === "payment_success") {
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      } else if (type === "payment_failed") {
        return <XCircle className="h-5 w-5 text-red-500" />;
      }
    } else if (type === "new_order") {
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    }
    return <Info className="h-5 w-5" />;
  };

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "critical":
        return "border-l-red-500 bg-red-50";
      case "high":
        return "border-l-orange-500 bg-orange-50";
      case "medium":
        return "border-l-blue-500 bg-blue-50";
      default:
        return "border-l-gray-300 bg-gray-50";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                leftIcon={<CheckCheck className="h-4 w-4" />}
              >
                Mark all read
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "p-4 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    !notification.is_read && "bg-white",
                    notification.is_read && "bg-gray-50/50",
                    getPriorityColor(notification.priority)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5",
                        !notification.is_read && "text-blue-600",
                        notification.is_read && "text-gray-400"
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p
                            className={cn(
                              "font-medium",
                              !notification.is_read && "text-gray-900",
                              notification.is_read && "text-gray-600"
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                          <button
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      {notification.action_label && (
                        <div className="mt-2">
                          <span className="text-xs text-blue-600 font-medium">
                            {notification.action_label} →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

