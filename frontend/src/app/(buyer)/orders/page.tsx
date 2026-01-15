"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  Filter,
  Calendar,
  MapPin,
  CreditCard,
  Wallet,
  Eye,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button, Card } from "@/components/ui";
import { useGetOrdersQuery } from "@/store/api/orderApi";
import { formatPrice, cn, formatDateTime } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";
import toast from "react-hot-toast";

/**
 * Order Status Configuration
 */
const orderStatuses = {
  placed: {
    label: "Placed",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
    description: "Order placed, waiting for vendor acceptance",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: CheckCircle2,
    description: "Vendor has accepted your order",
  },
  picked: {
    label: "Picked",
    color: "bg-blue-100 text-blue-600 border-blue-200",
    icon: Package,
    description: "Items are being picked from inventory",
  },
  packed: {
    label: "Packed",
    color: "bg-indigo-100 text-indigo-600 border-indigo-200",
    icon: Package,
    description: "Order has been packed and ready",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-purple-100 text-purple-600 border-purple-200",
    icon: Truck,
    description: "Your order is on the way",
  },
  delivered: {
    label: "Delivered",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
    description: "Order has been delivered",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-error/10 text-error border-error/20",
    icon: XCircle,
    description: "Order has been cancelled",
  },
  returned: {
    label: "Returned",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: XCircle,
    description: "Order has been returned",
  },
  // Legacy statuses
  pending: {
    label: "Pending",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
    description: "Order pending",
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-600 border-blue-200",
    icon: Package,
    description: "Order is being processed",
  },
  shipped: {
    label: "Shipped",
    color: "bg-purple-100 text-purple-600 border-purple-200",
    icon: Truck,
    description: "Order has been shipped",
  },
};

type OrderStatusKey = keyof typeof orderStatuses;

/**
 * Status Filter Tabs
 */
function StatusTabs({
  active,
  onChange,
  counts,
}: {
  active: string;
  onChange: (status: string) => void;
  counts: Record<string, number>;
}) {
  const tabs = [
    { key: "all", label: "All Orders", count: counts.all || 0 },
    { key: "placed", label: "Placed", count: counts.placed || 0 },
    { key: "confirmed", label: "Confirmed", count: counts.confirmed || 0 },
    { key: "picked", label: "Picked", count: counts.picked || 0 },
    { key: "packed", label: "Packed", count: counts.packed || 0 },
    { key: "out_for_delivery", label: "Out for Delivery", count: counts.out_for_delivery || 0 },
    { key: "delivered", label: "Delivered", count: counts.delivered || 0 },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled || 0 },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all",
            active === tab.key
              ? "bg-primary text-white shadow-sm"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          )}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs",
                active === tab.key ? "bg-white/20" : "bg-gray-100"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Order Card Component
 */
