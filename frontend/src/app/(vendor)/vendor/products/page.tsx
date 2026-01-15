"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Spinner, EmptyState } from "@/components/ui";
import { cn, formatPrice } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import {
  useGetVendorProductsQuery,
  useDeleteProductMutation,
  VendorProduct,
} from "@/store/api/vendorProductApi";

/**
 * Get product status based on inventory
 */
function getProductStatus(product: VendorProduct): {
  status: "active" | "low_stock" | "out_of_stock" | "inactive";
  label: string;
  style: string;
} {
  if (!product.is_active) {
    return { status: "inactive", label: "Inactive", style: "bg-gray-100 text-gray-600" };
  }
  
  const available = product.inventory?.available_quantity ?? 0;
  const threshold = product.inventory?.low_stock_threshold ?? 10;
  
  if (available <= 0) {
    return { status: "out_of_stock", label: "Out of Stock", style: "bg-error/10 text-error" };
  }
  
  if (available <= threshold) {
    return { status: "low_stock", label: "Low Stock", style: "bg-warning/10 text-warning" };
  }
  
  return { status: "active", label: "Active", style: "bg-success/10 text-success" };
}

/**
 * Product Row Component (Desktop)
 */
function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: VendorProduct;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const { label, style } = getProductStatus(product);

  const primaryImage = product.primary_image || product.images?.[0]?.url;
  const stockUnit = product.stock_unit || "piece";
  const available = product.inventory?.available_quantity ?? 0;
  const minPrice = product.min_price ?? product.sell_units?.[0]?.price ?? 0;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Product */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
            {primaryImage ? (
              <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{product.name}</p>
            <p className="text-sm text-gray-500">{product.description?.slice(0, 40) || "No description"}</p>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="py-4 px-4 hidden sm:table-cell">
        <span className="font-medium text-gray-900">
          {formatPrice(minPrice)}/{stockUnit}
        </span>
      </td>

      {/* Stock */}
      <td className="py-4 px-4 hidden md:table-cell">
        <span className="text-gray-700">
          {available} {stockUnit}
        </span>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <span className={cn("text-xs px-2 py-1 rounded-full", style)}>
          {label}
        </span>
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                <Link
                  href={`${ROUTES.VENDOR_PRODUCTS}/${product.id}`}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Mobile Product Card
 */
function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: VendorProduct;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { label, style, status } = getProductStatus(product);
  const primaryImage = product.primary_image || product.images?.[0]?.url;
  const available = product.inventory?.available_quantity ?? 0;
  const minPrice = product.min_price ?? product.sell_units?.[0]?.price ?? 0;

  return (
    <Card className="flex items-center gap-4">
      <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
        {primaryImage ? (
          <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-6 w-6 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-900 font-medium">
            {formatPrice(minPrice)}
          </span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-500">{available} in stock</span>
        </div>
      </div>
      <span className={cn("text-xs px-2 py-1 rounded-full flex-shrink-0", style)}>
        {status === "active" ? "Active" : status === "low_stock" ? "Low" : status === "out_of_stock" ? "Out" : "Off"}
      </span>
    </Card>
  );
}

/**
 * Vendor Products Page
 */
export default function VendorProductsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Fetch products from API
  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetVendorProductsQuery({
    page,
    size: 20,
    search: searchQuery || undefined,
  });

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const products = productsData?.items ?? [];
  const totalPages = productsData?.pages ?? 1;

  const handleEdit = (productId: string) => {
    router.push(`${ROUTES.VENDOR_PRODUCTS}/${productId}/edit`);
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteProduct(productId).unwrap();
      toast.success("Product deleted successfully");
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to delete product");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Products" subtitle="Manage your product catalog" />
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
        <DashboardHeader title="Products" subtitle="Manage your product catalog" />
        <div className="p-4 sm:p-6 lg:p-8">
          <Card className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">Failed to load products</p>
            <p className="text-gray-500 text-sm mb-4">
              {(error as any)?.data?.detail || "Something went wrong"}
            </p>
            <Button onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Try Again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Products" subtitle="Manage your product catalog" />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            <Link href={`${ROUTES.VENDOR_PRODUCTS}/new`}>
              <Button size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {products.length === 0 && !searchQuery && (
          <EmptyState
            icon={<Package className="h-12 w-12 text-gray-300" />}
            title="No products yet"
            description="Add your first product to start selling"
            action={{
              label: "Add Product",
              href: `${ROUTES.VENDOR_PRODUCTS}/new`,
            }}
          />
        )}

        {/* No Search Results */}
        {products.length === 0 && searchQuery && (
          <EmptyState
            icon={<Search className="h-12 w-12 text-gray-300" />}
            title="No products found"
            description={`No products match "${searchQuery}"`}
            action={{
              label: "Clear Search",
              onClick: () => setSearchQuery(""),
            }}
          />
        )}

        {/* Products Table (Desktop) */}
        {products.length > 0 && (
          <>
            <Card padding="none" className="hidden sm:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                        Product
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4 hidden sm:table-cell">
                        Price
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4 hidden md:table-cell">
                        Stock
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4 w-16">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        onEdit={() => handleEdit(product.id)}
                        onDelete={() => setConfirmDelete(product.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Products Cards (Mobile) */}
            <div className="sm:hidden space-y-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={() => handleEdit(product.id)}
                  onDelete={() => setConfirmDelete(product.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => handleDelete(confirmDelete)}
                  isLoading={isDeleting}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
