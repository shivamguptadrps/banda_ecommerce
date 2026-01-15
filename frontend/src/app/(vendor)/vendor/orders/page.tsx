"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Play,
  Check,
  Shield,
  ShoppingBag,
  Box,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, EmptyState } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import {
  useGetVendorOrdersQuery,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useMarkOrderPickedMutation,
  useMarkOrderPackedMutation,
  useConfirmOrderMutation,
  useShipOrderMutation,
  useDeliverOrderMutation,
  VendorOrder,
} from "@/store/api/vendorApi";

/**
 * Order status configuration with professional styling
 */
const orderStatuses = {
  placed: {
    label: "Placed",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    icon: Clock,
    description: "Waiting for vendor acceptance",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    icon: CheckCircle,
    description: "Order accepted by vendor",
  },
  picked: {
    label: "Picked",
    color: "bg-cyan-50 border-cyan-200 text-cyan-700",
    icon: Package,
    description: "Items picked from inventory",
  },
  packed: {
    label: "Packed",
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    icon: Package,
    description: "Ready for delivery partner",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    icon: Truck,
    description: "Delivery partner is delivering",
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-50 border-green-200 text-green-700",
    icon: CheckCircle,
    description: "Order delivered to customer",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-50 border-red-200 text-red-700",
    icon: XCircle,
    description: "Order cancelled",
  },
  returned: {
    label: "Returned",
    color: "bg-gray-50 border-gray-200 text-gray-700",
    icon: XCircle,
    description: "Order returned",
  },
  // Legacy statuses (for backward compatibility)
  pending: {
    label: "Pending",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    icon: Clock,
    description: "Waiting for vendor acceptance",
  },
  processing: {
    label: "Processing",
    color: "bg-cyan-50 border-cyan-200 text-cyan-700",
    icon: Package,
    description: "Items picked from inventory",
  },
  shipped: {
    label: "Shipped",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    icon: Truck,
    description: "Delivery partner is delivering",
  },
};

