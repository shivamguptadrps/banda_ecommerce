"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  Layers,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { motion } from "framer-motion";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Spinner, Badge } from "@/components/ui";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { useGetVendorProductQuery } from "@/store/api/vendorProductApi";

/**
 * View Product Page
 */
export default function ViewProductPage() {
  const router = useRouter();
  const params = useParams();
  // Handle both sync and async params (Next.js 15+)
  const [productId, setProductId] = useState<string>("");
  
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params;
      const id = (resolvedParams as any).id as string;
      if (id) setProductId(id);
    };
    resolveParams();
  }, [params]);

  // API hooks - skip if productId is not ready
  const { data: product, isLoading, isError, error, refetch } = useGetVendorProductQuery(productId || "", {
    skip: !productId,
  });

  // Loading state
  if (isLoading || !productId) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Product Details" subtitle="View product information" />
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
        <DashboardHeader title="Product Details" subtitle="View product information" />
        <div className="p-4 sm:p-6 lg:p-8">
          <Card className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">Failed to load product</p>
            <p className="text-gray-500 text-sm mb-4">
              {(error as any)?.data?.detail || "Something went wrong"}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(ROUTES.VENDOR_PRODUCTS)}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back to Products
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Product Details" subtitle="View product information" />
        <div className="p-4 sm:p-6 lg:p-8">
          <Card className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">Product not found</p>
            <Button
              variant="outline"
              onClick={() => router.push(ROUTES.VENDOR_PRODUCTS)}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to Products
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const primaryImage = product.primary_image || product.images?.[0]?.image_url || product.images?.[0]?.url;
  const status = product.is_active
    ? (product.inventory?.available_quantity ?? 0) > 0
      ? { label: "Active", color: "success", icon: CheckCircle }
      : { label: "Out of Stock", color: "error", icon: XCircle }
    : { label: "Inactive", color: "gray", icon: XCircle };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Product Details"
        subtitle="View product information"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Images */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Images</h2>
              {primaryImage ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {product.images && product.images.length > 0 ? (
                    product.images.map((img, index) => (
                      <div
                        key={img.id || index}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border-2",
                          img.is_primary ? "border-primary" : "border-gray-200"
                        )}
                      >
                        <img
                          src={img.image_url || img.url}
                          alt={img.alt_text || `${product.name} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {img.is_primary && (
                          <div className="absolute top-2 left-2 bg-primary text-white text-xs font-medium px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                  <Package className="h-12 w-12 text-gray-400" />
                  <p className="text-gray-500 text-sm mt-2">No images</p>
                </div>
              )}
            </Card>

            {/* Basic Information */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Product Name</label>
                  <p className="text-gray-900 font-medium mt-1">{product.name}</p>
                </div>

                {product.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">{product.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Stock Unit</label>
                    <p className="text-gray-900 font-medium mt-1 capitalize">{product.stock_unit}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge
                        variant={status.color as any}
                        className="flex items-center gap-1 w-fit"
                      >
                        <status.icon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {product.category_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {product.category?.name || "N/A"}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Sell Units */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Sell Units & Pricing</h2>
              </div>
              {product.sell_units && product.sell_units.length > 0 ? (
                <div className="space-y-3">
                  {product.sell_units.map((unit, index) => (
                    <div
                      key={unit.id || index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{unit.label}</p>
                        <p className="text-sm text-gray-500">
                          {unit.unit_value} {product.stock_unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatPrice(unit.price)}</p>
                        {unit.compare_price && unit.compare_price > unit.price && (
                          <p className="text-sm text-gray-500 line-through">
                            {formatPrice(unit.compare_price)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No sell units configured</p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Product Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant={status.color as any} className="flex items-center gap-1">
                    <status.icon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Price Range</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPrice(product.min_price)} - {formatPrice(product.max_price)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Inventory Card */}
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Inventory</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Available</span>
                  <span className="text-sm font-medium text-gray-900">
                    {product.inventory?.available_quantity ?? 0} {product.stock_unit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Low Stock Threshold</span>
                  <span className="text-sm font-medium text-gray-900">
                    {product.inventory?.low_stock_threshold ?? 10} {product.stock_unit}
                  </span>
                </div>
                {product.inventory && (
                  <div className="pt-3 border-t border-gray-100">
                    {product.inventory && product.inventory.available_quantity <= (product.inventory.low_stock_threshold ?? 0) ? (
                      <div className="flex items-center gap-2 text-warning text-sm">
                        <TrendingDown className="h-4 w-4" />
                        Low stock alert
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-success text-sm">
                        <TrendingUp className="h-4 w-4" />
                        Stock level healthy
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Metadata Card */}
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Metadata</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="text-gray-900">{formatDate(product.created_at)}</span>
                </div>
                {product.updated_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="text-gray-900">{formatDate(product.updated_at)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Product ID</span>
                  <span className="text-gray-900 font-mono text-xs">{product.id.slice(0, 8)}...</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

