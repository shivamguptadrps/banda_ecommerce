"use client";

import { useState, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Store,
  Grid3x3,
  Filter,
  Search,
  ChevronRight,
  ShoppingBag,
  Award,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button, Card, Spinner, Badge } from "@/components/ui";
import { ProductCard } from "@/components/product";
import { useGetVendorQuery, useGetVendorStoreStatsQuery } from "@/store/api/vendorApi";
import { useGetProductsQuery } from "@/store/api/productApi";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { ProductFilters } from "@/types/product";
import { ROUTES } from "@/lib/constants";
import { cn, formatPrice, formatRating, formatDate } from "@/lib/utils";

/**
 * Vendor Store Page
 * Production-ready store view with vendor info, products, filters, and search
 */
function VendorStorePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const vendorId = typeof params.id === "string" ? params.id : params.id?.[0] || "";
  
  const [filters, setFilters] = useState<ProductFilters>(() => {
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    return {
      vendor_id: vendorId,
      category_id: category || undefined,
      search: search || undefined,
    };
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch vendor data
  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useGetVendorQuery(vendorId, { skip: !vendorId });

  // Fetch store stats
  const { data: stats } = useGetVendorStoreStatsQuery(vendorId, { skip: !vendorId });

  // Fetch categories for filtering
  const { data: categoriesData } = useGetCategoryTreeQuery();
  const categories = useMemo(() => {
    if (!categoriesData) return [];
    const flattenCategories = (cats: any[]): any[] => {
      const result: any[] = [];
      cats.forEach((cat) => {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          result.push(...flattenCategories(cat.children));
        }
      });
      return result;
    };
    return flattenCategories(categoriesData);
  }, [categoriesData]);

  // Fetch products
  const {
    data: productsData,
    isLoading: productsLoading,
    isFetching: productsFetching,
  } = useGetProductsQuery({
    page,
    size: 24,
    filters,
  });

  const products = productsData?.items || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = productsData?.pages || 1;

  // Update URL when filters change
  const handleFilterChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    setPage(1);
    const params = new URLSearchParams();
    if (newFilters.category_id) params.set("category", newFilters.category_id);
    if (newFilters.search) params.set("q", newFilters.search);
    const queryString = params.toString();
    router.push(queryString ? `/vendor/${vendorId}?${queryString}` : `/vendor/${vendorId}`, {
      scroll: false,
    });
  };

  // Loading state
  if (vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (vendorError || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <Store className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h2>
          <p className="text-gray-500 mb-6">
            The store you're looking for doesn't exist or is no longer available.
          </p>
          <Button onClick={() => router.push(ROUTES.PRODUCTS)}>Browse All Products</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-app py-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Store Logo */}
            <div className="flex-shrink-0">
              {vendor.logo_url ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-100">
                  <Image
                    src={vendor.logo_url}
                    alt={vendor.shop_name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0c831f] to-[#0a6e1a] flex items-center justify-center">
                  <Store className="h-12 w-12 text-white" />
                </div>
              )}
            </div>

            {/* Store Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {vendor.shop_name}
                    </h1>
                    {vendor.is_verified && (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{vendor.city}, {vendor.state}</span>
                    </div>
                    {vendor.delivery_radius_km && (
                      <div className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        <span>Delivers within {vendor.delivery_radius_km} km</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rating & Stats */}
              <div className="flex items-center gap-6 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-gray-900">{formatRating(vendor.rating)}</span>
                  <span className="text-sm text-gray-500">
                    ({vendor.total_reviews} {vendor.total_reviews === 1 ? "review" : "reviews"})
                  </span>
                </div>
                {stats && (
                  <>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Package className="h-4 w-4" />
                      <span>{stats.active_products} Products</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <ShoppingBag className="h-4 w-4" />
                      <span>{stats.total_orders} Orders</span>
                    </div>
                  </>
                )}
              </div>

              {/* Description */}
              {vendor.description && (
                <p className="text-gray-600 text-sm line-clamp-2">{vendor.description}</p>
              )}

              {/* Store Stats Cards */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Active Products</div>
                    <div className="text-lg font-bold text-gray-900">{stats.active_products}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Categories</div>
                    <div className="text-lg font-bold text-gray-900">{stats.categories_count}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Orders</div>
                    <div className="text-lg font-bold text-gray-900">{stats.total_orders}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Joined</div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(stats.joined_date)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Products */}
      <div className="container-app py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters (Desktop) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              <Card className="p-4">
                <h3 className="font-bold text-gray-900 mb-4">Filter Products</h3>
                
                {/* Categories */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Categories</h4>
                  <button
                    onClick={() => handleFilterChange({ ...filters, category_id: undefined })}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      !filters.category_id
                        ? "bg-[#0c831f]/10 text-[#0c831f] font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    All Categories
                  </button>
                  {categories.slice(0, 10).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleFilterChange({ ...filters, category_id: cat.id })}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        filters.category_id === cat.id
                          ? "bg-[#0c831f]/10 text-[#0c831f] font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {/* Search & Mobile Filter */}
            <div className="mb-6 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products in this store..."
                  value={filters.search || ""}
                  onChange={(e) =>
                    handleFilterChange({ ...filters, search: e.target.value || undefined })
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-[#0c831f]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Results Count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{totalProducts}</span>{" "}
                {totalProducts === 1 ? "product" : "products"}
              </p>
            </div>

            {/* Products Grid */}
            {productsLoading || productsFetching ? (
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {products.map((product, idx) => (
                    <ProductCard key={product.id} product={product} index={idx} variant="compact" />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={cn(
                              "h-9 w-9 rounded-lg text-sm font-medium transition-colors",
                              page === pageNum
                                ? "bg-[#0c831f] text-white"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-[#0c831f]"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-6">
                  {filters.search || filters.category_id
                    ? "Try adjusting your filters"
                    : "This store doesn't have any products yet"}
                </p>
                {(filters.search || filters.category_id) && (
                  <Button
                    onClick={() => {
                      handleFilterChange({ vendor_id: vendorId });
                      router.push(`/vendor/${vendorId}`);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Vendor Store Page with Suspense
 */
export default function VendorStorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Spinner size="lg" />
        </div>
      }
    >
      <VendorStorePageContent />
    </Suspense>
  );
}