function OrderCard({
  order,
  index,
}: {
  order: any;
  index: number;
}) {
  const router = useRouter();

  // Map backend status to frontend display key
  const mappedStatus: OrderStatusKey =
    order.order_status === "pending"
      ? "placed"
      : order.order_status === "processing"
      ? "picked"
      : order.order_status === "shipped"
      ? "out_for_delivery"
      : (order.order_status as OrderStatusKey);

  const statusConfig = orderStatuses[mappedStatus] || orderStatuses.placed;
  const StatusIcon = statusConfig.icon;

  // Get payment mode icon
  const PaymentIcon = order.payment_mode === "cod" ? Wallet : CreditCard;

  // Format order date (using formatDateTime from utils)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        hoverable
        className="group cursor-pointer overflow-hidden"
        onClick={() => router.push(`${ROUTES.ORDERS}/${order.id}`)}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">Order #{order.order_number}</h3>
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    statusConfig.color
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDateTime(order.placed_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <PaymentIcon className="h-4 w-4" />
                  <span className="uppercase">{order.payment_mode}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
          </div>
        </div>

        {/* Items Preview */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {/* Product Images */}
            <div className="flex -space-x-2 flex-shrink-0">
              {order.items?.slice(0, 3).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="w-12 h-12 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center overflow-hidden"
                  style={{ zIndex: 3 - idx }}
                >
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
              ))}
              {order.items?.length > 3 && (
                <div className="w-12 h-12 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{order.items.length - 3}
                </div>
              )}
            </div>

            {/* Items Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {order.items?.length || order.total_items} item{order.items?.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-gray-600 line-clamp-2">
                {order.items
                  ?.slice(0, 2)
                  .map((item: any) => item.product_name)
                  .join(", ")}
                {order.items?.length > 2 && "..."}
              </p>
            </div>
          </div>
        </div>

        {/* Vendor Info */}
        {order.vendor && (
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Sold by</span>
              <span className="font-medium text-gray-900">{order.vendor.shop_name}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Amount</p>
              <p className="text-lg font-bold text-gray-900">{formatPrice(order.total_amount)}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`${ROUTES.ORDERS}/${order.id}`);
                }}
                leftIcon={<Eye className="h-4 w-4" />}
              >
                View Details
              </Button>
              {order.order_status === "out_for_delivery" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement tracking
                    toast("Tracking feature coming soon!", { icon: "ℹ️" });
                  }}
                  leftIcon={<Truck className="h-4 w-4" />}
                >
                  Track
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Empty State
 */
function EmptyState({ status }: { status: string }) {
  return (
    <div className="text-center py-12">
      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
      <p className="text-gray-600 mb-6">
        {status === "all"
          ? "You haven't placed any orders yet."
          : `You don't have any ${status} orders.`}
      </p>
      <Link href={ROUTES.PRODUCTS}>
        <Button variant="primary">Start Shopping</Button>
      </Link>
    </div>
  );
}

/**
 * Orders Page
 */
export default function OrdersPage() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // API call
  const {
    data: ordersData,
    isLoading,
    isError,
    isFetching,
  } = useGetOrdersQuery({
    page,
    size: pageSize,
    status: activeStatus !== "all" ? activeStatus : undefined,
  });

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    if (!ordersData?.items) return [];
    if (!searchQuery.trim()) return ordersData.items;

    const query = searchQuery.toLowerCase();
    return ordersData.items.filter(
      (order) =>
        order.order_number.toLowerCase().includes(query) ||
        order.items?.some((item: any) =>
          item.product_name.toLowerCase().includes(query)
        ) ||
        order.vendor?.shop_name.toLowerCase().includes(query)
    );
  }, [ordersData?.items, searchQuery]);

  // Calculate status counts (simplified - in production, get from API)
  const statusCounts = useMemo(() => {
    if (!ordersData?.items) return { all: 0 };
    const counts: Record<string, number> = { all: ordersData.total || 0 };
    ordersData.items.forEach((order) => {
      const status = order.order_status === "pending" ? "placed" : 
                    order.order_status === "processing" ? "picked" :
                    order.order_status === "shipped" ? "out_for_delivery" :
                    order.order_status;
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [ordersData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-app py-12">
          <Card className="p-8 text-center max-w-md mx-auto">
            <XCircle className="h-16 w-16 text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Orders</h1>
            <p className="text-gray-600 mb-6">
              We couldn't load your orders. Please try again.
            </p>
            <Button onClick={() => router.refresh()}>Retry</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-app py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <Link href={ROUTES.PRODUCTS}>
              <Button variant="outline" size="sm">
                Continue Shopping
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number, product name, or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs */}
          <StatusTabs
            active={activeStatus}
            onChange={(status) => {
              setActiveStatus(status);
              setPage(1); // Reset to first page when changing status
            }}
            counts={statusCounts}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="container-app py-6">
        {filteredOrders.length > 0 ? (
          <>
            <div className="space-y-4">
              <AnimatePresence>
                {filteredOrders.map((order, index) => (
                  <OrderCard key={order.id} order={order} index={index} />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {ordersData && ordersData.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {ordersData.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(ordersData.pages, p + 1))}
                  disabled={page >= ordersData.pages || isFetching}
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

