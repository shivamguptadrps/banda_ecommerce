"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Truck,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Eye,
  Loader2,
  LogOut,
  User,
  BarChart3,
  Store,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { Button, Card } from "@/components/ui";
import {
  useGetOrdersQuery,
  useGetProfileQuery,
} from "@/store/api/deliveryPartnerApi";
import { formatPrice, formatDateTime, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";

/**
 * Order Status Configuration
 */
const orderStatuses = {
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-purple-100 text-purple-600 border-purple-200",
    icon: Truck,
    canDeliver: true,
  },
  delivered: {
    label: "Delivered",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
    canDeliver: false,
  },
  packed: {
    label: "Packed",
    color: "bg-indigo-100 text-indigo-600 border-indigo-200",
    icon: Package,
    canDeliver: false,
  },
};

type OrderStatusKey = keyof typeof orderStatuses;

/**
 * Order Card Component
 */
function OrderCard({
  order,
  index,
  onDeliver,
  isDelivering,
}: {
  order: any;
  index: number;
  onDeliver: (orderId: string) => void;
  isDelivering: boolean;
}) {
  const router = useRouter();

  const mappedStatus: OrderStatusKey =
    order.order_status === "out_for_delivery"
      ? "out_for_delivery"
      : order.order_status === "delivered"
      ? "delivered"
      : ("packed" as OrderStatusKey);

  const statusConfig = orderStatuses[mappedStatus] || orderStatuses.packed;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2 hover:border-primary/20">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-bold text-lg text-gray-900">
                  Order #{order.order_number}
                </h3>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 shadow-sm",
                    statusConfig.color
                  )}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusConfig.label}
                </span>
                {order.delivery_otp && (order.order_status === "packed" || order.order_status === "out_for_delivery") && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    OTP: {order.delivery_otp}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{formatDateTime(order.out_for_delivery_at || order.placed_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor & Customer Info */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Vendor Info */}
            {order.vendor_info && (
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-gray-500 uppercase">Pickup From</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm">{order.vendor_info.shop_name}</p>
                {order.vendor_info.phone && (
                  <a
                    href={`tel:${order.vendor_info.phone}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <Phone className="h-3 w-3" />
                    {order.vendor_info.phone}
                  </a>
                )}
              </div>
            )}
            
            {/* Customer Info */}
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-gray-500 uppercase">Deliver To</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm">
                {order.buyer_name || "Customer"}
              </p>
              {order.buyer_phone && (
                <a
                  href={`tel:${order.buyer_phone}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <Phone className="h-3 w-3" />
                  {order.buyer_phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.delivery_address_snapshot && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                {order.delivery_address_snapshot}
              </p>
            </div>
            {order.delivery_latitude && order.delivery_longitude && (
              <a
                href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <MapPin className="h-3 w-3" />
                Open in Maps
              </a>
            )}
          </div>
        )}

        {/* Items with Product Images */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">
            {order.total_items} item{order.total_items !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {order.items?.slice(0, 3).map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Product Image */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                  {item.product_image ? (
                    <Image
                      src={item.product_image}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {item.quantity}x {item.sell_unit_label}
                  </p>
                </div>
                
                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPrice(item.total_price)}
                  </p>
                  {item.price_per_unit && (
                    <p className="text-xs text-gray-500">
                      {formatPrice(item.price_per_unit)}/unit
                    </p>
                  )}
                </div>
              </div>
            ))}
            {order.items?.length > 3 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gradient-to-br from-gray-50 to-white border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(order.total_amount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Payment</p>
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
                  order.payment_mode === "cod"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                )}
              >
                {order.payment_mode === "cod" ? "💰 COD" : "✅ Online"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-gray-50"
              onClick={() => router.push(`${ROUTES.DELIVERY_PARTNER_ORDERS}/${order.id}`)}
              leftIcon={<Eye className="h-4 w-4" />}
            >
              View Details
            </Button>
            {statusConfig.canDeliver && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1 shadow-md hover:shadow-lg transition-shadow"
                onClick={() => onDeliver(order.id)}
                disabled={isDelivering}
                leftIcon={
                  isDelivering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )
                }
              >
                {isDelivering ? "Delivering..." : "Mark Delivered"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Empty State
 */
function EmptyState() {
  return (
    <div className="text-center py-12">
      <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No orders assigned
      </h3>
      <p className="text-gray-600">
        You don't have any orders assigned to you yet.
      </p>
    </div>
  );
}

/**
 * Delivery Partner Orders Page
 */
export default function DeliveryPartnerOrdersPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const pageSize = 10;

  // API calls
  const { data: profile } = useGetProfileQuery();
  const {
    data: ordersData,
    isLoading,
    isError,
    isFetching,
  } = useGetOrdersQuery({
    page,
    size: pageSize,
    status: statusFilter,
  });

  const handleDeliver = (orderId: string) => {
    // Redirect to detail page where OTP input is handled
    router.push(`${ROUTES.DELIVERY_PARTNER_ORDERS}/${orderId}`);
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push(ROUTES.DELIVERY_PARTNER_LOGIN);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-app py-12">
          <Card className="p-8 text-center max-w-md mx-auto">
            <p className="text-gray-600 mb-6">
              Failed to load orders. Please try again.
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container-app py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
              {profile && (
                <p className="text-sm text-gray-600 mt-1">
                  {profile.name} • {profile.phone}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(ROUTES.DELIVERY_PARTNER_STATS)}
                leftIcon={<BarChart3 className="h-4 w-4" />}
              >
                Statistics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Logout
              </Button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setStatusFilter(undefined)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all",
                !statusFilter
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              )}
            >
              All Orders
            </button>
            <button
              onClick={() => setStatusFilter("out_for_delivery")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all",
                statusFilter === "out_for_delivery"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              )}
            >
              Out for Delivery
            </button>
            <button
              onClick={() => setStatusFilter("delivered")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all",
                statusFilter === "delivered"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              )}
            >
              Delivered
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="container-app py-6">
        {ordersData && ordersData.items.length > 0 ? (
          <>
            <div className="space-y-4">
              <AnimatePresence>
                {ordersData.items.map((order, index) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    index={index}
                    onDeliver={handleDeliver}
                    isDelivering={false}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {ordersData.pages > 1 && (
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
          <EmptyState />
        )}
      </div>
    </div>
  );
}

