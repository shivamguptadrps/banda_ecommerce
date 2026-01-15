"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Loader2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ArrowLeftCircle,
  Store,
  Image as ImageIcon,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { Button, Card } from "@/components/ui";
import {
  useGetOrderQuery,
  useMarkDeliveredMutation,
  useMarkFailedMutation,
  useRetryDeliveryMutation,
  useReturnOrderMutation,
} from "@/store/api/deliveryPartnerApi";
import { formatPrice, formatDateTime, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { CODCollectionDialog } from "@/components/delivery/CODCollectionDialog";
import { FailedDeliveryDialog } from "@/components/delivery/FailedDeliveryDialog";
import { OTPInputDialog } from "@/components/delivery/OTPInputDialog";

/**
 * Order Detail Page for Delivery Partner
 */
export default function DeliveryPartnerOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [orderId, setOrderId] = useState<string>("");

  // Handle async params (Next.js 15+) or sync params (Next.js 14)
  useEffect(() => {
    const getOrderId = async () => {
      if (params && typeof params === "object" && "then" in params) {
        const resolvedParams = await params;
        const id = Array.isArray(resolvedParams.id) ? resolvedParams.id[0] : resolvedParams.id;
        setOrderId(id);
      } else {
        const id = Array.isArray((params as { id: string | string[] }).id) 
          ? (params as { id: string[] }).id[0] 
          : (params as { id: string }).id;
        setOrderId(id);
      }
    };
    getOrderId();
  }, [params]);

  const { data: order, isLoading, error, refetch } = useGetOrderQuery(orderId, {
    skip: !orderId,
  });

  const [markDelivered, { isLoading: isDelivering }] = useMarkDeliveredMutation();
  const [markFailed, { isLoading: isMarkingFailed }] = useMarkFailedMutation();
  const [retryDelivery, { isLoading: isRetrying }] = useRetryDeliveryMutation();
  const [returnOrder, { isLoading: isReturning }] = useReturnOrderMutation();

  const [showCODDialog, setShowCODDialog] = useState(false);
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpError, setOtpError] = useState<string>("");

  const handleDeliver = () => {
    // Always show OTP dialog first
    setShowOTPDialog(true);
    setOtpError("");
  };

  const handleOTPConfirm = async (otp: string) => {
    try {
      // For COD orders, show COD collection dialog after OTP is entered
      if (order?.payment_mode === "cod") {
        setShowOTPDialog(false);
        setShowCODDialog(true);
        // Store OTP temporarily (we'll use it when confirming COD)
        (window as any).__tempOTP = otp;
      } else {
        // For online orders, directly mark as delivered with OTP
        await markDelivered({
          orderId,
          otpData: {
            delivery_otp: otp,
          },
        }).unwrap();
        toast.success("Order marked as delivered!");
        setShowOTPDialog(false);
        setOtpError("");
        refetch();
      }
    } catch (error: any) {
      const errorMessage = error.data?.detail || "Invalid OTP. Please verify with customer.";
      setOtpError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleConfirmDeliver = async (codCollected: boolean) => {
    const otp = (window as any).__tempOTP;
    if (!otp) {
      toast.error("OTP is required");
      setShowCODDialog(false);
      setShowOTPDialog(true);
      return;
    }

    try {
      await markDelivered({
        orderId,
        otpData: {
          delivery_otp: otp,
          cod_collected: codCollected,
        },
      }).unwrap();
      toast.success("Order marked as delivered!");
      setShowCODDialog(false);
      setShowOTPDialog(false);
      setOtpError("");
      delete (window as any).__tempOTP;
      refetch();
    } catch (error: any) {
      const errorMessage = error.data?.detail || "Failed to mark order as delivered";
      toast.error(errorMessage);
      // If OTP error, go back to OTP dialog
      if (errorMessage.includes("OTP") || errorMessage.includes("otp")) {
        setShowCODDialog(false);
        setShowOTPDialog(true);
        setOtpError(errorMessage);
      }
    }
  };

  const handleMarkFailed = async (reason: string, notes?: string) => {
    try {
      await markFailed({
        orderId,
        failureData: { failure_reason: reason, failure_notes: notes },
      }).unwrap();
      toast.success("Delivery marked as failed");
      setShowFailedDialog(false);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to mark delivery as failed");
    }
  };

  const handleRetry = async () => {
    if (
      !confirm(
        "Are you sure you want to retry this delivery? This will create a new delivery attempt."
      )
    ) {
      return;
    }

    try {
      await retryDelivery(orderId).unwrap();
      toast.success("Delivery retry created!");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to retry delivery");
    }
  };

  const handleReturn = async () => {
    const reason = prompt("Please provide a reason for returning the order to vendor:");
    if (!reason) {
      return;
    }

    if (
      !confirm(
        "Are you sure you want to return this order to the vendor? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await returnOrder({ orderId, returnReason: reason }).unwrap();
      toast.success("Order returned to vendor");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to return order");
    }
  };

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
            <Button onClick={() => router.push(ROUTES.DELIVERY_PARTNER_ORDERS)}>
              Back to Orders
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const canDeliver = order.order_status === "out_for_delivery";
  const canMarkFailed = order.order_status === "out_for_delivery";
  const canRetry = order.order_status === "out_for_delivery"; // Can retry if there's a failed attempt
  const canReturn = order.order_status === "out_for_delivery"; // Can return if all attempts failed

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-app py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(ROUTES.DELIVERY_PARTNER_ORDERS)}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
            <h1 className="text-xl font-bold text-gray-900">
              Order #{order.order_number}
            </h1>
          </div>
        </div>
      </div>

      <div className="container-app py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status Card with OTP */}
          <Card className="p-6 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-2 border-primary/10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1 uppercase tracking-wide">Order Status</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      order.order_status === "delivered"
                        ? "text-success"
                        : order.order_status === "out_for_delivery"
                        ? "text-purple-600"
                        : "text-gray-900"
                    )}
                  >
                    {order.order_status === "delivered"
                      ? "✓ Delivered"
                      : order.order_status === "out_for_delivery"
                      ? "🚚 Out for Delivery"
                      : order.order_status}
                  </p>
                  {order.delivery_otp && (order.order_status === "packed" || order.order_status === "out_for_delivery") && (
                    <div className="px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Delivery OTP</p>
                      <p className="text-xl font-mono font-bold text-blue-700">{order.delivery_otp}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canDeliver && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleDeliver}
                    disabled={isDelivering || isMarkingFailed || isRetrying || isReturning}
                    leftIcon={
                      isDelivering ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )
                    }
                  >
                    {isDelivering ? "Marking..." : "Mark as Delivered"}
                  </Button>
                )}
                {canMarkFailed && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowFailedDialog(true)}
                    disabled={isDelivering || isMarkingFailed || isRetrying || isReturning}
                    leftIcon={<AlertTriangle className="h-5 w-5" />}
                  >
                    Mark as Failed
                  </Button>
                )}
                {canRetry && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleRetry}
                    disabled={isDelivering || isMarkingFailed || isRetrying || isReturning}
                    leftIcon={
                      isRetrying ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-5 w-5" />
                      )
                    }
                  >
                    {isRetrying ? "Retrying..." : "Retry Delivery"}
                  </Button>
                )}
                {canReturn && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleReturn}
                    disabled={isDelivering || isMarkingFailed || isRetrying || isReturning}
                    leftIcon={
                      isReturning ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowLeftCircle className="h-5 w-5" />
                      )
                    }
                  >
                    {isReturning ? "Returning..." : "Return to Vendor"}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Vendor & Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendor Info */}
            {order.vendor_info && (
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-100">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pickup From (Vendor)
                  </h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Shop Name</p>
                    <p className="font-semibold text-gray-900 text-base">
                      {order.vendor_info.shop_name}
                    </p>
                  </div>
                  {order.vendor_info.phone && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <a
                        href={`tel:${order.vendor_info.phone}`}
                        className="font-medium text-primary hover:underline flex items-center gap-2"
                      >
                        <Phone className="h-4 w-4" />
                        {order.vendor_info.phone}
                      </a>
                    </div>
                  )}
                  {order.vendor_info.email && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {order.vendor_info.email}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
            
            {/* Customer Info */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Deliver To (Customer)
                </h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Name</p>
                  <p className="font-semibold text-gray-900 text-base">
                    {order.buyer_name || "N/A"}
                  </p>
                </div>
                {order.buyer_phone && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone</p>
                    <a
                      href={`tel:${order.buyer_phone}`}
                      className="font-medium text-primary hover:underline flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      {order.buyer_phone}
                    </a>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Delivery Address */}
          {order.delivery_address_snapshot && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Delivery Address
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{order.delivery_address_snapshot}</p>
                </div>
                {order.delivery_latitude && order.delivery_longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <MapPin className="h-4 w-4" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* Order Items with Images */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Order Items ({order.total_items})
              </h2>
            </div>
            <div className="space-y-4">
              {order.items?.map((item: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  {/* Product Image */}
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-gray-200 shadow-sm">
                    {item.product_image ? (
                      <Image
                        src={item.product_image}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 text-base">
                      {item.product_name}
                    </h3>
                    {item.product_description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {item.product_description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">
                          {item.quantity}x {item.sell_unit_label}
                        </span>
                      </div>
                      {item.price_per_unit && (
                        <div className="text-sm text-gray-500">
                          {formatPrice(item.price_per_unit)} per unit
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(item.total_price)}
                    </p>
                    {item.price_per_unit && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPrice(item.price_per_unit)} × {item.quantity}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Order Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Mode</span>
                <span className="font-medium text-gray-900 uppercase">
                  {order.payment_mode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Status</span>
                <span className="font-medium text-gray-900 capitalize">
                  {order.payment_status.toLowerCase()}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    Total Amount
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Timestamps */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-3">
              {order.placed_at && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Placed:</span>
                  <span className="text-gray-900">{formatDateTime(order.placed_at)}</span>
                </div>
              )}
              {order.confirmed_at && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Confirmed:</span>
                  <span className="text-gray-900">{formatDateTime(order.confirmed_at)}</span>
                </div>
              )}
              {order.out_for_delivery_at && (
                <div className="flex items-center gap-3 text-sm">
                  <Truck className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Out for Delivery:</span>
                  <span className="text-gray-900">
                    {formatDateTime(order.out_for_delivery_at)}
                  </span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-gray-600">Delivered:</span>
                  <span className="text-gray-900">{formatDateTime(order.delivered_at)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* OTP Input Dialog */}
      <OTPInputDialog
        isOpen={showOTPDialog}
        onClose={() => {
          setShowOTPDialog(false);
          setOtpError("");
        }}
        onConfirm={handleOTPConfirm}
        isLoading={isDelivering}
        error={otpError}
      />

      {/* COD Collection Dialog */}
      {order && (
        <CODCollectionDialog
          isOpen={showCODDialog}
          onClose={() => {
            setShowCODDialog(false);
            // If COD dialog is closed, go back to OTP dialog
            if ((window as any).__tempOTP) {
              setShowOTPDialog(true);
            }
          }}
          onConfirm={handleConfirmDeliver}
          amount={order.total_amount}
          isLoading={isDelivering}
        />
      )}

      {/* Failed Delivery Dialog */}
      <FailedDeliveryDialog
        isOpen={showFailedDialog}
        onClose={() => setShowFailedDialog(false)}
        onConfirm={handleMarkFailed}
        isLoading={isMarkingFailed}
      />
    </div>
  );
}

