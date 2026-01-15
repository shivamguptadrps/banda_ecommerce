"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated } from "@/store/slices/authSlice";
import { useGetUnreadCountQuery } from "@/store/api/notificationApi";
import { NotificationCenter } from "./NotificationCenter";
import { cn } from "@/lib/utils";

interface BellIconProps {
  className?: string;
}

/**
 * Bell Icon Component with Unread Count Badge
 */
export function BellIcon({ className }: BellIconProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [isOpen, setIsOpen] = useState(false);
  const { data, refetch } = useGetUnreadCountQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds for new notifications
    skip: !isAuthenticated, // Skip if not authenticated
  });

  const unreadCount = data?.unread_count || 0;

  // Refetch when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetch]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative p-2 rounded-lg hover:bg-gray-100 transition-colors",
          className
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

