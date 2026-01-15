"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Grid3X3, List, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import { Card, Input } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { CategoryTreeNode } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Category icons/emojis mapping (will be replaced with actual images)
 */
const categoryIcons: Record<string, string> = {
  "fruits-vegetables": "🥗",
  "dairy-eggs": "🥛",
  "meat-seafood": "🍖",
  "bakery": "🍞",
  "beverages": "🥤",
  "snacks": "🍿",
  "household": "🧹",
  "personal-care": "🧴",
  "default": "📦",
};

const categoryColors: Record<string, string> = {
  "fruits-vegetables": "bg-green-100 hover:bg-green-200",
  "dairy-eggs": "bg-blue-100 hover:bg-blue-200",
  "meat-seafood": "bg-red-100 hover:bg-red-200",
  "bakery": "bg-amber-100 hover:bg-amber-200",
  "beverages": "bg-purple-100 hover:bg-purple-200",
  "snacks": "bg-orange-100 hover:bg-orange-200",
  "household": "bg-cyan-100 hover:bg-cyan-200",
  "personal-care": "bg-pink-100 hover:bg-pink-200",
  "default": "bg-gray-100 hover:bg-gray-200",
};

/**
 * Category Card Component
 */
function CategoryCard({ category, index }: { category: CategoryTreeNode; index: number }) {
  const icon = categoryIcons[category.slug] || categoryIcons.default;
  const color = categoryColors[category.slug] || categoryColors.default;
  const hasChildren = category.children && category.children.length > 0;
  const hasImage = category.image_url && category.image_url.trim() !== "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/category/${category.slug}`}>
        <Card
          padding="none"
          hoverable
          className="group overflow-hidden"
        >
          {/* Icon/Image */}
          <div className={cn("h-24 sm:h-32 flex items-center justify-center transition-colors relative overflow-hidden", !hasImage && color)}>
            {hasImage ? (
              <Image
                src={category.image_url!}
                alt={category.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.parentElement?.querySelector(".fallback-icon");
                  if (fallback) {
                    (fallback as HTMLElement).style.display = "flex";
                  }
                }}
              />
            ) : null}
            <span className={cn("text-4xl sm:text-5xl group-hover:scale-110 transition-transform", hasImage && "hidden fallback-icon")}>
              {icon}
            </span>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
              {category.name}
            </h3>
            {hasChildren && (
              <p className="text-xs text-gray-500 mt-1">
                {category.children.length} subcategories
              </p>
            )}
          </div>

          {/* Arrow indicator */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

/**
 * Categories Page
 */
export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: categories, isLoading, error } = useGetCategoryTreeQuery();

  // Filter categories based on search
  const filteredCategories = categories?.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-20">
        <div className="container-app py-4">
          {/* Title & View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              All Categories
            </h1>
            
            {/* View Toggle (Desktop) */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-primary"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-white shadow-sm text-primary"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Failed to load categories</p>
          </div>
        ) : filteredCategories && filteredCategories.length > 0 ? (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                : "space-y-3"
            )}
          >
            {filteredCategories.map((category, index) => (
              viewMode === "grid" ? (
                <CategoryCard key={category.id} category={category} index={index} />
              ) : (
                <Link key={category.id} href={`/category/${category.slug}`}>
                  <Card hoverable className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0",
                      categoryColors[category.slug] || categoryColors.default
                    )}>
                      <span className="text-2xl">
                        {categoryIcons[category.slug] || categoryIcons.default}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {category.name}
                      </h3>
                      {category.children.length > 0 && (
                        <p className="text-sm text-gray-500">
                          {category.children.length} subcategories
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </Card>
                </Link>
              )
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500">No categories found</p>
          </div>
        )}
      </div>
    </div>
  );
}

