"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ProductFilters as FilterType } from "@/types/product";

interface FilterSection {
  title: string;
  key: string;
  options: { label: string; value: string }[];
}

interface ProductFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
  categories?: { id: string; name: string }[];
  className?: string;
}

/**
 * Price Range Options
 */
const priceRanges = [
  { label: "Under ₹50", value: "0-50" },
  { label: "₹50 - ₹100", value: "50-100" },
  { label: "₹100 - ₹200", value: "100-200" },
  { label: "₹200 - ₹500", value: "200-500" },
  { label: "Over ₹500", value: "500-" },
];

/**
 * Sort Options
 */
const sortOptions = [
  { label: "Relevance", value: "relevance" },
  { label: "Price: Low to High", value: "price_low" },
  { label: "Price: High to Low", value: "price_high" },
  { label: "Rating", value: "rating" },
  { label: "Newest", value: "newest" },
];

/**
 * Filter Section Component
 */
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="font-medium text-gray-900">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Desktop Filters Sidebar
 */
export function ProductFiltersSidebar({
  filters,
  onFilterChange,
  categories = [],
  className,
}: ProductFiltersProps) {
  const handleCategoryChange = (categoryId: string) => {
    onFilterChange({
      ...filters,
      category_id: filters.category_id === categoryId ? undefined : categoryId,
    });
  };

  const handlePriceChange = (range: string) => {
    const [min, max] = range.split("-").map((v) => (v ? parseInt(v) : undefined));
    onFilterChange({
      ...filters,
      min_price: min,
      max_price: max,
    });
  };

  const handleInStockChange = (checked: boolean) => {
    onFilterChange({
      ...filters,
      in_stock: checked || undefined,
    });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <div className={cn("hidden lg:block w-64 flex-shrink-0", className)}>
      <Card className="sticky top-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <FilterSection title="Categories">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={filters.category_id === cat.id}
                    onChange={() => handleCategoryChange(cat.id)}
                    className="rounded-full border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{cat.name}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Price Range */}
        <FilterSection title="Price Range">
          <div className="space-y-2">
            {priceRanges.map((range) => (
              <label key={range.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="price"
                  checked={
                    filters.min_price !== undefined &&
                    `${filters.min_price || 0}-${filters.max_price || ""}` === range.value
                  }
                  onChange={() => handlePriceChange(range.value)}
                  className="rounded-full border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">{range.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Availability */}
        <FilterSection title="Availability" defaultOpen={false}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.in_stock === true}
              onChange={(e) => handleInStockChange(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">In Stock Only</span>
          </label>
        </FilterSection>
      </Card>
    </div>
  );
}

/**
 * Mobile Filters Sheet
 */
export function MobileFiltersSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  categories = [],
}: ProductFiltersProps & { isOpen: boolean; onClose: () => void }) {
  const handlePriceChange = (range: string) => {
    const [min, max] = range.split("-").map((v) => (v ? parseInt(v) : undefined));
    onFilterChange({
      ...filters,
      min_price: min,
      max_price: max,
    });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline"
                >
                  Clear all
                </button>
                <button onClick={onClose}>
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              {/* Sort */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Sort By</h4>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        onFilterChange({ ...filters, sort_by: option.value as any })
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm border transition-colors",
                        filters.sort_by === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 text-gray-600"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            category_id: filters.category_id === cat.id ? undefined : cat.id,
                          })
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm border transition-colors",
                          filters.category_id === cat.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-gray-200 text-gray-600"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => handlePriceChange(range.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm border transition-colors",
                        `${filters.min_price || 0}-${filters.max_price || ""}` === range.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 text-gray-600"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* In Stock */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.in_stock === true}
                  onChange={(e) =>
                    onFilterChange({ ...filters, in_stock: e.target.checked || undefined })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-gray-700">Show in-stock items only</span>
              </label>
            </div>

            {/* Apply Button */}
            <div className="p-4 border-t border-gray-100 safe-bottom">
              <Button fullWidth onClick={onClose}>
                Apply Filters
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

