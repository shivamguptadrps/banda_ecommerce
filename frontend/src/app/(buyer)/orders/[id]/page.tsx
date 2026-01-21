"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Wallet,
  Loader2,
  ArrowLeft,
  Home,
  Clock,
  CheckCircle,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { Button, Card } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { useGetOrderQuery } from "@/store/api/orderApi";
import { formatPrice, formatDate, formatDateTime, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

/**
 * Order Tracking Timeline Component
 */
function OrderTrackingTimeline({ order }: { order: any }) {
  // Map legacy statuses to new ones
  const getStatus = () => {
    const status = order.order_status?.toLowerCase();
    if (status === "pending") return "placed";
    if (status === "processing") return "picked";
    if (status === "shipped") return "out_for_delivery";
    return status || "placed";
  };

  const currentStatus = getStatus();

  const statusSteps = [
    {
      key: "placed",
      label: "Order Placed",
      icon: Clock,
      description: "Your order has been placed",
      timestamp: order.placed_at,
    },
    {
      key: "confirmed",
      label: "Order Confirmed",
      icon: CheckCircle,
      description: "Vendor has accepted your order",
      timestamp: order.confirmed_at,
    },
    {
      key: "picked",
      label: "Items Picked",
      icon: Package,
      description: "Items are being picked from inventory",
      timestamp: order.picked_at,
    },
    {
      key: "packed",
      label: "Order Packed",
      icon: Package,
      description: "Order has been packed and ready",
      timestamp: order.packed_at,
    },
    {
      key: "out_for_delivery",
      label: "Out for Delivery",
      icon: Truck,
      description: "Your order is on the way",
      timestamp: order.out_for_delivery_at || order.shipped_at,
    },
    {
      key: "delivered",
      label: "Delivered",
      icon: CheckCircle2,
      description: "Order has been delivered",
      timestamp: order.delivered_at,
    },
  ];

  const getStatusIndex = (status: string) => {
    const index = statusSteps.findIndex((step) => step.key === status);
    return index >= 0 ? index : 0;
  };

  const currentIndex = getStatusIndex(currentStatus);

  return (
    <div className="relative">
      {statusSteps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const StepIcon = step.icon;

        return (
          <div key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Timeline Line */}
            {index < statusSteps.length - 1 && (
              <div
                className={cn(
                  "absolute left-5 top-10 w-0.5 h-full",
                  isCompleted ? "bg-success" : "bg-gray-200"
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                isCompleted
                  ? "bg-success border-success text-white"
                  : isCurrent
                  ? "bg-primary border-primary text-white"
                  : "bg-white border-gray-300 text-gray-400"
              )}
            >
              <StepIcon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    className={cn(
                      "font-semibold mb-1",
                      isCompleted || isCurrent ? "text-gray-900" : "text-gray-400"
                    )}
                  >
                    {step.label}
                  </h3>
                  <p
                    className={cn(
                      "text-sm",
                      isCompleted || isCurrent ? "text-gray-600" : "text-gray-400"
                    )}
                  >
                    {step.description}
                  </p>
                  {step.timestamp && (isCompleted || isCurrent) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(step.timestamp)}
                    </p>
                  )}
                </div>
                {isCurrent && (
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    Current
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Order Detail Page Content (uses useSearchParams)
 */
function OrderDetailPageContent({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string>("");

  // Handle async params (Next.js 15+) or sync params (Next.js 14)
  useEffect(() => {
    const getOrderId = async () => {
      if (params && typeof params === "object" && "then" in params) {
        const resolvedParams = await params;
        setOrderId(resolvedParams.id);
      } else {
        setOrderId((params as { id: string }).id);
      }
    };
    getOrderId();
  }, [params]);

  const { data: order, isLoading, error, refetch } = useGetOrderQuery(orderId, {
    skip: !orderId,
  });

  const success = searchParams?.get("success") === "true";
  const errorParam = searchParams?.get("error");
  const paymentMode = searchParams?.get("mode");

  // Refetch order when payment is verified
  useEffect(() => {
    if (success && orderId) {
      // Small delay to ensure backend has processed the payment
      const timer = setTimeout(() => {
        refetch();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, orderId, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-app py-12">
          <Card className="p-8 text-center max-w-md mx-auto">
            <XCircle className="h-16 w-16 text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
            <p className="text-gray-600 mb-6">
              We couldn't find the order you're looking for.
            </p>
            <Link href={ROUTES.ORDERS}>
              <Button>View All Orders</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-app py-4">
          <div className="flex items-center gap-4">
            <Link href={ROUTES.ORDERS}>
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to Orders
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
          </div>
        </div>
      </div>

      <div className="container-app py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Success/Error Banner */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-success/10 border-2 border-success rounded-lg p-6"
            >
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-12 w-12 text-success flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Order Placed Successfully!
                  </h2>
                  <p className="text-gray-700">
                    {paymentMode === "cod"
                      ? "Your order has been confirmed. Pay when you receive."
                      : order.order_status === "placed"
                      ? "Your order has been placed and payment authorized. Waiting for vendor to accept your order."
                      : "Your payment was successful and order has been confirmed."}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Order Number: <span className="font-semibold">{order.order_number}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {errorParam && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-error/10 border-2 border-error rounded-lg p-6"
            >
              <div className="flex items-center gap-4">
                <XCircle className="h-12 w-12 text-error flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Failed</h2>
                  <p className="text-gray-700">
                    {errorParam === "verification_failed"
                      ? "Payment verification failed. Please contact support if amount was deducted."
                      : "Your payment could not be processed. Please try again."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Order Tracking Timeline */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Tracking</h2>
            <OrderTrackingTimeline order={order} />
          </Card>

          {/* Order Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Order Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-semibold text-gray-900">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date</span>
                  <span className="text-gray-900">{formatDateTime(order.placed_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Status</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {order.order_status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status</span>
                  <span
                    className={cn(
                      "font-semibold capitalize",
                      order.payment_status === "paid" || order.payment_status === "captured"
                        ? "text-success"
                        : order.payment_status === "failed"
                        ? "text-error"
                        : "text-warning"
                    )}
                  >
                    {order.payment_status}
                  </span>
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
              </div>
            </Card>

            {/* Delivery Address */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Delivery Address
              </h2>
              {order.delivery_address_snapshot ? (
                <p className="text-gray-700 whitespace-pre-line">
                  {order.delivery_address_snapshot}
                </p>
              ) : (
                <p className="text-gray-500">Address not available</p>
              )}
            </Card>
          </div>

          {/* Order Items */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item: any) => {
                return (
                  <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm mb-0.5 line-clamp-2">{item.product_name}</h3>
                      <p className="text-xs text-gray-500 mb-1">{item.sell_unit_label} × {item.quantity}</p>
                      <p className="text-sm font-bold text-gray-900">{formatPrice(item.total_price)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Delivery OTP (if order is out for delivery) */}
          {order.order_status === "out_for_delivery" && order.delivery_otp && (
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <KeyRound className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Delivery OTP
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Share this OTP with the delivery partner to confirm delivery:
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="px-6 py-3 bg-white border-2 border-blue-300 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600 tracking-wider">
                        {order.delivery_otp}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(order.delivery_otp || "");
                        toast.success("OTP copied to clipboard!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    ⚠️ Do not share this OTP with anyone except the verified delivery partner.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Order Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
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
              {order.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-success">-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(order.total_amount)}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Link href={ROUTES.ORDERS} className="flex-1">
              <Button variant="outline" fullWidth>
                View All Orders
              </Button>
            </Link>
            <Link href={ROUTES.HOME} className="flex-1">
              <Button fullWidth leftIcon={<Home className="h-4 w-4" />}>
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Order Detail Page - Wrapped in Suspense for useSearchParams
 */
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Spinner size="lg" />
        </div>
      }
    >
      <OrderDetailPageContent params={params} />
    </Suspense>
  );
}