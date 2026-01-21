"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  Calendar,
  CreditCard,
  Wallet,
  ChevronRight,
  Loader2,
  Store,
  ShoppingBag,
  Box,
  CircleDot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui";
import { useGetOrdersQuery } from "@/store/api/orderApi";
import { formatPrice, cn, formatDateTime } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

/**
 * Status Configuration - Clean & Minimal
 */
const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  placed: {
    label: "Placed",
    bg: "bg-amber-50",
    text: "text-amber-600",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-blue-50",
    text: "text-blue-600",
    icon: CheckCircle2,
  },
  picked: {
    label: "Picked",
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    icon: Box,
  },
  packed: {
    label: "Packed",
    bg: "bg-purple-50",
    text: "text-purple-600",
    icon: Package,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    bg: "bg-violet-50",
    text: "text-violet-600",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    bg: "bg-green-50",
    text: "text-green-600",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-600",
    icon: XCircle,
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-600",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    bg: "bg-blue-50",
    text: "text-blue-600",
    icon: CircleDot,
  },
  shipped: {
    label: "Shipped",
    bg: "bg-purple-50",
    text: "text-purple-600",
    icon: Truck,
  },
};

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", config.bg, config.text)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}

/**
 * Status Filter Pills - Horizontal scrollable
 */
function StatusFilters({
  active,
  onChange,
}: {
  active: string;
  onChange: (status: string) => void;
}) {
  const filters = [
    { key: "all", label: "All" },
    { key: "placed", label: "Placed" },
    { key: "confirmed", label: "Confirmed" },
    { key: "packed", label: "Packed" },
    { key: "out_for_delivery", label: "On the way" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onChange(filter.key)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            active === filter.key
              ? "bg-green-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Order Card - Clean, Compact Design matching React Native
 */
function OrderCard({ order, index }: { order: any; index: number }) {
  const router = useRouter();

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get product images from order items
  const getItemImage = (item: any) => {
    if (item.product_image) return item.product_image;
    if (item.image_url) return item.image_url;
    if (item.product?.primary_image) return item.product.primary_image;
    if (item.product?.images?.[0]) {
      const img = item.product.images[0];
      return img.url || img.image_url;
    }
    return null;
  };

  const handleClick = () => {
    router.push(`${ROUTES.ORDERS}/${order.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={handleClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      {/* Header - Order Number, Date & Status */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-0.5">
              {order.order_number}
            </h3>
            <p className="text-xs text-gray-500">
              {formatDate(order.placed_at)}
            </p>
          </div>
          <StatusBadge status={order.order_status} />
        </div>
      </div>

      {/* Body - Items Preview with Image Collage */}
      <div className="px-4 pb-3">
        {/* Product Images Collage */}
        {order.items && order.items.length > 0 && (
          <div className="flex items-center gap-3 mb-3">
            {/* Image Collage */}
            {order.items.length === 1 ? (
              // Single item - larger image
              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                {getItemImage(order.items[0]) ? (
                  <img
                    src={getItemImage(order.items[0])}
                    alt={order.items[0].product_name || "Product"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
            ) : order.items.length === 2 ? (
              // Two items - side by side
              <div className="flex gap-1 flex-shrink-0">
                {order.items.slice(0, 2).map((item: any, idx: number) => {
                  const imageUrl = getItemImage(item);
                  return (
                    <div key={idx} className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.product_name || "Product"} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // 3+ items - grid collage
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 grid grid-cols-2 gap-0.5 bg-gray-200">
                {order.items.slice(0, 4).map((item: any, idx: number) => {
                  const imageUrl = getItemImage(item);
                  const showMore = idx === 3 && order.items.length > 4;
                  return (
                    <div key={idx} className="relative overflow-hidden bg-gray-50">
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.product_name || "Product"} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Package className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      {showMore && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">+{order.items.length - 3}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 line-clamp-1">
                {order.items.slice(0, 2).map((item: any) => item.product_name).join(", ")}
                {order.items.length > 2 && "..."}
              </p>
            </div>
          </div>
        )}

        {/* Vendor Info */}
        {order.vendor && (
          <div className="flex items-center gap-1.5 mb-3">
            <Store className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{order.vendor.shop_name}</span>
          </div>
        )}

        {/* Items Count & Total */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {order.total_items || order.items?.length || 0} {(order.total_items || order.items?.length || 0) === 1 ? "item" : "items"}
          </span>
          <span className="text-base font-bold text-gray-900">
            {formatPrice(order.total_amount)}
          </span>
        </div>
      </div>

      {/* Footer - Payment & Navigation */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {order.payment_mode === "cod" ? (
            <Wallet className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <CreditCard className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className="text-xs text-gray-500">
            {order.payment_mode === "cod" ? "Cash on Delivery" : "Online Payment"}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </motion.div>
  );
}

/**
 * Empty State - Clean & Friendly
 */
function EmptyState({ status }: { status: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16"
    >
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShoppingBag className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {status === "all" ? "No orders yet" : `No ${status} orders`}
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
        {status === "all"
          ? "Looks like you haven't placed any orders yet. Start shopping to see your orders here!"
          : `You don't have any orders with "${status}" status.`}
      </p>
      <Link href={ROUTES.PRODUCTS}>
        <Button className="bg-green-600 hover:bg-green-700 text-white px-6">
          Start Shopping
        </Button>
      </Link>
    </motion.div>
  );
}

/**
 * Loading Skeleton
 */
function OrderSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
          <div className="flex justify-between mb-3">
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="w-10 h-10 bg-gray-100 rounded-lg" />
            ))}
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-gray-100 rounded" />
            <div className="h-5 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Orders Page - Main Component
 */
export default function OrdersPage() {
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);

  const {
    data: ordersData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetOrdersQuery({
    page,
    size: 20,
    status: activeStatus !== "all" ? activeStatus : undefined,
  });

  // Filter orders by search
  const filteredOrders = useMemo(() => {
    if (!ordersData?.items) return [];
    if (!searchQuery.trim()) return ordersData.items;

    const query = searchQuery.toLowerCase();
    return ordersData.items.filter(
      (order) =>
        order.order_number?.toLowerCase().includes(query) ||
        order.items?.some((item: any) =>
          item.product_name?.toLowerCase().includes(query)
        )
    );
  }, [ordersData?.items, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="container-app py-4">
            <h1 className="text-xl font-bold text-gray-900 mb-4">My Orders</h1>
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse mb-3" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-20 bg-gray-100 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="container-app py-4">
          <OrderSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load orders</h2>
          <p className="text-sm text-gray-500 mb-4">Something went wrong. Please try again.</p>
          <Button onClick={() => refetch()} className="bg-green-600 hover:bg-green-700 text-white">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="container-app py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
            <Link href={ROUTES.PRODUCTS}>
              <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 text-sm font-medium">
                Continue Shopping
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <StatusFilters
            active={activeStatus}
            onChange={(status) => {
              setActiveStatus(status);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="container-app py-4">
        {filteredOrders.length > 0 ? (
          <>
            <div className="space-y-3">
              <AnimatePresence>
                {filteredOrders.map((order, index) => (
                  <OrderCard key={order.id} order={order} index={index} />
                ))}
              </AnimatePresence>
            </div>

            {/* Loading indicator for pagination */}
            {isFetching && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
            )}

            {/* Pagination */}
            {ordersData && ordersData.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="rounded-lg"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600 font-medium">
                  {page} / {ordersData.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(ordersData.pages, p + 1))}
                  disabled={page >= ordersData.pages || isFetching}
                  className="rounded-lg"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState status={activeStatus} />
        )}
      </div>
    </div>
  );
}
