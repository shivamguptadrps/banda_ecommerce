"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, Filter, SlidersHorizontal, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";

import { Card, Button } from "@/components/ui";
import { ProductCard } from "@/components/product";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, cn } from "@/lib/utils";
import {
  useSearchProductsQuery,
  useGetSearchSuggestionsQuery,
} from "@/store/api/searchApi";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";

/**
 * Search Page Content (uses useSearchParams)
 */
function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "price_asc" | "price_desc" | "newest" | "rating">("relevance");
  const [page, setPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce search query for suggestions
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Get categories for filter
  const { data: categoriesData } = useGetCategoryTreeQuery();

  // Get search suggestions
  const { data: suggestionsData, isLoading: isLoadingSuggestions } = useGetSearchSuggestionsQuery(
    { query: debouncedQuery },
    { skip: debouncedQuery.length < 2 }
  );

  // Build search params
  const searchParams_obj = {
    query: searchQuery,
    category_id: selectedCategory || undefined,
    min_price: minPrice ? parseFloat(minPrice) : undefined,
    max_price: maxPrice ? parseFloat(maxPrice) : undefined,
    in_stock_only: inStockOnly,
    sort_by: sortBy,
    page,
    size: 20,
  };

  // Search products
  const { data: searchData, isLoading: isLoadingSearch, error } = useSearchProductsQuery(
    searchParams_obj,
    { skip: searchQuery.length < 2 }
  );

  const products = searchData?.items || [];
  const total = searchData?.total || 0;
  const pages = searchData?.pages || 0;

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      setPage(1);
      setShowSuggestions(false);
      // Update URL
      const params = new URLSearchParams();
      params.set("q", searchQuery.trim());
      router.push(`/search?${params.toString()}`);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: any) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    setPage(1);
    router.push(`/product/${suggestion.slug}`);
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedCategory("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setSortBy("relevance");
    setPage(1);
  };

  // Flatten categories for filter dropdown
  const flattenCategories = (cats: any[]): any[] => {
    const result: any[] = [];
    const traverse = (items: any[]) => {
      items.forEach((item) => {
        result.push(item);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    if (cats) traverse(cats);
    return result;
  };

  const allCategories = categoriesData ? flattenCategories(categoriesData) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container-app py-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setPage(1);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search for products, categories, vendors..."
                className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowSuggestions(false);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && debouncedQuery.length >= 2 && suggestionsData?.suggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto"
                >
                  {isLoadingSuggestions ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </div>
                  ) : suggestionsData.suggestions.length > 0 ? (
                    <div className="py-2">
                      {suggestionsData.suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{suggestion.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              {suggestion.category && (
                                <span className="bg-gray-100 px-2 py-0.5 rounded">{suggestion.category}</span>
                              )}
                              {suggestion.vendor && <span>by {suggestion.vendor}</span>}
                              {suggestion.min_price && (
                                <span className="font-medium text-primary">{formatPrice(suggestion.min_price)}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No suggestions found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            >
              Filters
            </Button>
            {searchQuery.length >= 2 && (
              <p className="text-sm text-gray-600">
                {isLoadingSearch ? "Searching..." : `${total} result${total !== 1 ? "s" : ""} found`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="container-app py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Categories</option>
                    {allCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPage(1);
                    }}
                    placeholder="₹0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPage(1);
                    }}
                    placeholder="₹10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Sort & Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as any);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => {
                      setInStockOnly(e.target.checked);
                      setPage(1);
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="container-app py-8">
        {searchQuery.length < 2 ? (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Start Searching</h2>
            <p className="text-gray-500">Enter a search query to find products</p>
          </div>
        ) : isLoadingSearch ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-error">Failed to load search results</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h2>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <Button onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Search Page - Wrapped in Suspense for useSearchParams
 */
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Spinner size="lg" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}