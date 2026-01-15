"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  ChevronRight,
  ChevronDown,
  Leaf,
  ShoppingBasket,
  UtensilsCrossed,
  Smartphone,
  Headphones,
  Sparkles,
  Shirt,
  Home,
  Heart,
  Stethoscope,
  Plane,
  Grid3X3,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button, Card } from "@/components/ui";
import { ProductCard } from "@/components/product";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/lib/constants";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated } from "@/store/slices/authSlice";
// Note: Location state not available in web app yet - using placeholder
import { useGetProductsQuery } from "@/store/api/productApi";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { cn } from "@/lib/utils";
import { CategoryTreeNode } from "@/types/category";

// Category icons mapping - matching React Native
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "All": Grid3X3,
  "Fresh Fruits & Vegetables": Leaf,
  "Fresh": Leaf,
  "Grocery & Kitchen": ShoppingBasket,
  "Snacks & Drinks": UtensilsCrossed,
  "Electronics & Mobiles": Smartphone,
  "Electronics": Headphones,
  "Beauty & Personal Care": Sparkles,
  "Beauty": Sparkles,
  "Fashion & Lifestyle": Shirt,
  "Home & Living": Home,
  "Baby Care": Heart,
  "Health & Wellness": Stethoscope,
  "Harvest Fest": Plane,
};

const getCategoryIcon = (categoryName: string): React.ElementType => {
  if (CATEGORY_ICONS[categoryName]) {
    return CATEGORY_ICONS[categoryName];
  }
  for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (
      categoryName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(categoryName.toLowerCase())
    ) {
      return Icon;
    }
  }
  return Grid3X3;
};

/**
 * Location Picker Component (matching React Native)
 */
