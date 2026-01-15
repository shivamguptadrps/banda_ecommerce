"use client";

import { ProductCard } from "./ProductCard";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui";
import { Product } from "@/types/product";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyEmoji?: string;
}

/**
 * Product Grid Component
 */
export function ProductGrid({
  products,
  isLoading = false,
  emptyMessage = "No products found",
  emptyEmoji = "🔍",
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        emoji={emptyEmoji}
        title={emptyMessage}
        description="Try adjusting your filters or search query"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}

