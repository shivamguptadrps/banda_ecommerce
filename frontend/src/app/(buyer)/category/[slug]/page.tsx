"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  ChevronRight, 
  Home, 
  ArrowLeft, 
  Grid3X3, 
  SlidersHorizontal,
  Search,
  X
} from "lucide-react";
import { motion } from "framer-motion";

import { Button, Card } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { ProductCard } from "@/components/product/ProductCard";
import { 
  useGetCategoryBySlugQuery, 
  useGetSubcategoriesQuery,
  useGetCategoryByIdQuery 
} from "@/store/api/categoryApi";
import { useGetProductsQuery } from "@/store/api/productApi";
import { Category } from "@/types";
import { ProductFilters } from "@/types/product";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 100; // Desktop sidebar width

type SortOption = "relevance" | "price_low" | "price_high" | "rating" | "newest" | "name";
type PriceRange = { min: number; max: number } | null;

/**
 * Breadcrumb Component
 */
function Breadcrumb({ category, parentCategory }: { category: Category; parentCategory?: Category }) {
  return (
    <nav className="flex items-center gap-2 text-sm overflow-x-auto no-scrollbar py-2">
      <Link
        href="/"
        className="text-gray-500 hover:text-primary transition-colors flex-shrink-0"
      >
        <Home className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
      <Link
        href="/category"
        className="text-gray-500 hover:text-primary transition-colors flex-shrink-0"
      >
        Categories
      </Link>
      {parentCategory && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
          <Link
            href={`/category/${parentCategory.slug}`}
            className="text-gray-500 hover:text-primary transition-colors flex-shrink-0"
          >
            {parentCategory.name}
          </Link>
        </>
      )}
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
      <span className="text-gray-900 font-medium truncate">{category.name}</span>
    </nav>
  );
}

/**
 * Sidebar Subcategory Item
 */
function SidebarItem({ 
  category, 
  isSelected, 
  onClick 
}: { 
  category: Category & { isAll?: boolean }; 
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex flex-col items-center justify-center py-3 px-2 relative border-b border-gray-100 transition-all duration-200 min-h-[85px]",
        isSelected 
          ? "bg-green-50 border-l-4 border-l-primary" 
          : "bg-white hover:bg-gray-50"
      )}
    >
      {category.image_url ? (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden mb-2 bg-gray-100">
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
          isSelected ? "bg-primary/20" : "bg-gray-100"
        )}>
          <Grid3X3 className={cn(
            "h-5 w-5",
            isSelected ? "text-primary" : "text-gray-400"
          )} />
        </div>
      )}
      <span className={cn(
        "text-[10px] font-medium text-center leading-tight px-1 line-clamp-2",
        isSelected ? "text-primary font-bold" : "text-gray-600"
      )}>
        {category.isAll ? "All" : category.name}
      </span>
    </button>
  );
}

/**
 * Category Detail Page
 */
