"use client";

import { useState } from "react";
import {
  Search,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  Eye,
  Download,
  ChevronDown,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Avatar, Modal, Select } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import {
  useGetAdminOrdersQuery,
  useGetOrderStatsQuery,
  useUpdateOrderStatusMutation,
  useAssignOrderToDeliveryPartnerMutation,
  useGetDeliveryPartnersQuery,
  AdminOrder,
  OrderStatus,
} from "@/store/api/adminApi";

/**
 * Order status configuration
 */
const orderStatuses: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  placed: { label: "Placed", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle },
  picked: { label: "Picked", color: "bg-blue-100 text-blue-600 border-blue-200", icon: Package },
  packed: { label: "Packed", color: "bg-indigo-100 text-indigo-600 border-indigo-200", icon: Package },
  out_for_delivery: { label: "Out for Delivery", color: "bg-purple-100 text-purple-600 border-purple-200", icon: Truck },
  delivered: { label: "Delivered", color: "bg-success/10 text-success border-success/20", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-error/10 text-error border-error/20", icon: XCircle },
  returned: { label: "Returned", color: "bg-gray-100 text-gray-600 border-gray-200", icon: XCircle },
  // Legacy statuses (for backward compatibility)
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/20", icon: Clock }, // Maps to placed
  processing: { label: "Processing", color: "bg-blue-100 text-blue-600 border-blue-200", icon: Package }, // Maps to picked
  ready: { label: "Ready", color: "bg-indigo-100 text-indigo-600 border-indigo-200", icon: Package }, // Maps to packed
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-600 border-purple-200", icon: Truck }, // Maps to out_for_delivery
};

/**
 * Assign Delivery Partner Modal
 */
function AssignDeliveryPartnerModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  onAssign,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  onAssign: (partnerId: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const { data: partnersData, isLoading: isLoadingPartners } = useGetDeliveryPartnersQuery({
    page: 1,
    size: 100,
    is_active: true,
    is_available: true,
  });

  const partners = partnersData?.items || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) {
      toast.error("Please select a delivery partner");
      return;
    }
    await onAssign(selectedPartnerId);
    setSelectedPartnerId("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Delivery Partner - ${orderNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Delivery Partner <span className="text-red-500">*</span>
          </label>
          {isLoadingPartners ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : partners.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No available delivery partners found</p>
          ) : (
            <Select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              options={[
                { value: "", label: "Select a delivery partner" },
                ...partners.map((partner) => ({
                  value: partner.id,
                  label: `${partner.name} (${partner.phone})${partner.vehicle_type ? ` - ${partner.vehicle_type}` : ""}`,
                })),
              ]}
              fullWidth
            />
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={isLoading} disabled={!selectedPartnerId || isLoading}>
            Assign
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Order Table Row Component
 */
function OrderRow({
  order,
  onAssignDeliveryPartner,
}: {
  order: AdminOrder;
  onAssignDeliveryPartner: (order: AdminOrder) => void;
}) {
  // Handle both order_status (from backend) and status (frontend) fields
  const orderStatus = ((order as any).order_status || order.status) as OrderStatus;
  const statusConfig = orderStatuses[orderStatus] || orderStatuses.pending;
  const StatusIcon = statusConfig.icon;
  // Can assign if status is "packed" or legacy "ready"
  const canAssign = orderStatus === "packed" || orderStatus === "ready";

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Order Number */}
      <td className="py-4 px-4">
        <p className="font-medium text-gray-900">{order.order_number}</p>
        <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
      </td>

      {/* Customer */}
      <td className="py-4 px-4 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <Avatar name={order.buyer?.name || "Customer"} size="xs" />
          <div>
            <p className="font-medium text-gray-900 text-sm">{order.buyer?.name || "N/A"}</p>
            <p className="text-xs text-gray-500">{order.buyer?.phone || order.buyer?.email || "N/A"}</p>
          </div>
        </div>
      </td>

      {/* Vendor */}
      <td className="py-4 px-4 hidden md:table-cell">
        <p className="text-sm text-gray-700">{order.vendor?.shop_name || "N/A"}</p>
      </td>

      {/* Amount */}
      <td className="py-4 px-4">
        <p className="font-medium text-gray-900">{formatPrice(order.grand_total || order.total_amount)}</p>
        <p className="text-xs text-gray-500">
          {order.items?.length || 0} items • {order.payment_mode}
        </p>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1">
          <span className={cn("text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit", statusConfig.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </span>
          {canAssign && (
            <span className="text-xs text-blue-600 font-medium">Ready to assign</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {canAssign && (
            <Button
              size="sm"
              onClick={() => onAssignDeliveryPartner(order)}
              leftIcon={<Truck className="h-3 w-3" />}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Assign Partner
            </Button>
          )}
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="View Details">
            <Eye className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * Mobile Order Card
 */
function MobileOrderCard({
  order,
  onAssignDeliveryPartner,
}: {
  order: AdminOrder;
  onAssignDeliveryPartner: (order: AdminOrder) => void;
}) {
  // Handle both order_status (from backend) and status (frontend) fields
  const orderStatus = ((order as any).order_status || order.status) as OrderStatus;
  const statusConfig = orderStatuses[orderStatus] || orderStatuses.pending;
  const StatusIcon = statusConfig.icon;
  // Can assign if status is "packed" or legacy "ready"
  const canAssign = orderStatus === "packed" || orderStatus === "ready";

  return (
    <Card className="mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{order.order_number}</p>
          <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
        </div>
        <span className={cn("text-xs px-2 py-1 rounded-full border flex items-center gap-1", statusConfig.color)}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Avatar name={order.buyer?.name || "Customer"} size="xs" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{order.buyer?.name || "N/A"}</p>
          <p className="text-xs text-gray-500">{order.vendor?.shop_name || "N/A"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <p className="text-lg font-bold text-gray-900">{formatPrice(order.grand_total || order.total_amount)}</p>
          <p className="text-xs text-gray-500">{order.items?.length || 0} items • {order.payment_mode}</p>
        </div>
        <div className="flex items-center gap-2">
          {canAssign && (
            <Button
              size="sm"
              onClick={() => onAssignDeliveryPartner(order)}
              leftIcon={<Truck className="h-3 w-3" />}
            >
              Assign
            </Button>
          )}
          <Button size="sm" variant="outline" leftIcon={<Eye className="h-3 w-3" />}>
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Admin Orders Page
 */
export default function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [assigningOrder, setAssigningOrder] = useState<AdminOrder | null>(null);

  // Build query params
  const queryParams = {
    page,
    size: 20,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: searchQuery || undefined,
  };

  // Fetch orders
  const { data, isLoading, isFetching, error, refetch } = useGetAdminOrdersQuery(queryParams);

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useGetOrderStatsQuery();

  // Assign order mutation
  const [assignOrder, { isLoading: isAssigning }] = useAssignOrderToDeliveryPartnerMutation();

  const handleAssignDeliveryPartner = (order: AdminOrder) => {
    setAssigningOrder(order);
  };

  const handleConfirmAssign = async (partnerId: string) => {
    if (!assigningOrder) return;
    try {
      await assignOrder({
        id: assigningOrder.id,
        delivery_partner_id: partnerId,
      }).unwrap();
      toast.success("Order assigned to delivery partner successfully!");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to assign order to delivery partner");
      throw error;
    }
  };

  // Debug
  console.log("[OrdersPage] API State:", {
    isLoading,
    isFetching,
    hasData: !!data,
    error: error ? (error as any)?.status : null,
  });

  const orders = data?.items || [];
  const total = data?.total || 0;
  const packedOrdersCount = orders.filter((o) => {
    const status = ((o as any).order_status || o.status) as OrderStatus;
    return status === "packed" || status === "ready";
  }).length;

  return (
    <div className="min-h-screen">
      <DashboardHeader title="All Orders" subtitle="View and manage platform orders" />
      
      {/* Packed Orders Alert */}
      {packedOrdersCount > 0 && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-4">
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">
                    {packedOrdersCount} order{packedOrdersCount !== 1 ? "s" : ""} ready for delivery assignment
                  </p>
                  <p className="text-sm text-blue-700">
                    Filter by "Packed" status to see orders that need delivery partner assignment
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setStatusFilter("packed")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                View Packed Orders
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {isLoadingStats ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} padding="sm" className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-20"></div>
              </Card>
            ))
          ) : (
            <>
              <Card padding="sm" className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats?.total_orders || 0}</p>
                <p className="text-xs text-gray-500">Total Orders</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-2xl font-bold text-warning">{stats?.pending_orders || 0}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-2xl font-bold text-primary">{stats?.processing_orders || 0}</p>
                <p className="text-xs text-gray-500">In Progress</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-2xl font-bold text-success">{stats?.delivered_today || 0}</p>
                <p className="text-xs text-gray-500">Delivered Today</p>
              </Card>
            </>
          )}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
              className="appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="placed">Placed</option>
              <option value="confirmed">Confirmed</option>
              <option value="picked">Picked</option>
              <option value="packed">Packed</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              {/* Legacy statuses */}
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          <Button
            variant="outline"
            leftIcon={<RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <div className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">Failed to load orders</p>
                <p className="text-sm text-red-500">
                  {(error as any)?.data?.detail || (error as any)?.error || "Network error"}
                </p>
              </div>
              <Button size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? null : (
          <>
            {/* Orders Table (Desktop) */}
            <Card padding="none" className="hidden sm:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                        Order
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4 hidden sm:table-cell">
                        Customer
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4 hidden md:table-cell">
                        Vendor
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                        Amount
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4 w-16">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onAssignDeliveryPartner={handleAssignDeliveryPartner}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No orders found</p>
                </div>
              )}
            </Card>

            {/* Mobile Cards */}
            <div className="sm:hidden">
              {orders.map((order) => (
                <MobileOrderCard
                  key={order.id}
                  order={order}
                  onAssignDeliveryPartner={handleAssignDeliveryPartner}
                />
              ))}

              {orders.length === 0 && (
                <Card className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No orders found</p>
                </Card>
              )}
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {data.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Assign Delivery Partner Modal */}
        {assigningOrder && (
          <AssignDeliveryPartnerModal
            isOpen={!!assigningOrder}
            onClose={() => setAssigningOrder(null)}
            orderId={assigningOrder.id}
            orderNumber={assigningOrder.order_number}
            onAssign={handleConfirmAssign}
            isLoading={isAssigning}
          />
        )}
      </div>
    </div>
  );
}
