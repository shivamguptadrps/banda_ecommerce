"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Grid3X3, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import { Spinner } from "@/components/ui/Spinner";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { CategoryTreeNode } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Subcategory Card Component - 4 column grid item (matching React Native)
 */
function SubcategoryCard({ category, index }: { category: CategoryTreeNode; index: number }) {
  const hasImage = category.image_url && category.image_url.trim() !== "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link href={`/category/${category.slug}`}>
        <div className="flex flex-col items-center group cursor-pointer">
          {/* Image Container - Responsive and wider */}
          <div className="w-full aspect-square max-w-[100px] rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm mb-2 group-hover:shadow-lg group-hover:border-[#0c831f]/30 transition-all mx-auto">
            {hasImage ? (
              <Image
                src={category.image_url!}
                alt={category.name}
                width={100}
                height={100}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                <Grid3X3 className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
          {/* Name */}
          <p className="text-xs sm:text-sm font-medium text-gray-800 text-center leading-tight line-clamp-2 w-full">
            {category.name}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * Category Section Component - Top category with subcategories below (matching React Native)
 */
function CategorySection({ 
  section, 
  index 
}: { 
  section: { topCategory: CategoryTreeNode; subcategories: CategoryTreeNode[] };
  index: number;
}) {
  const { topCategory, subcategories } = section;

  // Only show sections that have subcategories
  if (subcategories.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="mb-8"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href={`/category/${topCategory.slug}`}>
          <h2 className="text-lg font-bold text-gray-900 hover:text-[#0c831f] transition-colors">
            {topCategory.name}
          </h2>
        </Link>
        <Link
          href={`/category/${topCategory.slug}`}
          className="text-sm font-semibold text-[#0c831f] hover:underline flex items-center gap-1"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Subcategories Grid - Responsive columns */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-5">
        {subcategories.map((subcategory, idx) => (
          <SubcategoryCard key={subcategory.id} category={subcategory} index={idx} />
        ))}
      </div>
    </motion.section>
  );
}

/**
 * Categories Page - Matching React Native CategoriesScreen
 * Shows top-level categories as section headers with subcategories below
 */
export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories, isLoading, error } = useGetCategoryTreeQuery();

  // Organize categories into sections (top-level categories with their children)
  const categorySections = useMemo(() => {
    if (!categories) return [];
    return categories.map((topCategory) => ({
      topCategory,
      subcategories: topCategory.children || [],
    }));
  }, [categories]);

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return categorySections;
    
    const query = searchQuery.toLowerCase();
    return categorySections.map(section => ({
      ...section,
      subcategories: section.subcategories.filter(sub => 
        sub.name.toLowerCase().includes(query)
      )
    })).filter(section => 
      section.topCategory.name.toLowerCase().includes(query) || 
      section.subcategories.length > 0
    );
  }, [categorySections, searchQuery]);

  return (
    <div className="min-h-screen bg-white">
      {/* Search Header - Matching React Native */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-20">
        <div className="container-app py-3 px-4">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-6 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Grid3X3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Failed to load categories</p>
          </div>
        ) : filteredSections.length > 0 ? (
          <div>
            {filteredSections.map((section, index) => (
              <CategorySection key={section.topCategory.id} section={section} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Grid3X3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No categories found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-sm text-[#0c831f] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
