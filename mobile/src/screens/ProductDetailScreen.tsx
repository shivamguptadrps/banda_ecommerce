import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Animated,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetProductBySlugQuery,
  useGetProductsByCategoryQuery,
} from "@/store/api/productApi";
import { useGetCategorySegmentsQuery } from "@/store/api/adminApi";
import { useGetCategoryAttributesQuery } from "@/store/api/categoryApi";
import { useAddToCartMutation } from "@/store/api/cartApi";
import { useAppSelector } from "@/store/hooks";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { SellUnit } from "@/types/product";
import { FloatingCartIcon } from "@/components/navigation/FloatingCartIcon";
import { useTabBar } from "@/contexts/TabBarContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.75; // Better image size for mobile
// Related products: Show 3 items per row, with proper spacing
const RELATED_PRODUCT_WIDTH = (SCREEN_WIDTH - 64) / 3; // 3 columns: 20px padding each side + 8px gaps

type ProductDetailRouteParams = {
  slug: string;
};

type RouteParams = {
  ProductDetail: ProductDetailRouteParams;
};

export default function ProductDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, "ProductDetail">>();
  const navigation = useNavigation();
  const { slug } = route.params;

  const [selectedUnit, setSelectedUnit] = useState<SellUnit | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [itemJustAdded, setItemJustAdded] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showRelatedProductVariantModal, setShowRelatedProductVariantModal] = useState(false);
  const [selectedRelatedProductForVariant, setSelectedRelatedProductForVariant] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const imageScrollRef = useRef<ScrollView>(null);
  const { setIsVisible } = useTabBar();

  const {
    data: product,
    isLoading,
    isError,
  } = useGetProductBySlugQuery(slug);

  // Get related products
  const { data: relatedProductsData } = useGetProductsByCategoryQuery(
    {
      categoryId: product?.category_id || "",
      page: 1,
      size: 8,
    },
    { skip: !product?.category_id }
  );

  // Get category attributes for dynamic features
  const { data: categoryAttributes, isLoading: isLoadingAttributes, error: attributesError } = useGetCategoryAttributesQuery(
    product?.category_id || "",
    { skip: !product?.category_id }
  );

  // Add to cart mutation - MUST be called before any early returns
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();
  
  // Check if user is authenticated
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Debug logging for category attributes
  useEffect(() => {
    if (product?.category_id) {
      console.log("🔍 Fetching attributes for category:", product.category_id);
    }
    if (categoryAttributes) {
      console.log("✅ Category attributes loaded:", categoryAttributes.items?.length || 0, "items");
    }
    if (attributesError) {
      console.error("❌ Error loading category attributes:", attributesError);
    }
  }, [product?.category_id, categoryAttributes, attributesError]);

  const relatedProducts = useMemo(() => {
    if (!relatedProductsData?.items) return [];
    return relatedProductsData.items
      .filter((p) => p.id !== product?.id)
      .slice(0, 6);
  }, [relatedProductsData, product?.id]);

  // Set default sell unit
  useEffect(() => {
    if (product?.sell_units?.length && !selectedUnit) {
      const defaultUnit =
        product.sell_units.find((su) => su.is_default) ||
        product.sell_units.find((su) => su.is_active) ||
        product.sell_units[0];
      setSelectedUnit(defaultUnit);
    }
  }, [product, selectedUnit]);

  // Hide tab bar on mount, show on unmount
  useEffect(() => {
    setIsVisible(false);
    return () => {
      setIsVisible(true);
    };
  }, [setIsVisible]);

  if (isLoading) {
    return <Spinner />;
  }

  if (isError || !product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Product not found</Text>
        <Button onPress={() => navigation.goBack()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  const defaultUnit =
    selectedUnit ||
    product.sell_units?.find((su) => su.is_default) ||
    product.sell_units?.[0];

  const images: Array<{ image_url: string; url?: string; is_primary: boolean }> = product.images?.length > 0
    ? product.images.map(img => ({ 
        image_url: img.image_url, 
        url: 'url' in img ? img.url : undefined, 
        is_primary: img.is_primary 
      }))
    : product.primary_image
    ? [{ image_url: product.primary_image, is_primary: true }]
    : [];

  // Ensure price is always a number
  const priceValue = defaultUnit?.price ?? product.min_price ?? 0;
  const price =
    typeof priceValue === "number"
      ? priceValue
      : parseFloat(String(priceValue)) || 0;

  // Ensure mrp is always a number if it exists
  const mrpValue = defaultUnit?.mrp ?? defaultUnit?.compare_price;
  const mrp = mrpValue
    ? typeof mrpValue === "number"
      ? mrpValue
      : parseFloat(String(mrpValue)) || null
    : null;

  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const handleAddToCart = async (goToCheckout: boolean = false) => {
    if (!defaultUnit || !product.is_in_stock || isAddingToCart) return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "Please login to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: () => {
              // Navigate to login screen
              (navigation as any).navigate("Login");
            },
          },
        ]
      );
      return;
    }
    
    try {
      await addToCart({
        product_id: product.id,
        sell_unit_id: defaultUnit.id,
        quantity: quantity,
      }).unwrap();
      
      // Set flag to show "Go to Cart" button
      setItemJustAdded(true);
      
      // Auto-hide the button after 5 seconds
      setTimeout(() => {
        setItemJustAdded(false);
      }, 5000);
      
      // If Buy Now, go directly to checkout
      if (goToCheckout) {
        setItemJustAdded(false);
        (navigation as any).navigate("Checkout");
        return;
      }
      
      // Show bottom sheet modal
      setShowCartModal(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } catch (error: any) {
      console.error("❌ Failed to add to cart:", error);
      
      // Handle different error types
      if (error?.status === 403) {
        Alert.alert(
          "Authentication Required",
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
      } else {
        Alert.alert(
          "Error",
          error?.data?.detail || "Failed to add item to cart. Please try again."
        );
      }
    }
  };

  const handleViewStore = () => {
    (navigation as any).navigate("VendorStore", { vendorId: product.vendor_id });
  };

  const handleProductPress = (productSlug: string) => {
    (navigation as any).navigate("ProductDetail", { slug: productSlug });
  };

  const handleAddToCartFromCard = async (productId: string) => {
    // Find the product in related products
    const relatedProduct = relatedProducts.find(p => p.id === productId);
    if (!relatedProduct) return;
    
    // Check if product has multiple options
    const hasMultipleOptions = (relatedProduct.sell_units?.length || 0) > 1;
    if (hasMultipleOptions) {
      // Show variant modal instead of navigating
      setSelectedRelatedProductForVariant(relatedProduct);
      setShowRelatedProductVariantModal(true);
      return;
    }
    
    // Add directly if single option
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "Please login to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: () => (navigation as any).navigate("Login"),
          },
        ]
      );
      return;
    }
    
    const defaultUnit = relatedProduct.sell_units?.[0];
    if (!defaultUnit) return;
    
    try {
      await addToCart({
        product_id: relatedProduct.id,
        sell_unit_id: defaultUnit.id,
        quantity: 1,
      }).unwrap();
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
    }
  };

  const handleRelatedProductVariantSelect = async (sellUnitId: string) => {
    if (!selectedRelatedProductForVariant || !isAuthenticated) {
      Alert.alert(
        "Login Required",
        "Please login to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: () => (navigation as any).navigate("Login"),
          },
        ]
      );
      setShowRelatedProductVariantModal(false);
      return;
    }

    try {
      await addToCart({
        product_id: selectedRelatedProductForVariant.id,
        sell_unit_id: sellUnitId,
        quantity: 1,
      }).unwrap();
      
      setShowRelatedProductVariantModal(false);
      setSelectedRelatedProductForVariant(null);
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      Alert.alert("Error", "Failed to add item to cart. Please try again.");
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            {images.length > 0 ? (
              <>
                <ScrollView
                  ref={imageScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => {
                    const index = Math.round(
                      e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                    );
                    setCurrentImageIndex(index);
                  }}
                  scrollEventThrottle={16}
                >
                  {images.map((img, index) => (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.95}
                      onPress={() => setShowImageModal(true)}
                      style={styles.imageWrapper}
                    >
                      <Image
                        source={{ uri: img.image_url || (img as any).url || '' }}
                        style={styles.image}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* Image Navigation */}
                {images.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={[styles.imageNav, styles.imageNavLeft]}
                      onPress={() => {
                        const prev = currentImageIndex === 0 
                          ? images.length - 1 
                          : currentImageIndex - 1;
                        setCurrentImageIndex(prev);
                        imageScrollRef.current?.scrollTo({
                          x: prev * SCREEN_WIDTH,
                          animated: true,
                        });
                      }}
                    >
                      <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageNav, styles.imageNavRight]}
                      onPress={() => {
                        const next = currentImageIndex === images.length - 1 
                          ? 0 
                          : currentImageIndex + 1;
                        setCurrentImageIndex(next);
                        imageScrollRef.current?.scrollTo({
                          x: next * SCREEN_WIDTH,
                          animated: true,
                        });
                      }}
                    >
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color="#D1D5DB" />
              </View>
            )}
          </View>

          {/* Image Indicators */}
          {images.length > 1 && (
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Top Actions */}
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.rightActions}>
              {/* Go to Cart Button - Shows when item is added */}
              {itemJustAdded && (
                <TouchableOpacity
                  style={styles.goToCartButton}
                  onPress={() => {
                    setItemJustAdded(false);
                    (navigation as any).navigate("MainTabs", { screen: "Cart" });
                  }}
                >
                  <Ionicons name="cart" size={18} color="#FFFFFF" />
                  <Text style={styles.goToCartText}>Go to Cart</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsWishlisted(!isWishlisted)}
              >
                <Ionicons
                  name={isWishlisted ? "heart" : "heart-outline"}
                  size={22}
                  color={isWishlisted ? "#EF4444" : "#FFFFFF"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  // TODO: Share functionality
                  console.log("Share product");
                }}
              >
                <Ionicons name="share-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Discount Badge */}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* Product Info */}
          <View style={styles.infoSection}>
            {/* Vendor */}
            {product.vendor_name && (
              <TouchableOpacity
                onPress={handleViewStore}
                style={styles.vendorRow}
                activeOpacity={0.7}
              >
                <Ionicons name="storefront" size={18} color="#22C55E" />
                <Text style={styles.vendorName}>{product.vendor_name}</Text>
                {product.vendor_rating && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {typeof product.vendor_rating === 'number' 
                        ? product.vendor_rating.toFixed(1) 
                        : parseFloat(String(product.vendor_rating))?.toFixed(1) || '0.0'}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            <Text style={styles.name}>{product.name}</Text>

            {/* Rating */}
            {product.rating && (
              <View style={styles.ratingRow}>
                <View style={styles.ratingBadgeMain}>
                  <Ionicons name="star" size={14} color="#FFFFFF" />
                  <Text style={styles.ratingTextMain}>
                    {typeof product.rating === 'number' 
                      ? product.rating.toFixed(1) 
                      : parseFloat(String(product.rating))?.toFixed(1) || '0.0'}
                  </Text>
                </View>
                <Text style={styles.reviewCount}>
                  ({product.review_count || 0} reviews)
                </Text>
              </View>
            )}

            {/* Price */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{price.toFixed(0)}</Text>
              {mrp && mrp > price && (
                <>
                  <Text style={styles.mrp}>₹{mrp.toFixed(0)}</Text>
                  {discount > 0 && (
                    <View style={styles.discountTag}>
                      <Text style={styles.discountTagText}>{discount}% off</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Stock Status */}
            <View
              style={[
                styles.stockCard,
                product.is_in_stock ? styles.stockCardIn : styles.stockCardOut,
              ]}
            >
              <Ionicons
                name={product.is_in_stock ? "checkmark-circle" : "close-circle"}
                size={20}
                color={product.is_in_stock ? "#22C55E" : "#EF4444"}
              />
              <View style={styles.stockInfo}>
                <Text
                  style={[
                    styles.stockText,
                    product.is_in_stock ? styles.stockTextIn : styles.stockTextOut,
                  ]}
                >
                  {product.is_in_stock ? "In Stock" : "Out of Stock"}
                </Text>
                {product.is_in_stock && product.inventory && (
                  <Text style={styles.stockQuantity}>
                    {product.inventory.available_quantity} {product.stock_unit} available
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Delivery Features */}
          <View style={styles.featuresSection}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="flash" size={16} color="#22C55E" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Fast Delivery</Text>
                <Text style={styles.featureSubtitle}>Delivered in 10-15 minutes</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark" size={16} color="#22C55E" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Quality Assured</Text>
                <Text style={styles.featureSubtitle}>Fresh products guaranteed</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="refresh" size={16} color="#22C55E" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Easy Returns</Text>
                <Text style={styles.featureSubtitle}>7-day return policy</Text>
              </View>
            </View>
          </View>

          {/* Sell Units */}
          {product.sell_units && product.sell_units.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Size/Quantity</Text>
              <View style={styles.unitsContainer}>
                {product.sell_units
                  .filter((u) => u.is_active !== false)
                  .map((unit) => {
                    const unitPrice =
                      typeof unit.price === "number"
                        ? unit.price
                        : parseFloat(String(unit.price)) || 0;
                    const unitMrp = unit.compare_price || unit.mrp;
                    const unitDiscount =
                      unitMrp && unitMrp > unitPrice
                        ? Math.round(((unitMrp - unitPrice) / unitMrp) * 100)
                        : 0;

                    return (
                      <TouchableOpacity
                        key={unit.id}
                        style={[
                          styles.unitCard,
                          defaultUnit?.id === unit.id && styles.unitCardActive,
                        ]}
                        onPress={() => setSelectedUnit(unit)}
                      >
                        <View style={styles.unitCardContent}>
                          <Text
                            style={[
                              styles.unitLabel,
                              defaultUnit?.id === unit.id &&
                                styles.unitLabelActive,
                            ]}
                          >
                            {unit.label}
                          </Text>
                          <View style={styles.unitPriceRow}>
                            <Text
                              style={[
                                styles.unitPrice,
                                defaultUnit?.id === unit.id &&
                                  styles.unitPriceActive,
                              ]}
                            >
                              ₹{unitPrice.toFixed(0)}
                            </Text>
                            {unitMrp && unitMrp > unitPrice && (
                              <Text style={styles.unitMrp}>
                                ₹{typeof unitMrp === "number" ? unitMrp.toFixed(0) : parseFloat(String(unitMrp)).toFixed(0)}
                              </Text>
                            )}
                          </View>
                        </View>
                        {unitDiscount > 0 && (
                          <View style={styles.unitDiscountBadge}>
                            <Text style={styles.unitDiscountText}>
                              {unitDiscount}% off
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          )}

          {/* Quantity Selector */}
          {product.is_in_stock && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Ionicons name="remove" size={16} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Ionicons name="add" size={16} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Vendor Info Card */}
          {product.vendor_name && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sold by</Text>
              <TouchableOpacity
                style={styles.vendorCard}
                onPress={handleViewStore}
              >
                <View style={styles.vendorCardContent}>
                  <View style={styles.vendorIcon}>
                    <Ionicons name="storefront" size={18} color="#22C55E" />
                  </View>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorCardName}>{product.vendor_name}</Text>
                    {product.vendor_rating && (
                      <View style={styles.vendorRating}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.vendorRatingText}>
                          {typeof product.vendor_rating === 'number' 
                            ? product.vendor_rating.toFixed(1) 
                            : parseFloat(String(product.vendor_rating))?.toFixed(1) || '0.0'} rating
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Product Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            <View style={styles.infoGrid}>
              {product.category_name && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>{product.category_name}</Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Stock Unit</Text>
                <Text style={styles.infoValue}>{product.stock_unit}</Text>
              </View>
              {product.inventory && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Available</Text>
                  <Text style={styles.infoValue}>
                    {product.inventory.available_quantity} {product.stock_unit}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Dynamic Category Attributes */}
          {categoryAttributes && categoryAttributes.items && categoryAttributes.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <View style={styles.attributesContainer}>
                {categoryAttributes.items
                  .filter((attr: any) => attr.show_in_details && attr.is_active)
                  .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                  .map((attr: any) => (
                    <View key={attr.id} style={styles.attributeItem}>
                      <Text style={styles.attributeLabel}>{attr.name}</Text>
                      <Text style={styles.attributeValue}>
                        {attr.description || attr.unit || "N/A"}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Related Products - Horizontal Scroll with 3 items visible */}
          {relatedProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>You May Also Like</Text>
                {product.category_id && (
                  <TouchableOpacity
                    onPress={() =>
                      (navigation as any).navigate("ProductListing", {
                        categoryId: product.category_id,
                        title: product.category_name || "Products",
                      })
                    }
                  >
                    <Text style={styles.seeAll}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.relatedProductsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relatedProductsScroll}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  decelerationRate="fast"
                  snapToInterval={RELATED_PRODUCT_WIDTH + 8}
                  snapToAlignment="start"
                  bounces={false}
                  alwaysBounceHorizontal={false}
                  directionalLockEnabled={true}
                >
                  {relatedProducts.map((item) => (
                    <View key={item.id} style={styles.relatedProductWrapper}>
                      <ProductCard
                        product={item}
                        onPress={() => handleProductPress(item.slug)}
                        onAddToCart={() => handleAddToCartFromCard(item.id)}
                        width={RELATED_PRODUCT_WIDTH}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Action Bar */}
        {product.is_in_stock && (
          <View style={styles.actionBar}>
            <View style={styles.actionBarContent}>
              <View style={styles.priceSection}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalPrice}>
                  ₹{(price * quantity).toFixed(0)}
                </Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => handleAddToCart(false)}
                  style={[styles.actionBtn, styles.addToCartBtn]}
                  activeOpacity={0.7}
                  disabled={isAddingToCart}
                >
                  <Ionicons name="cart-outline" size={12} color="#22C55E" style={styles.buttonIcon} />
                  <Text style={styles.addToCartText} numberOfLines={1}>Add to Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAddToCart(true)}
                  style={[styles.actionBtn, styles.buyNowBtn]}
                  activeOpacity={0.7}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={12} color="#FFFFFF" style={styles.buttonIcon} />
                      <Text style={styles.buyNowText} numberOfLines={1}>Buy Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Added to Cart Bottom Sheet Modal */}
        <Modal
          visible={showCartModal}
          transparent
          animationType="none"
          onRequestClose={() => {
            Animated.timing(slideAnim, {
              toValue: 300,
              duration: 250,
              useNativeDriver: true,
            }).start(() => setShowCartModal(false));
          }}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              Animated.timing(slideAnim, {
                toValue: 300,
                duration: 250,
                useNativeDriver: true,
              }).start(() => setShowCartModal(false));
            }}
          >
            <Animated.View
              style={[
                styles.cartModalContainer,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.cartModalHandle} />
              <View style={styles.cartModalContent}>
                <TouchableOpacity
                  style={styles.cartModalClose}
                  onPress={() => {
                    Animated.timing(slideAnim, {
                      toValue: 300,
                      duration: 250,
                      useNativeDriver: true,
                    }).start(() => setShowCartModal(false));
                  }}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
                <View style={styles.cartModalIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
                </View>
                <Text style={styles.cartModalTitle}>Added to Cart!</Text>
                <Text style={styles.cartModalMessage}>
                  Item has been added to your cart successfully.
                </Text>
                <TouchableOpacity
                  style={styles.cartModalButton}
                  onPress={() => {
                    Animated.timing(slideAnim, {
                      toValue: 300,
                      duration: 250,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowCartModal(false);
                      (navigation as any).navigate("MainTabs", { screen: "Cart" });
                    });
                  }}
                >
                  <Text style={styles.cartModalButtonText}>View Cart</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* Image Zoom Modal */}
        <Modal
          visible={showImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowImageModal(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: currentImageIndex * SCREEN_WIDTH, y: 0 }}
            >
              {images.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img.image_url || (img as any).url || '' }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Related Product Variant Selection Modal */}
        <Modal
          visible={showRelatedProductVariantModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowRelatedProductVariantModal(false);
            setSelectedRelatedProductForVariant(null);
          }}
        >
          <View style={styles.variantModalBackdrop}>
            <TouchableOpacity
              style={styles.variantModalOverlay}
              activeOpacity={1}
              onPress={() => {
                setShowRelatedProductVariantModal(false);
                setSelectedRelatedProductForVariant(null);
              }}
            />
            <View style={styles.variantModalContent}>
              <View style={styles.variantModalHeader}>
                <Text style={styles.variantModalTitle}>
                  {selectedRelatedProductForVariant?.name || "Select Variant"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowRelatedProductVariantModal(false);
                    setSelectedRelatedProductForVariant(null);
                  }}
                  style={styles.variantModalClose}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {selectedRelatedProductForVariant?.sell_units && (
                <ScrollView style={styles.variantModalScroll} showsVerticalScrollIndicator={false}>
                  {selectedRelatedProductForVariant.sell_units
                    .filter((u: any) => u.is_active !== false)
                    .map((unit: any) => {
                      const unitPrice =
                        typeof unit.price === "number"
                          ? unit.price
                          : parseFloat(String(unit.price)) || 0;
                      const unitMrpValue = unit.compare_price || unit.mrp;
                      let unitMrp: number | null = null;
                      if (unitMrpValue !== null && unitMrpValue !== undefined) {
                        if (typeof unitMrpValue === "number") {
                          unitMrp = isNaN(unitMrpValue) || !isFinite(unitMrpValue) ? null : unitMrpValue;
                        } else {
                          const parsed = parseFloat(String(unitMrpValue));
                          unitMrp = isNaN(parsed) || !isFinite(parsed) ? null : parsed;
                        }
                      }
                      const unitDiscount =
                        unitMrp && unitMrp > unitPrice
                          ? Math.round(((unitMrp - unitPrice) / unitMrp) * 100)
                          : 0;

                      return (
                        <TouchableOpacity
                          key={unit.id}
                          style={styles.variantModalUnitCard}
                          onPress={() => handleRelatedProductVariantSelect(unit.id)}
                        >
                          <View style={styles.variantModalUnitContent}>
                            <Text style={styles.variantModalUnitLabel}>{unit.label}</Text>
                            <View style={styles.variantModalUnitPriceRow}>
                              <Text style={styles.variantModalUnitPrice}>
                                ₹{unitPrice.toFixed(0)}
                              </Text>
                              {unitMrp && unitMrp > unitPrice && (
                                <Text style={styles.variantModalUnitMrp}>
                                  ₹{unitMrp.toFixed(0)}
                                </Text>
                              )}
                            </View>
                          </View>
                          {unitDiscount > 0 && (
                            <View style={styles.variantModalUnitDiscountBadge}>
                              <Text style={styles.variantModalUnitDiscountText}>
                                {unitDiscount}% off
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Floating Cart Icon */}
        <FloatingCartIcon />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  imageSection: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  imageContainer: {
    position: "relative",
    backgroundColor: "#F9FAFB",
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imageNav: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  imageNavLeft: {
    left: 12,
  },
  imageNavRight: {
    right: 12,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  imageIndicators: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeIndicator: {
    backgroundColor: "#FFFFFF",
    width: 24,
  },
  topActions: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    // backdropFilter is not supported in React Native, removed
  },
  rightActions: {
    flexDirection: "row",
    gap: 8,
  },
  discountBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 5,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  infoSection: {
    padding: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
  },
  vendorName: {
    flex: 1,
    fontSize: 15,
    color: "#22C55E",
    fontWeight: "600",
    marginLeft: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  ratingBadgeMain: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22C55E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingTextMain: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  reviewCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
    gap: 10,
    flexWrap: "wrap",
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  mrp: {
    fontSize: 16,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  discountTag: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  stockCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  stockCardIn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  stockCardOut: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  stockInfo: {
    flex: 1,
  },
  stockText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  stockTextIn: {
    color: "#22C55E",
  },
  stockTextOut: {
    color: "#EF4444",
  },
  stockQuantity: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  featuresSection: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  section: {
    padding: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  seeAll: {
    fontSize: 13,
    color: "#22C55E",
    fontWeight: "600",
  },
  unitsContainer: {
    gap: 12,
  },
  unitCard: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  unitCardActive: {
    borderColor: "#22C55E",
    backgroundColor: "#D1FAE5",
  },
  unitCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  unitLabelActive: {
    color: "#22C55E",
  },
  unitPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  unitPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  unitPriceActive: {
    color: "#22C55E",
  },
  unitMrp: {
    fontSize: 13,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  unitDiscountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#22C55E",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  unitDiscountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 4,
    alignSelf: "flex-start",
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 16,
    minWidth: 32,
    textAlign: "center",
  },
  vendorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  vendorCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vendorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  vendorRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  vendorRatingText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  description: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
    letterSpacing: 0.05,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  attributesContainer: {
    gap: 12,
  },
  attributeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  attributeLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  attributeValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    lineHeight: 18,
  },
  relatedProductsContainer: {
    marginTop: 4,
  },
  relatedProductsScroll: {
    paddingHorizontal: 20,
    paddingRight: 20,
    gap: 8,
  },
  relatedProductWrapper: {
    marginRight: 8,
    flexShrink: 0,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  actionBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceSection: {
    minWidth: 80,
  },
  totalLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
    fontWeight: "500",
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    maxWidth: 240,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    minHeight: 36,
    maxHeight: 36,
  },
  addToCartBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#22C55E",
  },
  buyNowBtn: {
    backgroundColor: "#22C55E",
  },
  buttonIcon: {
    marginRight: 4,
  },
  variantModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  variantModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  variantModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  variantModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  variantModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  variantModalClose: {
    padding: 4,
  },
  variantModalScroll: {
    maxHeight: 400,
  },
  variantModalUnitCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  variantModalUnitContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  variantModalUnitLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  variantModalUnitPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  variantModalUnitPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  variantModalUnitMrp: {
    fontSize: 13,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  variantModalUnitDiscountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#22C55E",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  variantModalUnitDiscountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  addToCartText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22C55E",
  },
  buyNowText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  goToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  goToCartText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  cartModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "50%",
  },
  cartModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  cartModalContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: "center",
  },
  cartModalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  cartModalIcon: {
    marginTop: 16,
    marginBottom: 16,
  },
  cartModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  cartModalMessage: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  cartModalButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  cartModalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#FFFFFF",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  backButton: {
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
});
