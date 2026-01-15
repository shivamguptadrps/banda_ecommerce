import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { useGetProductsQuery } from "@/store/api/productApi";
import { useAddToCartMutation } from "@/store/api/cartApi";
import { useAppSelector } from "@/store/hooks";
import { SearchBar } from "@/components/home/SearchBar";
import { LocationPicker } from "@/components/home/LocationPicker";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { ProductCard } from "@/components/product/ProductCard";
import { CategoryDrawer } from "@/components/navigation/CategoryDrawer";
import { FloatingCartIcon } from "@/components/navigation/FloatingCartIcon";
import { Spinner } from "@/components/ui/Spinner";
import { useTabBar } from "@/contexts/TabBarContext";
import { CategoryTreeNode } from "@/types/category";
import { Product } from "@/types/product";

const { width } = Dimensions.get("window");
const HORIZONTAL_CARD_SIZE = 90;
const QUICK_CATEGORY_SIZE = 70;

// Category icons mapping - professional and clean
const CATEGORY_ICONS: Record<string, string> = {
  "All": "apps",
  "Fresh Fruits & Vegetables": "leaf",
  "Fresh": "leaf",
  "Grocery & Kitchen": "basket",
  "Snacks & Drinks": "fast-food",
  "Electronics & Mobiles": "phone-portrait",
  "Electronics": "headset",
  "Beauty & Personal Care": "sparkles",
  "Beauty": "sparkles",
  "Fashion & Lifestyle": "shirt",
  "Home & Living": "home",
  "Baby Care": "heart",
  "Health & Wellness": "medical",
  "Harvest Fest": "airplane",
};

const DEFAULT_CATEGORY_IMAGE = "https://via.placeholder.com/150x150?text=Category";

