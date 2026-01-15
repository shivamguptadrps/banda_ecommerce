"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  FileText,
  AlertTriangle,
  RefreshCw,
  Eye,
  Copy,
  Check,
  ShoppingBag,
  Box,
  Shield,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Spinner, Badge } from "@/components/ui";
import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import {
  useGetVendorOrderQuery,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useMarkOrderPickedMutation,
  useMarkOrderPackedMutation,
} from "@/store/api/vendorApi";
import {
  useGetVendorOrderPaymentsQuery,
  useGetVendorPaymentLogsQuery,
  useCheckDuplicatePaymentsVendorQuery,
  type Payment,
  type PaymentLog,
} from "@/store/api/paymentApi";

/**
 * Order Status Timeline Component
 * Shows the complete order journey with current status highlighted
 */
function OrderStatusTimeline({ order }: { order: any }) {
  const statuses = [
    {
      key: "placed",
      label: "Order Placed",
      icon: ShoppingBag,
      description: "Customer placed the order",
      timestamp: order.placed_at,
      completed: ["placed", "confirmed", "picked", "packed", "out_for_delivery", "delivered"].includes(order.order_status),
      current: order.order_status === "placed",
    },
    {
      key: "confirmed",
      label: "Order Confirmed",
      icon: CheckCircle,
      description: "Vendor accepted the order",
      timestamp: order.confirmed_at,
      completed: ["confirmed", "picked", "packed", "out_for_delivery", "delivered"].includes(order.order_status),
      current: order.order_status === "confirmed",
    },
    {
      key: "picked",
      label: "Items Picked",
      icon: Package,
      description: "Items picked from inventory",
      timestamp: order.picked_at,
      completed: ["picked", "packed", "out_for_delivery", "delivered"].includes(order.order_status),
      current: order.order_status === "picked",
    },
    {
      key: "packed",
      label: "Order Packed",
      icon: Box,
      description: "Order packed and ready for pickup",
      timestamp: order.packed_at,
      completed: ["packed", "out_for_delivery", "delivered"].includes(order.order_status),
      current: order.order_status === "packed",
    },
    {
      key: "out_for_delivery",
      label: "Out for Delivery",
      icon: Truck,
      description: "Delivery partner is delivering",
      timestamp: order.out_for_delivery_at,
      completed: ["out_for_delivery", "delivered"].includes(order.order_status),
      current: order.order_status === "out_for_delivery",
    },
    {
      key: "delivered",
      label: "Order Delivered",
      icon: CheckCircle,
      description: "Order delivered to customer",
      timestamp: order.delivered_at,
      completed: order.order_status === "delivered",
      current: order.order_status === "delivered",
    },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status Timeline</h2>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-6">
          {statuses.map((status, index) => {
            const StatusIcon = status.icon;
            const isCompleted = status.completed;
            const isCurrent = status.current;
            const isPending = !isCompleted && !isCurrent;

            return (
              <div key={status.key} className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted
                      ? "bg-primary border-primary text-white"
                      : isCurrent
                      ? "bg-primary/10 border-primary text-primary ring-4 ring-primary/20"
                      : "bg-gray-100 border-gray-300 text-gray-400"
                  )}
                >
                  <StatusIcon className="h-6 w-6" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className={cn(
                        "font-semibold",
                        isCompleted || isCurrent ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      {status.label}
                    </h3>
                    {status.timestamp && (
                      <span className="text-xs text-gray-500">
                        {formatDateTime(status.timestamp)}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm",
                      isCompleted || isCurrent ? "text-gray-600" : "text-gray-400"
                    )}
                  >
                    {status.description}
                  </p>
                  
                  {/* Show OTP when packed */}
                  {status.key === "packed" && order.delivery_otp && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-900">Delivery OTP</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold text-blue-900">
                          {order.delivery_otp}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(order.delivery_otp);
                            toast.success("OTP copied to clipboard");
                          }}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Share this OTP with the delivery partner for order verification
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/**
 * Order Action Buttons Component
 * Shows available actions based on order status
 */
function OrderActionButtons({ order, onAccept, onReject, onPick, onPack }: {
  order: any;
  onAccept: () => void;
  onReject: () => void;
  onPick: () => void;
  onPack: () => void;
}) {
  type ActionType = {
    label: string;
    onClick: () => void;
    variant: "primary" | "danger" | "outline";
    icon: any;
    disabled?: boolean;
  };

  const getActions = (): ActionType[] => {
    switch (order.order_status) {
      case "placed":
        return [
          { label: "Accept Order", onClick: onAccept, variant: "primary" as const, icon: Check },
          { label: "Reject Order", onClick: onReject, variant: "danger" as const, icon: XCircle },
        ];
      case "confirmed":
        return [
          { label: "Mark as Picked", onClick: onPick, variant: "primary" as const, icon: Package },
        ];
      case "picked":
        return [
          { label: "Mark as Packed", onClick: onPack, variant: "primary" as const, icon: Box },
        ];
      case "packed":
        return [
          {
            label: "Awaiting Delivery Partner",
            onClick: () => {},
            variant: "outline" as const,
            icon: Truck,
            disabled: true,
          },
        ];
      case "out_for_delivery":
        return [
          {
            label: "Out for Delivery",
            onClick: () => {},
            variant: "outline" as const,
            icon: Truck,
            disabled: true,
          },
        ];
      default:
        return [];
    }
  };

  const actions = getActions();

  if (actions.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Actions</h2>
      <div className="flex flex-wrap gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant}
              disabled={action.disabled}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>
      
      {/* Info message for delivery partner actions */}
      {(order.order_status === "packed" || order.order_status === "out_for_delivery") && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Delivery Partner Action Required</p>
              <p className="text-blue-700">
                {order.order_status === "packed"
                  ? "The delivery partner will mark this order as 'Out for Delivery' when they pick it up."
                  : "The delivery partner is currently delivering this order. They will mark it as 'Delivered' after OTP verification."}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Payment Status Badge
 */
function PaymentStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "bg-warning/10 text-warning" },
    created: { label: "Created", color: "bg-blue-100 text-blue-600" },
    authorized: { label: "Authorized", color: "bg-purple-100 text-purple-600" },
    captured: { label: "Captured", color: "bg-success/10 text-success" },
    paid: { label: "Paid", color: "bg-success/10 text-success" },
    failed: { label: "Failed", color: "bg-error/10 text-error" },
    refunded: { label: "Refunded", color: "bg-gray-100 text-gray-600" },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

  return (
    <Badge className={cn("text-xs", config.color)}>{config.label}</Badge>
  );
}

/**
 * Payment Log Viewer Component
 */
function PaymentLogViewer({
  paymentId,
  orderId,
}: {
  paymentId: string;
  orderId: string;
}) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const { data: logsData, isLoading } = useGetVendorPaymentLogsQuery({
    orderId,
    paymentId,
    page: 1,
    size: 100,
  });

  const logs = logsData?.items || [];

  const toggleLog = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p>No payment logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const isExpanded = expandedLogs.has(log.id);
        return (
          <Card key={log.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {log.event_type}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(log.payload, null, 2))}
                  leftIcon={<Copy className="h-3 w-3" />}
                >
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLog(log.id)}
                  leftIcon={<Eye className="h-3 w-3" />}
                >
                  {isExpanded ? "Hide" : "View"}
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Payment Card Component
 */
function PaymentCard({
  payment,
  orderId,
  isSelected,
  onSelect,
}: {
  payment: Payment;
  orderId: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all",
        isSelected ? "border-2 border-primary bg-primary/5" : "border border-gray-200 hover:border-gray-300"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <PaymentStatusBadge status={payment.status} />
            {payment.method && (
              <Badge variant="outline" className="text-xs">
                {payment.method}
              </Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {formatPrice(payment.amount)} {payment.currency}
          </p>
          {payment.razorpay_order_id && (
            <p className="text-xs text-gray-500 mt-1">
              Order: {payment.razorpay_order_id}
            </p>
          )}
          {payment.razorpay_payment_id && (
            <p className="text-xs text-gray-500">
              Payment: {payment.razorpay_payment_id}
            </p>
          )}
        </div>
        {isSelected && (
          <CheckCircle className="h-5 w-5 text-primary" />
        )}
      </div>

      {payment.failure_reason && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error">{payment.failure_reason}</p>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        Created: {formatDateTime(payment.created_at)}
      </div>
    </Card>
  );
}

/**
 * Duplicate Payment Alert
 */
function DuplicatePaymentAlert({
  orderId,
}: {
  orderId: string;
}) {
  const { data: duplicateCheck, isLoading } = useCheckDuplicatePaymentsVendorQuery(orderId);

  if (isLoading || !duplicateCheck || duplicateCheck.status === "no_duplicate") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-warning/10 border-2 border-warning rounded-lg p-4 mb-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {duplicateCheck.status === "duplicate_detected"
              ? "⚠️ Duplicate Payments Detected"
              : "⚠️ Payment Review Required"}
          </h3>
          <p className="text-sm text-gray-700 mb-2">
            {duplicateCheck.status === "duplicate_detected"
              ? `This order has ${duplicateCheck.duplicate_payments.length} successful payments totaling ${formatPrice(duplicateCheck.total_amount)}. Please review and contact support if needed.`
              : "Multiple payment attempts detected. Please review payment logs."}
          </p>
          {duplicateCheck.duplicate_payments.length > 0 && (
            <div className="mt-2 space-y-1">
              {duplicateCheck.duplicate_payments.map((payment) => (
                <div key={payment.id} className="text-xs text-gray-600">
                  • Payment {payment.razorpay_payment_id || payment.id} -{" "}
                  {formatPrice(payment.amount)} - {payment.status}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Vendor Order Detail Page
 */
export default function VendorOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [orderId, setOrderId] = useState<string>("");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "payments" | "logs">("details");

  // Handle async params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params;
      const id = (resolvedParams as any).id as string;
      if (id) {
        setOrderId(id);
        // Auto-select first payment if available
        setTimeout(() => {
          // Will be set after payments load
        }, 1000);
      }
    };
    resolveParams();
  }, [params]);

  const { data: order, isLoading, error, refetch } = useGetVendorOrderQuery(orderId || "", {
    skip: !orderId,
  });

  const { data: paymentsData, refetch: refetchPayments } = useGetVendorOrderPaymentsQuery(
    orderId,
    { skip: !orderId }
  );

  const payments = paymentsData?.items || [];

  // Auto-select first payment when payments load
  useEffect(() => {
    if (payments.length > 0 && !selectedPaymentId) {
      setSelectedPaymentId(payments[0].id);
    }
  }, [payments, selectedPaymentId]);

  const [acceptOrder, { isLoading: isAccepting }] = useAcceptOrderMutation();
  const [rejectOrder, { isLoading: isRejecting }] = useRejectOrderMutation();
  const [markPicked, { isLoading: isPicking }] = useMarkOrderPickedMutation();
  const [markPacked, { isLoading: isPacking }] = useMarkOrderPackedMutation();

  if (isLoading || !orderId) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Order Details" subtitle="View order information" />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Order Details" subtitle="View order information" />
        <div className="flex items-center justify-center py-20">
          <Card className="p-8 text-center max-w-md">
            <XCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
            <Link href={ROUTES.VENDOR_ORDERS}>
              <Button>Back to Orders</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    try {
      await acceptOrder(order.id).unwrap();
      toast.success("Order accepted successfully!");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to accept order");
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this order? This action cannot be undone.")) {
      return;
    }
    try {
      await rejectOrder({ orderId: order.id }).unwrap();
      toast.success("Order rejected");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to reject order");
    }
  };

  const handlePick = async () => {
    try {
      await markPicked(order.id).unwrap();
      toast.success("Order marked as picked!");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to mark order as picked");
    }
  };

  const handlePack = async () => {
    try {
      await markPacked(order.id).unwrap();
      toast.success("Order marked as packed! Delivery partner will pick it up.");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to mark order as packed");
    }
  };

  // Parse address
  let addressDisplay = "No address";
  try {
    if (order.delivery_address_snapshot) {
      const addr = JSON.parse(order.delivery_address_snapshot);
      addressDisplay = addr.full_address || `${addr.address_line_1}, ${addr.city}`;
    }
  } catch {
    addressDisplay = order.delivery_address_snapshot || "No address";
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Order Details"
        subtitle={`Order #${order.order_number}`}
      />

      <div className="container-app py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Duplicate Payment Alert */}
          {order.payment_mode === "online" && (
            <DuplicatePaymentAlert orderId={order.id} />
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "details"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              )}
            >
              Order Details
            </button>
            {order.payment_mode === "online" && (
              <>
                <button
                  onClick={() => setActiveTab("payments")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "payments"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  )}
                >
                  Payments ({payments.length})
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "logs"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  )}
                >
                  Payment Logs
                </button>
              </>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Order Status Timeline */}
              <OrderStatusTimeline order={order} />

              {/* Order Actions */}
              <OrderActionButtons
                order={order}
                onAccept={handleAccept}
                onReject={handleReject}
                onPick={handlePick}
                onPack={handlePack}
              />

              <div className="grid md:grid-cols-2 gap-6">
                {/* Order Info */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
                  <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number</span>
                    <span className="font-semibold text-gray-900">{order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Status</span>
                    <Badge className="capitalize">{order.order_status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status</span>
                    <PaymentStatusBadge status={order.payment_status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method</span>
                    <div className="flex items-center gap-2">
                      {order.payment_mode === "online" ? (
                        <CreditCard className="h-4 w-4 text-gray-600" />
                      ) : (
                        <Wallet className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="text-gray-900 capitalize">{order.payment_mode}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Placed At</span>
                    <span className="text-gray-900">{formatDateTime(order.placed_at)}</span>
                  </div>
                </div>
              </Card>

              {/* Customer Info */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{order.buyer?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">{order.buyer?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </p>
                    <p className="text-gray-900 mt-1">{addressDisplay}</p>
                  </div>
                </div>
              </Card>

              {/* Order Items */}
              <Card className="p-6 md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600">
                          {item.sell_unit_label} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatPrice(item.total)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className={order.delivery_fee === 0 ? "text-success" : "text-gray-900"}>
                      {order.delivery_fee === 0 ? "FREE" : formatPrice(order.delivery_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>
              </Card>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Records</h2>
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No payment records found</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {payments.map((payment) => (
                      <PaymentCard
                        key={payment.id}
                        payment={payment}
                        orderId={order.id}
                        isSelected={selectedPaymentId === payment.id}
                        onSelect={() => setSelectedPaymentId(payment.id)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {selectedPaymentId && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("logs")}
                      rightIcon={<FileText className="h-4 w-4" />}
                    >
                      View Logs
                    </Button>
                  </div>
                  {payments.find((p) => p.id === selectedPaymentId) && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Payment ID</p>
                          <p className="font-semibold text-gray-900">
                            {payments.find((p) => p.id === selectedPaymentId)?.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Razorpay Order ID</p>
                          <p className="font-semibold text-gray-900">
                            {payments.find((p) => p.id === selectedPaymentId)?.razorpay_order_id || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Razorpay Payment ID</p>
                          <p className="font-semibold text-gray-900">
                            {payments.find((p) => p.id === selectedPaymentId)?.razorpay_payment_id || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Payment Method</p>
                          <p className="font-semibold text-gray-900">
                            {payments.find((p) => p.id === selectedPaymentId)?.method || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* Payment Logs Tab */}
          {activeTab === "logs" && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Payment Logs</h2>
                {selectedPaymentId && (
                  <Badge variant="outline">
                    Payment: {selectedPaymentId.slice(0, 8)}...
                  </Badge>
                )}
              </div>

              {!selectedPaymentId ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Please select a payment from the Payments tab to view logs</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("payments")}
                  >
                    Go to Payments
                  </Button>
                </div>
              ) : (
                <PaymentLogViewer paymentId={selectedPaymentId} orderId={order.id} />
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