function LocationPicker() {
  // TODO: Get location from Redux store
  const displayText = "Select Location"; // Placeholder

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container-app">
        <button className="flex items-center justify-between w-full py-3 px-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#22C55E]" />
            <div className="text-left">
              <p className="text-[10px] text-gray-500 font-medium">Delivering to Home</p>
              <p className="text-sm font-semibold text-gray-900">{displayText}</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

/**
 * Search Bar Component (matching React Native)
 */
function SearchBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  return (
    <div className="bg-white">
      <div className="container-app py-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for atta, dal, coke and more"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-100 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:bg-white transition-all text-sm font-medium"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <span className="text-gray-400 text-lg">×</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

/**
 * Banner Carousel Component (matching React Native)
 */
function BannerCarousel() {
  const banners = [
    {
      id: "1",
      title: "Free Delivery",
      subtitle: "On orders above ₹199",
      offer: "Use code: FREEDEL",
      gradient: ["#7B2D8E", "#9B4DAE"],
    },
    {
      id: "2",
      title: "Upto 50% OFF",
      subtitle: "On Fresh Vegetables",
      offer: "Shop Now",
      gradient: ["#FF6B35", "#FF8C5A"],
    },
    {
      id: "3",
      title: "New User Offer",
      subtitle: "Get ₹100 off",
      offer: "On first order",
      gradient: ["#22C55E", "#4ADE80"],
    },
  ];

  return (
    <div className="bg-white py-3">
      <div className="container-app">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {banners.map((banner, idx) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex-shrink-0 w-full max-w-md rounded-2xl overflow-hidden shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${banner.gradient[0]}, ${banner.gradient[1]})`,
              }}
            >
              <div className="p-6 flex items-center justify-between relative overflow-hidden">
                <div className="flex-1 z-10">
                  <h3 className="text-2xl font-extrabold text-white mb-2">{banner.title}</h3>
                  {banner.subtitle && (
                    <p className="text-white/90 font-semibold mb-3">{banner.subtitle}</p>
                  )}
                  {banner.offer && (
                    <span className="inline-block px-3 py-1.5 bg-white/25 backdrop-blur-sm border border-white/30 rounded-full text-xs font-bold text-white">
                      {banner.offer}
                    </span>
                  )}
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center z-10">
                  <ChevronRight className="h-6 w-6 text-white" />
                </div>
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-white/8 translate-y-1/2 -translate-x-1/2" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Categories Section (matching React Native - horizontal scroll)
 */
function QuickCategoriesSection() {
  const { data: categories, isLoading } = useGetCategoryTreeQuery();

  if (isLoading) {
    return (
      <section className="py-4 bg-gray-50">
        <div className="container-app">
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        </div>
      </section>
    );
  }

  if (!categories?.length) return null;

  const topCategories = categories.slice(0, 8);

  return (
    <section className="py-4 bg-gray-50">
      <div className="container-app">
        <h2 className="text-lg font-bold text-gray-900 mb-3 px-4">Shop by Category</h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-2">
          {topCategories.map((category, idx) => {
            const IconComponent = getCategoryIcon(category.name);
            const hasImage = category.image_url;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/category/${category.slug}`}>
                  <div className="flex flex-col items-center w-[70px] group cursor-pointer">
                    <div className="w-[70px] h-[70px] rounded-xl overflow-hidden bg-white shadow-sm mb-1.5 group-hover:shadow-md transition-shadow">
                      {hasImage ? (
                        <Image
                          src={category.image_url!}
                          alt={category.name}
                          width={70}
                          height={70}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#F0FDF4] flex items-center justify-center">
                          <IconComponent className="h-7 w-7 text-[#22C55E]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-gray-900 text-center leading-tight px-1 line-clamp-2">
                      {category.name.length > 12 ? category.name.substring(0, 10) + ".." : category.name}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Featured Products Section - Best Deals (matching React Native)
 */
function BestDealsSection() {
  const { data: featuredProducts, isLoading } = useGetProductsQuery({
    page: 1,
    size: 10,
    filters: { in_stock: true },
  });

  if (isLoading) {
    return (
      <section className="py-4 bg-white">
        <div className="container-app">
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        </div>
      </section>
    );
  }

  if (!featuredProducts?.items?.length) return null;

  return (
    <section className="py-4 bg-white">
      <div className="container-app">
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 className="text-xl font-bold text-gray-900">Best Deals</h2>
          <Link
            href="/products"
            className="text-sm font-semibold text-[#22C55E] hover:underline flex items-center gap-1"
          >
            See All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
          {featuredProducts.items.slice(0, 8).map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex-shrink-0 w-[160px] sm:w-[180px]"
            >
              <ProductCard product={product} index={idx} variant="compact" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Category Section with Subcategories (matching React Native)
 */
function CategorySection({ section }: { section: { topCategory: CategoryTreeNode; subcategories: CategoryTreeNode[] } }) {
  const { topCategory, subcategories } = section;

  if (subcategories.length === 0) return null;

  return (
    <section className="py-6 bg-white">
      <div className="container-app">
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 className="text-xl font-bold text-gray-900">{topCategory.name}</h2>
          <Link
            href={`/category/${topCategory.slug}`}
            className="text-sm font-semibold text-[#22C55E] hover:underline flex items-center gap-1"
          >
            See All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
          {subcategories.map((subcat, idx) => {
            const IconComponent = getCategoryIcon(subcat.name);
            const hasImage = subcat.image_url;

            return (
              <motion.div
                key={subcat.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link href={`/category/${subcat.slug}`}>
                  <div className="flex flex-col items-center w-[90px] group cursor-pointer">
                    <div className="w-[90px] h-[90px] rounded-xl overflow-hidden bg-gray-50 shadow-sm mb-2 group-hover:shadow-md transition-shadow">
                      {hasImage ? (
                        <Image
                          src={subcat.image_url!}
                          alt={subcat.name}
                          width={90}
                          height={90}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#F0FDF4] flex items-center justify-center">
                          <IconComponent className="h-7 w-7 text-[#22C55E]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-900 text-center leading-tight px-1 line-clamp-2">
                      {subcat.name}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Home Page - Redesigned to match React Native app
 */
export default function HomePage() {
  const { data: categoryTreeData, isLoading } = useGetCategoryTreeQuery();

  // Organize categories into sections (matching React Native)
  const categorySections = useMemo(() => {
    if (!categoryTreeData?.items) return [];
    return categoryTreeData.items.map((topCategory) => ({
      topCategory,
      subcategories: topCategory.children || [],
    }));
  }, [categoryTreeData]);

  if (isLoading && !categoryTreeData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Location Picker (matching React Native) */}
      <LocationPicker />

      {/* Search Bar (matching React Native) */}
      <SearchBar />

      {/* Banner Carousel (matching React Native) */}
      <BannerCarousel />

      {/* Quick Categories (matching React Native - horizontal scroll) */}
      <QuickCategoriesSection />

      {/* Best Deals Section (matching React Native) */}
      <BestDealsSection />

      {/* Category Sections with Subcategories (matching React Native) */}
      {categorySections.map((section) => (
        <CategorySection key={section.topCategory.id} section={section} />
      ))}

      {/* Bottom Spacing */}
      <div className="h-8" />
    </div>
  );
}
