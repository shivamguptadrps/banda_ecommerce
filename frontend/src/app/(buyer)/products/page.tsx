"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Zap,
  ArrowUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button, Card } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { ProductCard } from "@/components/product";
import { SearchInput } from "@/components/search/SearchInput";
import { useGetProductsQuery } from "@/store/api/productApi";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { ProductFilters } from "@/types/product";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Sort Options
 */
const sortOptions = [
  { label: "Relevance", value: "relevance" },
  { label: "Price: Low to High", value: "price_low" },
  { label: "Price: High to Low", value: "price_high" },
  { label: "Newest First", value: "newest" },
];

/**
 * Category Chip
 */
function CategoryChip({
  category,
  isSelected,
  onClick,
}: {
  category: { id: string; name: string; image_url?: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
        isSelected
          ? "bg-[#0c831f] text-white shadow-md"
          : "bg-white text-gray-700 border border-gray-200 hover:border-[#0c831f] hover:text-[#0c831f]"
      )}
    >
      {category.image_url ? (
        <>
          <img
            src={category.image_url}
            alt={category.name}
            className="w-5 h-5 rounded-full object-cover"
          />
          <span>{category.name}</span>
        </>
      ) : (
        <span>{category.name}</span>
      )}
    </button>
  );
}

/**
 * Filter Sheet (Mobile)
 */
function MobileFilterSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: ProductFilters;
  onFilterChange: (filters: ProductFilters) => void;
  categories: { id: string; name: string; children?: any[] }[];
}) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Filters</h3>
              <button onClick={onClose} className="p-2 -mr-2">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Categories */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Category</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setLocalFilters({ ...localFilters, category_id: undefined })}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                      !localFilters.category_id
                        ? "bg-[#0c831f]/10 text-[#0c831f]"
                        : "bg-gray-50 text-gray-700"
                    )}
                  >
                    <span>All Categories</span>
                    {!localFilters.category_id && <Check className="h-4 w-4" />}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setLocalFilters({ ...localFilters, category_id: cat.id })}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                        localFilters.category_id === cat.id
                          ? "bg-[#0c831f]/10 text-[#0c831f]"
                          : "bg-gray-50 text-gray-700"
                      )}
                    >
                      <span>{cat.name}</span>
                      {localFilters.category_id === cat.id && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Price Range</h4>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Min</label>
                    <input
                      type="number"
                      placeholder="₹0"
                      value={localFilters.min_price || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          min_price: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#0c831f]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Max</label>
                    <input
                      type="number"
                      placeholder="₹1000"
                      value={localFilters.max_price || ""}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          max_price: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#0c831f]"
                    />
                  </div>
                </div>
              </div>

              {/* In Stock Only */}
              <div>
                <button
                  onClick={() =>
                    setLocalFilters({ ...localFilters, in_stock: !localFilters.in_stock })
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                    localFilters.in_stock
                      ? "bg-[#0c831f]/10 text-[#0c831f]"
                      : "bg-gray-50 text-gray-700"
                  )}
                >
                  <span className="font-medium">In Stock Only</span>
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      localFilters.in_stock
                        ? "bg-[#0c831f] border-[#0c831f]"
                        : "border-gray-300"
                    )}
                  >
                    {localFilters.in_stock && <Check className="h-3 w-3 text-white" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Reset
              </Button>
              <Button onClick={handleApply} className="flex-1 bg-[#0c831f] hover:bg-[#0a6e1a]">
                Apply Filters
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Desktop Filters Sidebar
 */
function DesktopFilters({
  filters,
  onFilterChange,
  categories,
}: {
  filters: ProductFilters;
  onFilterChange: (filters: ProductFilters) => void;
  categories: { id: string; name: string; children?: any[] }[];
}) {
  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Categories */}
        <Card className="p-4">
          <h4 className="font-bold text-gray-900 mb-4">Categories</h4>
          <div className="space-y-1">
            <button
              onClick={() => onFilterChange({ ...filters, category_id: undefined })}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                !filters.category_id
                  ? "bg-[#0c831f]/10 text-[#0c831f] font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              All Categories
            </button>
            {categories.map((cat) => {
              // Count products in this category (including subcategories)
              const getProductCount = (category: any): number => {
                // This is a simplified count - in production, you'd fetch actual product counts
                // For now, we'll show children count as a placeholder
                if (category.children && category.children.length > 0) {
                  return category.children.length;
                }
                return 0;
              };
              
              const productCount = getProductCount(cat);
              
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => onFilterChange({ ...filters, category_id: cat.id })}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                      filters.category_id === cat.id
                        ? "bg-[#0c831f]/10 text-[#0c831f] font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0" />
                      )}
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {productCount > 0 && (
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">({productCount})</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Price Range */}
        <Card className="p-4">
          <h4 className="font-bold text-gray-900 mb-4">Price Range</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Minimum</label>
              <input
                type="number"
                placeholder="₹0"
                value={filters.min_price || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    min_price: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0c831f]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Maximum</label>
              <input
                type="number"
                placeholder="₹1000"
                value={filters.max_price || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    max_price: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0c831f]"
              />
            </div>
          </div>
        </Card>

        {/* Stock Filter */}
        <Card className="p-4">
          <button
            onClick={() => onFilterChange({ ...filters, in_stock: !filters.in_stock })}
            className="w-full flex items-center justify-between"
          >
            <span className="font-medium text-gray-900">In Stock Only</span>
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                filters.in_stock ? "bg-[#0c831f] border-[#0c831f]" : "border-gray-300"
              )}
            >
              {filters.in_stock && <Check className="h-3 w-3 text-white" />}
            </div>
          </button>
        </Card>
      </div>
    </div>
  );
}