export default function HomeScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTopCategory, setSelectedTopCategory] = useState<string | null>(null);
  const [showSellUnitModal, setShowSellUnitModal] = useState(false);
  const [selectedProductForUnit, setSelectedProductForUnit] = useState<Product | null>(null);

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const isBuyer = user?.role === "buyer" || (!user?.role && isAuthenticated);
  const { setIsVisible } = useTabBar();
  
  // Track scroll position for tab bar hide/show
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Show tab bar when component mounts
  useEffect(() => {
    setIsVisible(true);
    return () => {
      setIsVisible(true); // Reset on unmount
    };
  }, [setIsVisible]);

  // Fetch category tree
  const { data: categoryTreeData, isLoading: categoriesLoading, refetch: refetchCategories } =
    useGetCategoryTreeQuery();

  // Fetch featured products
  const { data: featuredProductsData } = useGetProductsQuery({
    page: 1,
    size: 10,
    filters: { in_stock: true },
  });

  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchCategories();
    setRefreshing(false);
  };

  const handleSearchFocus = () => {
    (navigation as any).navigate("Search");
  };

  const handleLocationPress = () => {
    console.log("Location picker pressed");
  };

  const handleCategoryPress = (category: CategoryTreeNode) => {
    (navigation as any).navigate("CategoryDetail", { slug: category.slug });
  };

  const handleProductPress = (product: Product) => {
    (navigation as any).navigate("ProductDetail", { slug: product.slug });
  };

  const handleAddToCart = async (product: Product, sellUnitId?: string) => {
    if (!isBuyer || !isAuthenticated) {
      (navigation as any).navigate("Login");
      return;
    }

    // If product has multiple options and no unit selected, show modal
    const hasMultipleOptions = (product.sell_units?.length || 0) > 1;
    if (hasMultipleOptions && !sellUnitId) {
      setSelectedProductForUnit(product);
      setShowSellUnitModal(true);
      return;
    }

    // Use provided unit or default
    const selectedUnit = sellUnitId 
      ? product.sell_units?.find((su) => su.id === sellUnitId)
      : product.sell_units?.find((su) => su.is_default) || product.sell_units?.[0];
    
    if (!selectedUnit) {
      Alert.alert("Error", "Product unit not available");
      return;
    }

    try {
      await addToCart({
        product_id: product.id,
        sell_unit_id: selectedUnit.id,
        quantity: 1,
      }).unwrap();
      setShowSellUnitModal(false);
      setSelectedProductForUnit(null);
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      const errorMessage = error?.data?.detail || error?.message || "Failed to add item to cart";
      Alert.alert("Error", errorMessage);
    }
  };

  const handleSellUnitSelect = async (sellUnitId: string) => {
    if (selectedProductForUnit) {
      await handleAddToCart(selectedProductForUnit, sellUnitId);
    }
  };

  const handleCategoryFromDrawer = (slug: string) => {
    setDrawerVisible(false);
    (navigation as any).navigate("CategoryDetail", { slug });
  };

  // Get category icon
  const getCategoryIcon = (categoryName: string): string => {
    if (CATEGORY_ICONS[categoryName]) {
      return CATEGORY_ICONS[categoryName];
    }
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
      if (
        categoryName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(categoryName.toLowerCase())
      ) {
        return icon;
      }
    }
    return "grid";
  };

  // Organize categories into sections
  const categorySections = useMemo(() => {
    if (!categoryTreeData?.items) return [];
    return categoryTreeData.items.map((topCategory) => ({
      topCategory,
      subcategories: topCategory.children || [],
    }));
  }, [categoryTreeData]);

  // Get top categories for quick access
  const topCategories = useMemo(() => {
    if (!categoryTreeData?.items) return [];
    return categoryTreeData.items.slice(0, 8);
  }, [categoryTreeData]);

  // Featured products
  const featuredProducts = featuredProductsData?.items || [];

  // Render quick category item
  const renderQuickCategory = (category: CategoryTreeNode) => {
    const iconName = getCategoryIcon(category.name);
    const hasImage = category.image_url;

    return (
      <TouchableOpacity
        key={category.id}
        style={styles.quickCategoryItem}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.8}
      >
        <View style={styles.quickCategoryIconContainer}>
          {hasImage ? (
            <Image
              source={{ uri: category.image_url! }}
              style={styles.quickCategoryImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.quickCategoryIcon, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name={iconName as any} size={28} color="#22C55E" />
            </View>
          )}
        </View>
        <Text style={styles.quickCategoryText} numberOfLines={2}>
          {category.name.length > 12 ? category.name.substring(0, 10) + ".." : category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render subcategory card
  const renderSubcategoryCard = (subcategory: CategoryTreeNode) => {
    const hasImage = subcategory.image_url;
    const iconName = getCategoryIcon(subcategory.name);

    return (
      <TouchableOpacity
        key={subcategory.id}
        style={styles.subcategoryCardHorizontal}
        onPress={() => handleCategoryPress(subcategory)}
        activeOpacity={0.8}
      >
        <View style={styles.subcategoryImageContainerHorizontal}>
          {hasImage ? (
            <Image
              source={{ uri: subcategory.image_url! }}
              style={styles.subcategoryImage}
              resizeMode="cover"
              defaultSource={{ uri: DEFAULT_CATEGORY_IMAGE }}
            />
          ) : (
            <View style={styles.subcategoryIconContainer}>
              <Ionicons name={iconName as any} size={28} color="#22C55E" />
            </View>
          )}
        </View>
        <Text style={styles.subcategoryNameHorizontal} numberOfLines={2}>
          {subcategory.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render category section
  const renderCategorySection = (section: { topCategory: CategoryTreeNode; subcategories: CategoryTreeNode[] }) => {
    const { topCategory, subcategories } = section;

    if (subcategories.length === 0) return null;

    return (
      <View key={topCategory.id} style={styles.categorySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{topCategory.name}</Text>
          <TouchableOpacity onPress={() => handleCategoryPress(topCategory)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subcategoriesScroll}
        >
          {subcategories.map((subcat) => renderSubcategoryCard(subcat))}
        </ScrollView>
      </View>
    );
  };

  if (categoriesLoading && !categoryTreeData) {
    return <Spinner />;
  }

  const categories = categoryTreeData?.items || [];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header with Location */}
        <View style={styles.header}>
          <LocationPicker onPress={handleLocationPress} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#22C55E" />
          }
          onScroll={(event) => {
            const currentScrollY = event.nativeEvent.contentOffset.y;
            // Hide tab bar when scrolling down, show when scrolling up
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
              setIsVisible(false);
            } else if (currentScrollY < lastScrollY) {
              setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
          }}
          scrollEventThrottle={16}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              placeholder="Search for atta, dal, coke and more"
            />
          </View>

          {/* Banner Carousel */}
          <View style={styles.bannerContainer}>
            <BannerCarousel />
          </View>

          {/* Quick Categories */}
          <View style={styles.quickCategoriesContainer}>
            <Text style={styles.quickCategoriesTitle}>Shop by Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickCategoriesScroll}
            >
              {topCategories.map((category) => renderQuickCategory(category))}
            </ScrollView>
          </View>

          {/* Featured Products Section */}
          {featuredProducts.length > 0 && (
            <View style={styles.featuredSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Best Deals</Text>
                <TouchableOpacity
                  onPress={() => {
                    (navigation as any).navigate("ProductListing", {
                      title: "Best Deals",
                    });
                  }}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productsScroll}
              >
                {featuredProducts.slice(0, 8).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onPress={() => handleProductPress(product)}
                    onAddToCart={() => handleAddToCart(product)}
                    width={width * 0.42}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Category Sections */}
          {categorySections.map((section) => renderCategorySection(section))}

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Floating Cart Icon - Permanent on Screen */}
        <FloatingCartIcon />
      </View>

      {/* Category Drawer Modal */}
      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <CategoryDrawer
          onCategorySelect={handleCategoryFromDrawer}
          onClose={() => setDrawerVisible(false)}
        />
      </Modal>

      {/* Sell Unit Selection Modal */}
      <Modal
        visible={showSellUnitModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowSellUnitModal(false);
          setSelectedProductForUnit(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sellUnitModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Option</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowSellUnitModal(false);
                  setSelectedProductForUnit(null);
                }}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            {selectedProductForUnit && (
              <>
                <View style={styles.sellUnitProductInfo}>
                  <Text style={styles.sellUnitProductName} numberOfLines={2}>
                    {selectedProductForUnit.name}
                  </Text>
                </View>
                
                <ScrollView style={styles.sellUnitModalBody}>
                  {selectedProductForUnit.sell_units
                    ?.filter((unit: any) => unit.is_active !== false)
                    .map((unit: any) => {
                      const unitPrice = typeof unit.price === "number" 
                        ? unit.price 
                        : parseFloat(String(unit.price)) || 0;
                      
                      // Safely parse MRP - handle all edge cases
                      const unitMrpValue = unit.compare_price || unit.mrp;
                      let unitMrp: number | null = null;
                      
                      if (unitMrpValue != null && unitMrpValue !== undefined) {
                        if (typeof unitMrpValue === "number" && !isNaN(unitMrpValue)) {
                          unitMrp = unitMrpValue;
                        } else {
                          const parsed = parseFloat(String(unitMrpValue));
                          if (!isNaN(parsed) && isFinite(parsed)) {
                            unitMrp = parsed;
                          }
                        }
                      }
                      
                      const unitDiscount = (unitMrp != null && typeof unitMrp === "number" && unitMrp > unitPrice)
                        ? Math.round(((unitMrp - unitPrice) / unitMrp) * 100)
                        : 0;

                      return (
                        <TouchableOpacity
                          key={unit.id}
                          style={styles.sellUnitOption}
                          onPress={() => handleSellUnitSelect(unit.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.sellUnitOptionContent}>
                            <View style={styles.sellUnitOptionLeft}>
                              <Text style={styles.sellUnitOptionLabel}>{unit.label}</Text>
                              {unitDiscount > 0 && (
                                <View style={styles.sellUnitDiscountBadge}>
                                  <Text style={styles.sellUnitDiscountText}>{unitDiscount}% OFF</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.sellUnitOptionRight}>
                              <Text style={styles.sellUnitOptionPrice}>₹{unitPrice.toFixed(0)}</Text>
                              {unitMrp != null && typeof unitMrp === "number" && !isNaN(unitMrp) && unitMrp > unitPrice && (
                                <Text style={styles.sellUnitOptionMrp}>₹{unitMrp.toFixed(0)}</Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    paddingTop: StatusBar.currentHeight || 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bannerContainer: {
    marginBottom: 8,
  },
  quickCategoriesContainer: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: "#FAFAFA",
  },
  quickCategoriesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    paddingHorizontal: 16,
    letterSpacing: -0.3,
  },
  quickCategoriesScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  quickCategoryItem: {
    alignItems: "center",
    width: QUICK_CATEGORY_SIZE,
  },
  quickCategoryIconContainer: {
    width: QUICK_CATEGORY_SIZE,
    height: QUICK_CATEGORY_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  quickCategoryImage: {
    width: "100%",
    height: "100%",
  },
  quickCategoryIcon: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  quickCategoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  categorySection: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#22C55E",
  },
  subcategoriesScroll: {
    paddingRight: 16,
    paddingLeft: 0,
  },
  subcategoryCardHorizontal: {
    width: HORIZONTAL_CARD_SIZE,
    marginRight: 12,
  },
  subcategoryImageContainerHorizontal: {
    width: HORIZONTAL_CARD_SIZE,
    height: HORIZONTAL_CARD_SIZE,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subcategoryImage: {
    width: "100%",
    height: "100%",
  },
  subcategoryIconContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
  },
  subcategoryNameHorizontal: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  featuredSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  productsScroll: {
    paddingHorizontal: 16,
    paddingRight: 16,
    gap: 12,
  },
  bottomSpacing: {
    height: 20,
  },
  // Sell Unit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sellUnitModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  sellUnitProductInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  sellUnitProductName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 22,
  },
  sellUnitModalBody: {
    paddingVertical: 8,
    maxHeight: 400,
  },
  sellUnitOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  sellUnitOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sellUnitOptionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sellUnitOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  sellUnitDiscountBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  sellUnitDiscountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  sellUnitOptionRight: {
    alignItems: "flex-end",
  },
  sellUnitOptionPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sellUnitOptionMrp: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
});
