"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronRight, Home, ArrowLeft, Grid3X3, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";

import { Button, Card } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { useGetCategoryBySlugQuery, useGetSubcategoriesQuery } from "@/store/api/categoryApi";
import { Category } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Breadcrumb Component
 */
function Breadcrumb({ category }: { category: Category }) {
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
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
      <span className="text-gray-900 font-medium truncate">{category.name}</span>
    </nav>
  );
}

/**
 * Subcategory Card
 */
function SubcategoryCard({ category, index }: { category: Category; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/category/${category.slug}`}>
        <Card
          hoverable
          className="flex items-center gap-3 group"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
            <Grid3X3 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium text-gray-900 group-hover:text-primary transition-colors truncate">
            {category.name}
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto flex-shrink-0" />
        </Card>
      </Link>
    </motion.div>
  );
}

/**
 * Category Detail Page
 */
export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: category, isLoading: categoryLoading } = useGetCategoryBySlugQuery(slug);
  const { data: subcategories, isLoading: subcategoriesLoading } = useGetSubcategoriesQuery(
    category?.id || "",
    { skip: !category?.id }
  );

  const isLoading = categoryLoading;
  const hasSubcategories = subcategories && subcategories.length > 0;

  if (isLoading) {
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
      <div className="bg-white border-b border-gray-100">
        <div className="container-app">
          {/* Breadcrumb */}
          <Breadcrumb category={category} />

          {/* Category Info */}
          <div className="py-4 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-gray-600 text-sm sm:text-base">
                    {category.description}
                  </p>
                )}
              </div>

              {/* Filter button (for products page) */}
              <Button
                variant="outline"
                size="sm"
                leftIcon={<SlidersHorizontal className="h-4 w-4" />}
                className="hidden sm:flex"
              >
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-6">
        {/* Subcategories */}
        {hasSubcategories && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Subcategories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subcategories.map((subcat, index) => (
                <SubcategoryCard key={subcat.id} category={subcat} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Products in {category.name}
            </h2>
            
            {/* Mobile filter button */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
              className="sm:hidden"
            >
              Filters
            </Button>
          </div>

          {/* Products Grid Placeholder */}
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Products Coming Soon
            </h3>
            <p className="text-gray-500 text-sm">
              Product listing will be implemented in Phase 3
            </p>
            <Link href="/products" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                Browse All Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