/**
 * Products Page Content
 */
function ProductsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [filters, setFilters] = useState<ProductFilters>(() => {
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    return {
      category_id: category || undefined,
      search: search || undefined,
    };
  });
  const [sortBy, setSortBy] = useState("relevance");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Get categories and flatten tree structure
  const { data: categoriesData } = useGetCategoryTreeQuery();
  const categories = useMemo(() => {
    if (!categoriesData) return [];
    
    // Flatten category tree to get all categories
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

  // Get products with filters
  const { data: productsData, isLoading, isFetching } = useGetProductsQuery({
    page,
    size: 24,
    filters: {
      ...filters,
      // sort_by is handled automatically by backend based on search query
    },
  });

  // Apply search param changes
  useEffect(() => {
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    
    const newFilters: ProductFilters = {
      category_id: category || undefined,
      search: search || undefined,
    };
    
    // Only update if filters actually changed to avoid infinite loops
    if (newFilters.category_id !== filters.category_id || newFilters.search !== filters.search) {
      setFilters(newFilters);
      setPage(1);
    }
  }, [searchParams]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
    setPage(1);
    
    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.category_id) params.set("category", newFilters.category_id);
    if (newFilters.search) params.set("q", newFilters.search);
    const queryString = params.toString();
    router.push(queryString ? `/products?${queryString}` : "/products", { scroll: false });
  }, [router]);

  // Get selected category name
  const selectedCategory = useMemo(() => {
    if (!filters.category_id) return null;
    return categories.find((c) => c.id === filters.category_id);
  }, [filters.category_id, categories]);

  const products = productsData?.items || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = productsData?.pages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="container-app py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-[#0c831f]">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">
              {selectedCategory ? selectedCategory.name : "All Products"}
            </span>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <SearchInput
              placeholder="Search products..."
              showSuggestions={true}
              onSearch={(query) => {
                setFilters((prev) => ({ ...prev, search: query }));
                setPage(1);
                const params = new URLSearchParams();
                if (query) params.set("q", query);
                if (filters.category_id) params.set("category", filters.category_id);
                router.push(`/products?${params.toString()}`);
              }}
            />
          </div>

          {/* Category Pills (Horizontal Scroll) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            <CategoryChip
              category={{ id: "", name: "All" }}
              isSelected={!filters.category_id}
              onClick={() => handleFilterChange({ ...filters, category_id: undefined })}
            />
            {categories.slice(0, 15).map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat}
                isSelected={filters.category_id === cat.id}
                onClick={() => {
                  handleFilterChange({ ...filters, category_id: cat.id, search: undefined });
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100">
        <div className="container-app py-3">
          <div className="flex items-center justify-between">
            {/* Results Count */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{totalProducts}</span> products
              </span>
              {isFetching && <Spinner size="sm" />}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none h-10 pl-4 pr-10 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-[#0c831f] cursor-pointer"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Mobile Filter Button */}
              <Button
                variant="outline"
                size="sm"
                leftIcon={<SlidersHorizontal className="h-4 w-4" />}
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden"
              >
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-6">
        <div className="flex gap-8">
          {/* Desktop Filters */}
          <DesktopFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categories}
          />

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {isLoading || isFetching ? (
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
                <span className="ml-3 text-gray-600">Loading products...</span>
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
                      {totalPages > 5 && (
                        <>
                          <span className="px-2 text-gray-400">...</span>
                          <button
                            onClick={() => setPage(totalPages)}
                            className={cn(
                              "h-9 w-9 rounded-lg text-sm font-medium transition-colors",
                              page === totalPages
                                ? "bg-[#0c831f] text-white"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-[#0c831f]"
                            )}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
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
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your filters or search query
                </p>
                <Button
                  onClick={() => {
                    setFilters({});
                    setPage(1);
                    router.push("/products");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        categories={categories}
      />
    </div>
  );
}

/**
 * Products Page with Suspense
 */
export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Spinner size="lg" />
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