export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  // Handle both Promise and plain object params (Next.js compatibility)
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { slug } = resolvedParams;
  const router = useRouter();

  const { data: category, isLoading: categoryLoading } = useGetCategoryBySlugQuery(slug);
  
  const parentCategoryId = category?.parent_id || category?.id || "";
  
  const { data: subcategories, isLoading: subcategoriesLoading } = useGetSubcategoriesQuery(
    parentCategoryId,
    { skip: !parentCategoryId }
  );

  const { data: parentCategory } = useGetCategoryByIdQuery(
    parentCategoryId,
    { skip: !parentCategoryId || !category?.parent_id || parentCategoryId === (category?.id || "") }
  );

  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Filter states
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [priceRange, setPriceRange] = useState<PriceRange>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Update selected subcategory when category loads
  useEffect(() => {
    if (category) {
      if (category.parent_id && category.id) {
        setSelectedSubcategoryId(category.id);
      } else {
        setSelectedSubcategoryId(null);
      }
    }
  }, [category]);

  // Determine which category ID to use for products
  const activeCategoryId = useMemo(() => {
    if (selectedSubcategoryId) {
      return selectedSubcategoryId;
    }
    if (category?.parent_id) {
      return category.parent_id;
    }
    return category?.id || "";
  }, [selectedSubcategoryId, category]);

  // Build filters
  const filters: ProductFilters = useMemo(() => {
    const f: ProductFilters = {
      category_id: activeCategoryId,
      in_stock: true,
    };
    
    if (priceRange) {
      f.min_price = priceRange.min;
      f.max_price = priceRange.max;
    }
    
    if (sortBy !== "relevance") {
      f.sort_by = sortBy as "name" | "price_low" | "price_high" | "rating" | "newest";
    }
    
    return f;
  }, [activeCategoryId, priceRange, sortBy]);

  const {
    data: productsData,
    isLoading: productsLoading,
    isFetching: productsFetching,
  } = useGetProductsQuery(
    {
      page: productsPage,
      size: 20,
      filters,
    },
    { 
      skip: !activeCategoryId,
      refetchOnMountOrArgChange: true,
    }
  );

  // Reset page when category changes
  useEffect(() => {
    if (activeCategoryId) {
      setProductsPage(1);
    }
  }, [activeCategoryId]);

  const handleSubcategorySelect = useCallback((subcategoryId: string | null) => {
    if (selectedSubcategoryId !== subcategoryId) {
      setSelectedSubcategoryId(subcategoryId);
      setProductsPage(1);
      setPriceRange(null);
      setSortBy("relevance");
      setShowMobileSidebar(false);
    }
  }, [selectedSubcategoryId]);

  const handleLoadMore = useCallback(() => {
    if (productsData && productsPage < productsData.pages && !productsFetching) {
      setProductsPage((prev) => prev + 1);
    }
  }, [productsData, productsPage, productsFetching]);

  // Build subcategories list with "All" option
  const subcategoriesList = useMemo(() => {
    const list: (Category & { isAll?: boolean })[] = [];
    
    if (category?.parent_id && parentCategory) {
      list.push({ ...parentCategory, isAll: true } as any);
      if (subcategories && subcategories.length > 0) {
        list.push(...subcategories);
      }
      if (category.id && (!subcategories || !subcategories.some(sub => sub.id === category.id))) {
        list.push(category as any);
      }
    } else if (category) {
      list.push({ ...category, isAll: true } as any);
      if (subcategories && subcategories.length > 0) {
        list.push(...subcategories);
      }
    }
    
    return list;
  }, [category, subcategories, parentCategory]);

  const activeSubcategoryId = selectedSubcategoryId || (category?.parent_id ? category.id : category?.id) || "";
  const products = productsData?.items || [];
  const hasActiveFilters = sortBy !== "relevance" || priceRange !== null;

  if (categoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Category not found</h2>
          <p className="text-gray-500 mb-4">The category you're looking for doesn't exist.</p>
          <Link href="/category">
            <Button leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Categories
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="container-app">
          {/* Breadcrumb */}
          <Breadcrumb category={category} parentCategory={parentCategory} />

          {/* Compact Header */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {category?.parent_id && parentCategory ? parentCategory.name : category?.name || ""}
              </h1>
            </div>
            <button
              onClick={() => router.push("/search")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <Search className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Wrapped in container */}
      <div className="container-app">
        <div className="relative flex">
          {/* Mobile Sidebar Toggle Button */}
          {subcategoriesList.length > 1 && (
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden fixed bottom-4 right-4 z-50 bg-primary text-white p-3 rounded-full shadow-lg"
            >
              <Grid3X3 className="h-5 w-5" />
            </button>
          )}

          {/* Mobile Sidebar Overlay */}
          {showMobileSidebar && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowMobileSidebar(false)}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 w-64 bg-white overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Categories</h2>
                  <button
                    onClick={() => setShowMobileSidebar(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="py-2">
                  {subcategoriesList.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSubcategorySelect(item.isAll ? null : item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                        activeSubcategoryId === item.id && "bg-green-50 border-l-4 border-l-primary"
                      )}
                    >
                      {item.image_url ? (
                        <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
                          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Grid3X3 className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <span className={cn(
                        "font-medium",
                        activeSubcategoryId === item.id ? "text-primary" : "text-gray-700"
                      )}>
                        {item.isAll ? "All" : item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Sidebar - Subcategories */}
          {subcategoriesList.length > 1 && (
            <aside 
              className="hidden lg:block bg-white border-r border-gray-100 sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto flex-shrink-0"
              style={{ width: `${SIDEBAR_WIDTH}px` }}
            >
              <div className="py-2">
                {subcategoriesList.map((item) => (
                  <SidebarItem
                    key={item.id}
                    category={item}
                    isSelected={activeSubcategoryId === item.id}
                    onClick={() => handleSubcategorySelect(item.isAll ? null : item.id)}
                  />
                ))}
              </div>
            </aside>
          )}

          {/* Main Content Area - Products */}
          <div className="flex-1 min-w-0">
            {/* Floating Filter Bar */}
            <div className="sticky top-[120px] z-30 bg-white border-b border-gray-100 px-4 py-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors",
                    showFilters || hasActiveFilters
                      ? "bg-green-50 text-primary border border-primary"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {[sortBy !== "relevance", priceRange !== null].filter(Boolean).length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setSortBy(sortBy === "price_low" ? "price_high" : "price_low")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors",
                    sortBy === "price_low" || sortBy === "price_high"
                      ? "bg-green-50 text-primary border border-primary"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  Sort
                </button>
              </div>

              {/* Filter Dropdown */}
              {showFilters && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-4">
                    {/* Sort Options */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "relevance", label: "Relevance" },
                          { value: "price_low", label: "Price: Low to High" },
                          { value: "price_high", label: "Price: High to Low" },
                          { value: "rating", label: "Rating" },
                          { value: "newest", label: "Newest" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSortBy(option.value as SortOption);
                              setProductsPage(1);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                              sortBy === option.value
                                ? "bg-primary text-white"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">Price Range</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          null,
                          { min: 0, max: 100 },
                          { min: 100, max: 500 },
                          { min: 500, max: 1000 },
                          { min: 1000, max: 2000 },
                          { min: 2000, max: 5000 },
                        ].map((range, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setPriceRange(range);
                              setProductsPage(1);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                              priceRange?.min === range?.min && priceRange?.max === range?.max
                                ? "bg-primary text-white"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                            )}
                          >
                            {range ? `₹${range.min} - ₹${range.max}` : "All Prices"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          setSortBy("relevance");
                          setPriceRange(null);
                          setProductsPage(1);
                        }}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Products Grid */}
            <div className="py-6">
            {productsLoading && products.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {products.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} variant="compact" />
                  ))}
                </div>

                {/* Load More */}
                {productsData && productsPage < productsData.pages && (
                  <div className="mt-8 flex justify-center">
                    <Button
                      onClick={handleLoadMore}
                      disabled={productsFetching}
                      variant="outline"
                    >
                      {productsFetching ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No products available</h3>
                <p className="text-gray-500 text-sm">Try selecting a different category</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
