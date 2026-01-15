"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

import { Button, Card } from "@/components/ui";
import { useGetReturnRequestQuery } from "@/store/api/returnApi";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

export default function ReturnRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: returnRequest, isLoading, error, refetch } =
    useGetReturnRequestQuery(params.id);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load return request");
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading return request...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !returnRequest) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Return Request
          </h2>
          <p className="text-gray-600 mb-6">
            {error && "data" in error
              ? (error.data as any)?.detail || "Failed to load return request"
              : "Return request not found"}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "requested":
        return {
          label: "Requested",
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
        };
      case "approved":
        return {
          label: "Approved",
          color: "bg-green-100 text-green-800",
          icon: CheckCircle2,
        };
      case "rejected":
        return {
          label: "Rejected",
          color: "bg-red-100 text-red-800",
          icon: XCircle,
        };
      case "completed":
        return {
          label: "Completed",
          color: "bg-blue-100 text-blue-800",
          icon: CheckCircle2,
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-800",
          icon: AlertCircle,
        };
    }
  };

  const statusConfig = getStatusConfig(returnRequest.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          Return Request Details
        </h1>
      </div>

      {/* Status Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Return Request ID</p>
            <p className="text-lg font-semibold text-gray-900">
              #{returnRequest.id.slice(0, 8).toUpperCase()}
            </p>
            {returnRequest.order_number && (
              <p className="text-sm text-gray-600 mt-1">
                Order: {returnRequest.order_number}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full",
              statusConfig.color
            )}
          >
            <StatusIcon className="h-4 w-4" />
            <span className="font-semibold text-sm">
              {statusConfig.label}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Information
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Product Name</p>
              <p className="font-medium text-gray-900">
                {returnRequest.product_name || "N/A"}
              </p>
            </div>
            {returnRequest.order_item_quantity && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Quantity</p>
                <p className="font-medium text-gray-900">
                  {returnRequest.order_item_quantity} item(s)
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Return Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Return Details
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Reason</p>
              <p className="font-medium text-gray-900 capitalize">
                {returnRequest.reason.replace("_", " ")}
              </p>
            </div>
            {returnRequest.description && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {returnRequest.description}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Refund Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Refund Information
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-600">Refund Amount</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatPrice(returnRequest.refund_amount)}
              </p>
            </div>
            {returnRequest.status === "approved" && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Your return has been approved. Refund will be processed soon.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Requested</p>
                <p className="text-sm text-gray-600">
                  {formatDate(returnRequest.created_at)}
                </p>
              </div>
            </div>
            {returnRequest.resolved_at && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Resolved</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(returnRequest.resolved_at)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Images */}
      {returnRequest.images && returnRequest.images.length > 0 && (
        <Card className="p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Images
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {returnRequest.images.map((imageUrl, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
              >
                <Image
                  src={imageUrl}
                  alt={`Return request image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Notes */}
      {(returnRequest.vendor_notes || returnRequest.admin_notes) && (
        <Card className="p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <div className="space-y-4">
            {returnRequest.vendor_notes && (
              <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-purple-500">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Vendor Note
                </p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {returnRequest.vendor_notes}
                </p>
              </div>
            )}
            {returnRequest.admin_notes && (
              <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Admin Note
                </p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {returnRequest.admin_notes}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(ROUTES.ORDERS)}
          className="flex-1"
        >
          View All Orders
        </Button>
        {returnRequest.order_id && (
          <Button
            variant="outline"
            onClick={() =>
              router.push(`${ROUTES.ORDERS}/${returnRequest.order_id}`)
            }
            className="flex-1"
          >
            View Order
          </Button>
        )}
      </div>
    </div>
  );
}