type OrderStatus = keyof typeof orderStatuses;

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
    { id: "all", label: "All Orders" },
    { id: "placed", label: "Placed" },
    { id: "confirmed", label: "Confirmed" },
    { id: "picked", label: "Picked" },
    { id: "packed", label: "Packed" },
    { id: "out_for_delivery", label: "Out for Delivery" },
    { id: "delivered", label: "Delivered" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            active === tab.id
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          {tab.label}
          {counts[tab.id] !== undefined && (
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                active === tab.id
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-600"
              )}
            >
              {counts[tab.id]}
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
  onAccept,
  onReject,
  onPick,
  onPack,
  onShip,
  onDeliver,
  isUpdating,
}: {
  order: VendorOrder;
  index: number;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onPick: (id: string) => void;
  onPack: (id: string) => void;
  onShip: (id: string) => void;
  onDeliver: (id: string) => void;
  isUpdating: boolean;
}) {
  // Map legacy statuses to new ones
  const getStatus = () => {
    const status = order.order_status;
    if (status === "pending") return "placed";
    if (status === "processing") return "picked";
    if (status === "shipped") return "out_for_delivery";
    return status;
  };

  const mappedStatus = getStatus();
  const statusConfig = orderStatuses[mappedStatus as OrderStatus] || orderStatuses.placed;
  const StatusIcon = statusConfig.icon;

  // Parse the address from snapshot
  let addressDisplay = "No address";
  try {
    if (order.delivery_address_snapshot) {
      const addr = JSON.parse(order.delivery_address_snapshot);
      addressDisplay = addr.full_address || `${addr.address_line_1}, ${addr.city}`;
    }
  } catch {
    addressDisplay = order.delivery_address_snapshot || "No address";
  }

  // Determine available actions based on new status flow
  // Vendor can only: Accept, Reject, Mark as Picked, Mark as Packed
  // Delivery partner handles: Out for Delivery, Mark Delivered (with OTP)
  const getActions = () => {
    const status = mappedStatus;
    switch (status) {
      case "placed":
        return [
          { label: "Accept Order", onClick: () => onAccept(order.id), icon: Check, variant: "primary" as const },
          { label: "Reject", onClick: () => onReject(order.id), icon: XCircle, variant: "danger" as const },
        ];
      case "confirmed":
        return [{ label: "Mark as Picked", onClick: () => onPick(order.id), icon: Package, variant: "primary" as const }];
      case "picked":
        return [{ label: "Mark as Packed", onClick: () => onPack(order.id), icon: Package, variant: "primary" as const }];
      case "packed":
        // Show info that delivery partner will handle this
        return [{ label: "Awaiting Delivery Partner", onClick: () => {}, icon: Truck, variant: "outline" as const, disabled: true }];
      case "out_for_delivery":
        // Show info that delivery partner is handling delivery
        return [{ label: "Out for Delivery", onClick: () => {}, icon: Truck, variant: "outline" as const, disabled: true }];
      case "delivered":
        // No actions for delivered orders
        return [];
      default:
        return [];
    }
  };

  const actions = getActions();
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        hoverable 
        className="group cursor-pointer"
        onClick={() => router.push(`/vendor/orders/${order.id}`)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-gray-900">{order.order_number}</p>
            <p className="text-sm text-gray-500">
              {formatDateTime(order.placed_at)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn("text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium", statusConfig.color)}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
            </span>
            {order.order_status === "packed" && order.delivery_otp && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                OTP: {order.delivery_otp}
              </span>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-3">
          <p className="font-medium text-gray-900">{order.buyer_name || "Customer"}</p>
          {order.buyer_phone && (
            <p className="text-sm text-gray-500">{order.buyer_phone}</p>
          )}
          <p className="text-sm text-gray-500 truncate mt-1">{addressDisplay}</p>
        </div>

        {/* Items preview */}
        {order.items.length > 0 && (
          <div className="mb-3 text-sm text-gray-600">
            {order.items.slice(0, 2).map((item, idx) => (
              <p key={idx} className="truncate">
                {item.quantity}x {item.product_name} ({item.sell_unit_label})
              </p>
            ))}
            {order.items.length > 2 && (
              <p className="text-gray-400">+{order.items.length - 2} more items</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(order.total_amount)}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              {order.total_items} items
            </span>
          </div>

          {actions.length > 0 ? (
            <div className="flex gap-2">
              {actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={
                    action.disabled
                      ? "outline"
                      : action.variant === "danger"
                      ? "danger"
                      : action.variant === "success"
                      ? "success"
                      : "primary"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!action.disabled) {
                      action.onClick();
                    }
                  }}
                  disabled={isUpdating || action.disabled}
                  leftIcon={<action.icon className="h-3 w-3" />}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
          )}
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Vendor Orders Page
 */
export default function VendorOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);

  // API hooks
  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetVendorOrdersQuery({
    page,
    size: 20,
    status: activeStatus !== "all" ? activeStatus : undefined,
  });

  const [acceptOrder, { isLoading: isAccepting }] = useAcceptOrderMutation();
  const [rejectOrder, { isLoading: isRejecting }] = useRejectOrderMutation();
  const [markPicked, { isLoading: isPicking }] = useMarkOrderPickedMutation();
  const [markPacked, { isLoading: isPacking }] = useMarkOrderPackedMutation();
  const [shipOrder, { isLoading: isShipping }] = useShipOrderMutation();
  const [deliverOrder, { isLoading: isDelivering }] = useDeliverOrderMutation();

  const isUpdating = isAccepting || isRejecting || isPicking || isPacking || isShipping || isDelivering;

  // Filter by search locally
  const orders = ordersData?.items || [];
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      (order.buyer_name && order.buyer_name.toLowerCase().includes(query)) ||
      (order.buyer_phone && order.buyer_phone.includes(query))
    );
  });

  // Status counts (from total, approximated)
  const statusCounts: Record<string, number> = {
    all: ordersData?.total || 0,
  };

  // Handle status actions
  const handleAccept = async (orderId: string) => {
    try {
      await acceptOrder(orderId).unwrap();
      toast.success("Order accepted!");
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to accept order");
    }
  };

  const handleReject = async (orderId: string) => {
    if (!confirm("Are you sure you want to reject this order? This action cannot be undone.")) {
      return;
    }
    try {
      await rejectOrder({ orderId }).unwrap();
      toast.success("Order rejected");
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to reject order");
    }
  };

  const handlePick = async (orderId: string) => {
    try {
      await markPicked(orderId).unwrap();
      toast.success("Order marked as picked!");
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to mark order as picked");
    }
  };

  const handlePack = async (orderId: string) => {
    try {
      await markPacked(orderId).unwrap();
      toast.success("Order marked as packed!");
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to mark order as packed");
    }
  };

  const handleShip = async (orderId: string) => {
    try {
      await shipOrder(orderId).unwrap();
      toast.success("Order marked as out for delivery!");
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to update order status");
    }
  };

  const handleDeliver = async (orderId: string) => {
    try {
      await deliverOrder(orderId).unwrap();
      toast.success("Order marked as delivered!");
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to mark order as delivered");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Orders" subtitle="Manage customer orders" />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Orders" subtitle="Manage customer orders" />
        <div className="p-4 sm:p-6 lg:p-8">
          <Card className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-2">Failed to load orders</p>
            <p className="text-gray-500 text-sm mb-4">Please try again later</p>
            <Button onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Retry
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Orders"
        subtitle="Manage customer orders"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="mb-6">
          <StatusTabs
            active={activeStatus}
            onChange={(status) => {
              setActiveStatus(status);
              setPage(1);
            }}
            counts={statusCounts}
          />
        </div>

        {/* Orders Grid */}
        {filteredOrders.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onPick={handlePick}
                  onPack={handlePack}
                  onShip={handleShip}
                  onDeliver={handleDeliver}
                  isUpdating={isUpdating}
                />
              ))}
            </div>

            {/* Pagination */}
            {ordersData && ordersData.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-gray-600">
                  Page {page} of {ordersData.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(ordersData.pages, p + 1))}
                  disabled={page === ordersData.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Package className="h-12 w-12 text-gray-300" />}
            title={searchQuery ? "No orders found" : "No orders yet"}
            description={
              searchQuery
                ? `No orders match "${searchQuery}"`
                : "Orders from customers will appear here"
            }
            action={
              searchQuery
                ? {
                    label: "Clear Search",
                    onClick: () => setSearchQuery(""),
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
