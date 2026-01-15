import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetCategoryBySlugQuery, useGetSubcategoriesQuery, useGetCategoryByIdQuery } from "@/store/api/categoryApi";
import { useGetProductsQuery } from "@/store/api/productApi";
import { useAddToCartMutation } from "@/store/api/cartApi";
import { useAppSelector } from "@/store/hooks";
import { ProductCard } from "@/components/product/ProductCard";
import { Spinner } from "@/components/ui/Spinner";
import { Category } from "@/types/category";
import { ProductFilters } from "@/types/product";

const SIDEBAR_WIDTH = 85;

type SortOption = "relevance" | "price_low" | "price_high" | "rating" | "newest";
type PriceRange = { min: number; max: number } | null;

export default function CategoryDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { slug, initialCategoryId } = route.params as { slug: string; initialCategoryId?: string };

  const { data: category, isLoading: categoryLoading } = useGetCategoryBySlugQuery(slug);
  
  const parentCategoryId = category?.parent_id || category?.id || "";
  
  const { data: subcategories, isLoading: subcategoriesLoading } = useGetSubcategoriesQuery(
    parentCategoryId,
    { skip: !parentCategoryId }
  );

  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [priceRange, setPriceRange] = useState<PriceRange>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showSellUnitModal, setShowSellUnitModal] = useState(false);
  const [selectedProductForUnit, setSelectedProductForUnit] = useState<any>(null);

  // Update selected subcategory when category loads
  useEffect(() => {
    if (category) {
      if (initialCategoryId) {
        setSelectedSubcategoryId(initialCategoryId);
      } else if (category.parent_id && category.id) {
        setSelectedSubcategoryId(category.id);
      }
    }
  }, [category, initialCategoryId]);

  useEffect(() => {
    if (category && subcategories && category.parent_id && category.id) {
      const isInList = subcategories.some(sub => sub.id === category.id);
      if (!isInList && !selectedSubcategoryId) {
        setSelectedSubcategoryId(category.id);
      }
    }
  }, [subcategories, category, selectedSubcategoryId]);

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
      f.sort_by = sortBy as any;
    }
    
    return f;
  }, [activeCategoryId, priceRange, sortBy]);

  const {
    data: productsData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useGetProductsQuery(
    {
      page: productsPage,
      size: 20,
      filters,
    },
    { 
      skip: !activeCategoryId,
      // Force refetch when category changes to avoid stale data
      refetchOnMountOrArgChange: true,
    }
  );

  // Force refetch when category changes to fix stale product issue
  // Use useRef to prevent unnecessary refetches
  const prevCategoryIdRef = useRef<string>("");
  useEffect(() => {
    if (activeCategoryId && activeCategoryId !== prevCategoryIdRef.current) {
      prevCategoryIdRef.current = activeCategoryId;
      setProductsPage(1);
      // Don't call refetch here - RTK Query will handle it with refetchOnMountOrArgChange
    }
  }, [activeCategoryId]);

  // Apply brand filter client-side (since API doesn't support it yet)
  const filteredProducts = useMemo(() => {
    if (!productsData?.items) return [];
    let filtered = [...productsData.items];
    
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        product.vendor_name && selectedBrands.includes(product.vendor_name)
      );
    }
    
    return filtered;
  }, [productsData?.items, selectedBrands]);

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();

  const { data: parentCategory } = useGetCategoryByIdQuery(
    parentCategoryId,
    { skip: !parentCategoryId || !category?.parent_id || parentCategoryId === (category?.id || "") }
  );

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

  // Get unique brands from products
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    productsData?.items.forEach(product => {
      if (product.vendor_name) {
        brands.add(product.vendor_name);
      }
    });
    return Array.from(brands).sort();
  }, [productsData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setProductsPage(1);
    await refetchProducts();
    setRefreshing(false);
  }, [refetchProducts]);

  const handleLoadMore = useCallback(() => {
    if (productsData && productsPage < productsData.pages && !productsFetching) {
      setProductsPage((prev) => prev + 1);
    }
  }, [productsData, productsPage, productsFetching]);

  const handleSubcategorySelect = useCallback((subcategoryId: string | null) => {
    // Optimize: Only update if different
    if (selectedSubcategoryId !== subcategoryId) {
      setSelectedSubcategoryId(subcategoryId);
      setProductsPage(1);
      // Clear filters when switching categories for better UX
      setPriceRange(null);
      setSelectedBrands([]);
      setSortBy("relevance");
    }
  }, [selectedSubcategoryId]);

  const handleProductPress = useCallback((productSlug: string) => {
    (navigation as any).navigate("ProductDetail", { slug: productSlug });
  }, [navigation]);

  const handleAddToCart = async (product: any, sellUnitId?: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "Please login to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: () => {
              (navigation as any).navigate("Login");
            },
          },
        ]
      );
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
      ? product.sell_units?.find((su: any) => su.id === sellUnitId)
      : product.sell_units?.find((su: any) => su.is_default) || product.sell_units?.[0];
    
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

  const handleSortSelect = (sort: SortOption) => {
    setSortBy(sort);
    setShowSortModal(false);
    setProductsPage(1);
  };

  const handlePriceSelect = (range: PriceRange) => {
    setPriceRange(range);
    setShowPriceModal(false);
    setProductsPage(1);
  };

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) 
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  const applyBrands = () => {
    setShowBrandModal(false);
    setProductsPage(1);
  };

  const clearFilters = () => {
    setSortBy("relevance");
    setPriceRange(null);
    setSelectedBrands([]);
    setProductsPage(1);
  };

  const handleFilterPress = () => {
    setShowFilterModal(true);
  };

  const hasActiveFilters = sortBy !== "relevance" || priceRange !== null || selectedBrands.length > 0;

  if (categoryLoading) {
    return <Spinner />;
  }

  if (!category) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Category not found</Text>
      </View>
    );
  }

  const products = filteredProducts.length > 0 ? filteredProducts : (productsData?.items || []);
  const activeSubcategoryId = selectedSubcategoryId || (category?.parent_id ? category.id : category?.id) || "";

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {category?.parent_id && parentCategory ? parentCategory.name : category?.name || ""}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={() => (navigation as any).navigate("Search")} 
                style={styles.headerIcon}
              >
                <Ionicons name="search" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Content - Sidebar + Filters + Products (all parallel) */}
        <View style={styles.contentContainer}>
          {/* Filters floating right - parallel to sidebar */}
          <View style={styles.filterBarFloating}>
            <TouchableOpacity 
              style={[styles.filterButton, showFilterModal && styles.filterButtonActive]} 
              onPress={handleFilterPress}
            >
              <Ionicons name="options-outline" size={14} color={showFilterModal ? "#22C55E" : "#111827"} />
              <Text style={[styles.filterButtonText, showFilterModal && styles.filterButtonTextActive]}>
                Filters
              </Text>
              {hasActiveFilters && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {[sortBy !== "relevance", priceRange !== null, selectedBrands.length > 0].filter(Boolean).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, sortBy !== "relevance" && styles.filterButtonActive]} 
              onPress={() => setShowSortModal(true)}
            >
              <Ionicons name="swap-vertical-outline" size={14} color={sortBy !== "relevance" ? "#22C55E" : "#111827"} />
              <Text style={[styles.filterButtonText, sortBy !== "relevance" && styles.filterButtonTextActive]}>
                Sort
              </Text>
              {sortBy !== "relevance" && <View style={styles.filterBadge} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, priceRange && styles.filterButtonActive]} 
              onPress={() => setShowPriceModal(true)}
            >
              <Text style={[styles.filterButtonText, priceRange && styles.filterButtonTextActive]}>
                Price
              </Text>
              {priceRange && <View style={styles.filterBadge} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, selectedBrands.length > 0 && styles.filterButtonActive]} 
              onPress={() => setShowBrandModal(true)}
            >
              <Text style={[styles.filterButtonText, selectedBrands.length > 0 && styles.filterButtonTextActive]}>
                Brand
              </Text>
              {selectedBrands.length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{selectedBrands.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Left Sidebar - Subcategories */}
          <View style={styles.sidebar}>
            <FlatList
              data={subcategoriesList}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.id === activeSubcategoryId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.sidebarItem,
                      isSelected && styles.sidebarItemSelected,
                    ]}
                    onPress={() => handleSubcategorySelect(item.isAll ? null : item.id)}
                    activeOpacity={0.7}
                  >
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.sidebarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.sidebarImagePlaceholder}>
                        <Ionicons
                          name="grid-outline"
                          size={18}
                          color={isSelected ? "#22C55E" : "#9CA3AF"}
                        />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.sidebarText,
                        isSelected && styles.sidebarTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {item.isAll ? "All" : item.name}
                    </Text>
                    {isSelected && <View style={styles.sidebarIndicator} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Right Side - Products Grid */}
          <View style={styles.productsContainer}>
            {productsLoading && products.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22C55E" />
              </View>
            ) : products.length > 0 ? (
              <FlatList
                data={products}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    onPress={() => handleProductPress(item.slug)}
                    onAddToCart={() => handleAddToCart(item)}
                  />
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.productsList}
                columnWrapperStyle={styles.productRow}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#22C55E"
                  />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  productsFetching && productsPage > 1 ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color="#22C55E" />
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyProducts}>
                    <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyProductsText}>No products available</Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.emptyProducts}>
                <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyProductsText}>No products available</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Filter Modal - Comprehensive */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {/* Sort Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                {[
                  { value: "relevance", label: "Relevance" },
                  { value: "price_low", label: "Price: Low to High" },
                  { value: "price_high", label: "Price: High to Low" },
                  { value: "rating", label: "Rating" },
                  { value: "newest", label: "Newest First" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.modalOption}
                    onPress={() => {
                      setSortBy(option.value as SortOption);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{option.label}</Text>
                    {sortBy === option.value && (
                      <Ionicons name="checkmark" size={20} color="#22C55E" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                {[
                  null,
                  { min: 0, max: 100 },
                  { min: 100, max: 500 },
                  { min: 500, max: 1000 },
                  { min: 1000, max: 2000 },
                  { min: 2000, max: 5000 },
                ].map((range, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.modalOption}
                    onPress={() => {
                      setPriceRange(range);
                    }}
                  >
                    <Text style={styles.modalOptionText}>
                      {range ? `₹${range.min} - ₹${range.max}` : "All Prices"}
                    </Text>
                    {priceRange?.min === range?.min && priceRange?.max === range?.max && (
                      <Ionicons name="checkmark" size={20} color="#22C55E" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Brand Section */}
              {availableBrands.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Brands</Text>
                  {availableBrands.map((brand) => (
                    <TouchableOpacity
                      key={brand}
                      style={styles.modalOption}
                      onPress={() => handleBrandToggle(brand)}
                    >
                      <Text style={styles.modalOptionText}>{brand}</Text>
                      {selectedBrands.includes(brand) && (
                        <Ionicons name="checkmark" size={20} color="#22C55E" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  clearFilters();
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.modalClearText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => {
                  setShowFilterModal(false);
                  setProductsPage(1);
                }}
              >
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {[
                { value: "relevance", label: "Relevance" },
                { value: "price_low", label: "Price: Low to High" },
                { value: "price_high", label: "Price: High to Low" },
                { value: "rating", label: "Rating" },
                { value: "newest", label: "Newest First" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => handleSortSelect(option.value as SortOption)}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color="#22C55E" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Price Modal */}
      <Modal
        visible={showPriceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Price Range</Text>
              <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {[
                null,
                { min: 0, max: 100 },
                { min: 100, max: 500 },
                { min: 500, max: 1000 },
                { min: 1000, max: 2000 },
                { min: 2000, max: 5000 },
              ].map((range, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() => handlePriceSelect(range)}
                >
                  <Text style={styles.modalOptionText}>
                    {range ? `₹${range.min} - ₹${range.max}` : "All Prices"}
                  </Text>
                  {priceRange?.min === range?.min && priceRange?.max === range?.max && (
                    <Ionicons name="checkmark" size={20} color="#22C55E" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Brand Modal */}
      <Modal
        visible={showBrandModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBrandModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Brands</Text>
              <TouchableOpacity onPress={() => setShowBrandModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {availableBrands.map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={styles.modalOption}
                  onPress={() => handleBrandToggle(brand)}
                >
                  <Text style={styles.modalOptionText}>{brand}</Text>
                  {selectedBrands.includes(brand) && (
                    <Ionicons name="checkmark" size={20} color="#22C55E" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  setSelectedBrands([]);
                }}
              >
                <Text style={styles.modalClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={applyBrands}
              >
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  backButton: {
    padding: 4,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerIcon: {
    padding: 4,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  filterBarFloating: {
    position: "absolute",
    top: 0,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    gap: 5,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderRadius: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
  },
  filterButtonTextActive: {
    color: "#22C55E",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  contentContainer: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 0.5,
    borderRightColor: "#E5E7EB",
    paddingTop: 0, // Start parallel to filters
  },
  sidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    position: "relative",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
    minHeight: 75,
    justifyContent: "center",
  },
  sidebarItemSelected: {
    backgroundColor: "#F0FDF4",
  },
  sidebarImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#F9FAFB",
  },
  sidebarImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sidebarText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  sidebarTextSelected: {
    color: "#22C55E",
    fontWeight: "700",
  },
  sidebarIndicator: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#22C55E",
    borderRadius: 2,
  },
  productsContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: 40, // Start below floating filters
  },
  productsList: {
    padding: 8,
    paddingTop: 4, // Reduced top padding since container has paddingTop
    paddingBottom: 16,
  },
  productRow: {
    justifyContent: "space-between",
    marginBottom: 0,
    gap: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyProducts: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyProductsText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 12,
    fontWeight: "500",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
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
  modalBody: {
    paddingVertical: 8,
  },
  filterSection: {
    marginBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  modalClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalClearText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  modalApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    alignItems: "center",
  },
  modalApplyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Sell Unit Modal Styles
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
