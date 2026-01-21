"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Clock,
  ChevronRight,
  X,
  CheckCircle,
  Truck,
  ShoppingBag,
  MapPin,
} from "lucide-react";
import { useGetOrdersQuery } from "@/store/api/orderApi";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated, selectUser } from "@/store/slices/authSlice";
import { cn } from "@/lib/utils";

interface ActiveOrder {
  id: string;
  order_number: string;
  order_status: string;
  total_amount: string;
  total_items: number;
  placed_at: string;
  estimated_delivery_minutes?: number;
}

const ORDER_STATUSES = {
  placed: { label: "Order Placed", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-100" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  processing: { label: "Packing", icon: Package, color: "text-orange-600", bg: "bg-orange-100" },
  packed: { label: "Packed", icon: Package, color: "text-orange-600", bg: "bg-orange-100" },
  picked: { label: "Picked Up", icon: Truck, color: "text-purple-600", bg: "bg-purple-100" },
  out_for_delivery: { label: "On the Way", icon: Truck, color: "text-indigo-600", bg: "bg-indigo-100" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
};

export function ActiveOrderWidget() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch orders (backend only accepts single status, so we fetch all and filter client-side)
  const { data: ordersData } = useGetOrdersQuery(
    { page: 1, size: 20 }, // Fetch more to ensure we get active orders
    {
      skip: !isAuthenticated || user?.role !== "buyer",
      pollingInterval: 30000, // Poll every 30 seconds
    }
  );

  // Filter active orders client-side (orders that are not delivered or cancelled)
  const activeOrders = ordersData?.items?.filter(
    (order: any) => !["delivered", "cancelled", "returned"].includes(order.order_status)
  ).slice(0, 5) || []; // Limit to 5 for display

  // Calculate ETA countdown
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (activeOrders.length === 0) return;

    const order = activeOrders[0];
    const placedAt = new Date(order.placed_at);
    const estimatedMinutes = order.estimated_delivery_minutes || 20; // Default 20 min
    const estimatedDelivery = new Date(placedAt.getTime() + estimatedMinutes * 60 * 1000);

    const updateCountdown = () => {
      const now = new Date();
      const diff = estimatedDelivery.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Arriving soon!");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setCountdown(`${minutes} min ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeOrders]);

  // Don't render if not mounted, not authenticated, not a buyer, or no active orders
  if (!mounted || !isAuthenticated || user?.role !== "buyer" || activeOrders.length === 0) {
    return null;
  }

  const order = activeOrders[0];
  const statusInfo = ORDER_STATUSES[order.order_status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.placed;
  const StatusIcon = statusInfo.icon;

  // Calculate progress percentage based on status
  const getProgressPercentage = (status: string): number => {
    const statusOrder = ["placed", "confirmed", "processing", "packed", "picked", "out_for_delivery", "delivered"];
    const index = statusOrder.indexOf(status);
    return index >= 0 ? ((index + 1) / statusOrder.length) * 100 : 0;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between p-3 cursor-pointer",
              "bg-gradient-to-r from-green-500 to-emerald-600"
            )}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <StatusIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Active Order</p>
                <p className="text-white/80 text-xs">{statusInfo.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-white font-bold text-lg">{countdown}</p>
                <p className="text-white/70 text-xs">ETA</p>
              </div>
              <ChevronRight
                className={cn(
                  "h-5 w-5 text-white/70 transition-transform",
                  !isMinimized && "rotate-90"
                )}
              />
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Progress Bar */}
                <div className="px-4 pt-4">
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgressPercentage(order.order_status)}%` }}
                      transition={{ duration: 0.5 }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">Placed</span>
                    <span className="text-[10px] text-gray-400">On the way</span>
                    <span className="text-[10px] text-gray-400">Delivered</span>
                  </div>
                </div>

                {/* Order Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.total_items} item{order.total_items > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-gray-500">#{order.order_number}</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{typeof order.total_amount === 'string' ? parseFloat(order.total_amount).toFixed(0) : order.total_amount.toFixed(0)}
                    </p>
                  </div>

                  {/* View Details Button */}
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700">View Order Details</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                </div>

                {/* Multiple Orders Indicator */}
                {activeOrders.length > 1 && (
                  <div className="px-4 pb-3">
                    <Link
                      href="/orders"
                      className="text-xs text-green-600 font-medium hover:underline"
                    >
                      +{activeOrders.length - 1} more active order{activeOrders.length > 2 ? "s" : ""}
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
