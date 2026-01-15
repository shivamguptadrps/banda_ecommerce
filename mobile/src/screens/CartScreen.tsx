import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  FlatList,
  Alert,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useAddToCartMutation,
} from "@/store/api/cartApi";
import { useGetProductsQuery } from "@/store/api/productApi";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ProductCard } from "@/components/product/ProductCard";
import { CartItem } from "@/types/product";
import { useAppSelector } from "@/store/hooks";
import { FloatingCartIcon } from "@/components/navigation/FloatingCartIcon";
import { useTabBar } from "@/contexts/TabBarContext";
import { SellUnitSelectionModal } from "@/components/product/SellUnitSelectionModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RELATED_PRODUCT_WIDTH = (SCREEN_WIDTH - 48) / 3; // 3 items per row

export default function CartScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  // Only fetch cart for buyers, skip for delivery partners and other roles
  const isBuyer = user?.role === "buyer" || (!user?.role && isAuthenticated);
  const { data: cart, isLoading, error, refetch: refetchCart } = useGetCartQuery(undefined, {
    skip: !isBuyer, // Skip cart query for delivery partners and other non-buyer roles
  });
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeFromCart] = useRemoveFromCartMutation();
  const [addToCart] = useAddToCartMutation();
  const [showRelatedProductVariantModal, setShowRelatedProductVariantModal] = useState(false);
  const [selectedRelatedProductForVariant, setSelectedRelatedProductForVariant] = useState<any>(null);
  const { setIsVisible } = useTabBar();


  // Show tab bar on mount
  React.useEffect(() => {
    setIsVisible(true);
    return () => {
      setIsVisible(true);
    };
  }, [setIsVisible]);

  // Handle 403 error (role-based access)
  React.useEffect(() => {
    if (error && 'status' in error && error.status === 403) {
      if (!isAuthenticated) {
        Alert.alert(
          "Login Required",
          "Please login to view your cart.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Login",
              onPress: () => {
                (navigation as any).navigate("MainTabs", { screen: "Profile" });
              },
            },
          ]
        );
      } else if (user && user.role !== "buyer") {
        Alert.alert(
          "Access Denied",
          `Cart is only available for buyers. Your current role is: ${user.role}. Please login with a buyer account.`,
          [
            { text: "OK", onPress: () => navigation.goBack() },
          ]
        );
      }
    }
  }, [error, isAuthenticated, user, navigation]);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCart(itemId);
    } else {
      await updateCartItem({
        itemId,
        data: { quantity: newQuantity },
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFromCart(itemId),
        },
      ]
    );
  };


  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) return;
    navigation.navigate("Checkout" as never);
  };

  // Get featured products for "You May Also Like" section (used in both empty and non-empty states)
  const { data: featuredProducts } = useGetProductsQuery(
    {
      page: 1,
      size: 8,
      filters: {},
    }
  );

  const handleProductPress = (slug: string) => {
    (navigation as any).navigate("ProductDetail", { slug });
  };

  const handleAddToCartFromRelated = async (productId: string) => {
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
      await refetchCart();
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      Alert.alert("Error", "Failed to add item to cart. Please try again.");
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
      
      await refetchCart();
      setShowRelatedProductVariantModal(false);
      setSelectedRelatedProductForVariant(null);
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      Alert.alert("Error", "Failed to add item to cart. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          <Spinner />
        </View>
      </>
    );
  }

  // Handle 403 error specifically - show login prompt
  if (error && 'status' in error && error.status === 403) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#EF4444" />
            <Text style={styles.emptyTitle}>Login Required</Text>
            <Text style={styles.emptySubtitle}>
              Please login to view your cart and add items
            </Text>
            <Button
              onPress={() => {
                (navigation as any).navigate("Login");
              }}
              style={styles.shopButton}
            >
              Go to Login
            </Button>
          </View>
        </View>
      </>
    );
  }

  // Calculate related products for empty cart state
  const emptyCartRelatedProducts = featuredProducts?.items?.slice(0, 8) || [];

  if (error || !cart || cart.items.length === 0) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Shopping Cart</Text>
              <Text style={styles.itemCount}>0 items</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Empty Cart Card */}
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="cart-outline" size={40} color="#22C55E" />
              </View>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptySubtitle}>
                Looks like you haven't added anything to your cart yet
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Home" as never)}
                style={styles.shopButton}
                activeOpacity={0.8}
              >
                <Ionicons name="storefront-outline" size={14} color="#22C55E" style={styles.shopButtonIcon} />
                <Text style={styles.shopButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>

            {/* You May Also Like - Show even when cart is empty */}
            {emptyCartRelatedProducts.length > 0 && (
              <View style={styles.relatedSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>You May Also Like</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Home" as never)}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>
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
                  {emptyCartRelatedProducts.map((item) => (
                    <View key={item.id} style={styles.relatedProductWrapper}>
                      <ProductCard
                        product={item}
                        onPress={() => handleProductPress(item.slug)}
                        onAddToCart={() => handleAddToCartFromRelated(item.id)}
                        width={RELATED_PRODUCT_WIDTH}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Floating Cart Icon */}
          <FloatingCartIcon />

          {/* Related Product Variant Selection Modal */}
          {showRelatedProductVariantModal && selectedRelatedProductForVariant && (
            <SellUnitSelectionModal
              visible={showRelatedProductVariantModal}
              product={selectedRelatedProductForVariant}
              onClose={() => {
                setShowRelatedProductVariantModal(false);
                setSelectedRelatedProductForVariant(null);
              }}
              onSelect={handleRelatedProductVariantSelect}
            />
          )}
        </View>
      </>
    );
  }

  // Safely convert all values to numbers
  const subtotal = typeof cart.subtotal === 'number' 
    ? cart.subtotal 
    : parseFloat(String(cart.subtotal || 0)) || 0;
  const deliveryFee = typeof cart.delivery_fee === 'number' 
    ? cart.delivery_fee 
    : parseFloat(String(cart.delivery_fee || 0)) || 0;
  
  // Check discount_amount first (from API), then fallback to discount
  let discount = 0;
  if (cart.discount_amount !== undefined && cart.discount_amount !== null) {
    discount = typeof cart.discount_amount === 'number'
      ? cart.discount_amount
      : parseFloat(String(cart.discount_amount)) || 0;
  } else if (cart.discount !== undefined && cart.discount !== null) {
    discount = typeof cart.discount === 'number'
      ? cart.discount
      : parseFloat(String(cart.discount)) || 0;
  }
  
  const total = subtotal + deliveryFee - discount;
  
  // Debug logging
  if (__DEV__) {
    console.log("Cart data:", {
      subtotal,
      deliveryFee,
      discount,
      total,
      discount_amount: cart.discount_amount,
      discount: cart.discount,
      coupon_code: cart.coupon_code,
    });
  }

  // Calculate related products - filter out items already in cart if cart has items
  const relatedProducts = cart && cart.items.length > 0
    ? featuredProducts?.items?.filter(
        (p) => !cart.items.some((item) => item.product_id === p.id)
      ).slice(0, 8) || []
    : featuredProducts?.items?.slice(0, 8) || [];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Shopping Cart</Text>
            <Text style={styles.itemCount}>
              {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetchCart} tintColor="#22C55E" />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Cart Items */}
          <View style={styles.itemsSection}>
            {cart.items.map((item: CartItem) => {
              const productImage = item.product.primary_image || item.product.images?.[0]?.image_url;
              const unitPrice = typeof item.sell_unit.price === 'number' 
                ? item.sell_unit.price 
                : parseFloat(String(item.sell_unit.price)) || 0;
              const totalPrice = unitPrice * item.quantity;
              const mrp = typeof item.sell_unit.mrp === 'number' 
                ? item.sell_unit.mrp 
                : parseFloat(String(item.sell_unit.mrp || 0)) || 0;

              return (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.imageContainer}>
                    {productImage ? (
                      <Image
                        source={{ uri: productImage }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#D1D5DB" />
                      </View>
                    )}
                  </View>

                  <View style={styles.itemInfo}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemTitleRow}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {item.product.name}
                        </Text>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveItem(item.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.unitLabel}>{item.sell_unit.label}</Text>
                    </View>

                    <View style={styles.itemFooter}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.price}>₹{unitPrice.toFixed(0)}</Text>
                        {mrp > unitPrice && (
                          <Text style={styles.mrp}>₹{mrp.toFixed(0)}</Text>
                        )}
                      </View>

                      <View style={styles.quantityContainer}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          <Ionicons name="remove" size={14} color="#22C55E" />
                        </TouchableOpacity>
                        <Text style={styles.quantity}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Ionicons name="add" size={14} color="#22C55E" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.itemTotalRow}>
                      <Text style={styles.itemTotalLabel}>Item Total</Text>
                      <Text style={styles.itemTotal}>₹{totalPrice.toFixed(0)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Related Products - Horizontal Scroll */}
          {relatedProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>You May Also Like</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Home" as never)}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
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
                      onAddToCart={() => handleAddToCartFromRelated(item.id)}
                      width={RELATED_PRODUCT_WIDTH}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* Cart Summary - Fixed at bottom above tab bar */}
        <View style={styles.summary}>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(0)}</Text>
            </View>
            {deliveryFee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>₹{deliveryFee.toFixed(0)}</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discount]}>
                  -₹{discount.toFixed(0)}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(0)}</Text>
            </View>
          </View>
          <View style={styles.checkoutButtonContainer}>
            <TouchableOpacity
              onPress={handleCheckout}
              style={styles.checkoutButton}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={styles.checkoutIcon} />
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Cart Icon */}
        <FloatingCartIcon />

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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  itemCount: {
    fontSize: 13,
    color: "#6B7280",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 320, // Increased to ensure checkout button is visible above tab bar
  },
  itemsSection: {
    marginBottom: 16,
  },
  cartItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginRight: 14,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  removeButton: {
    padding: 4,
  },
  unitLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  mrp: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quantity: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    minWidth: 20,
    textAlign: "center",
  },
  itemTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  itemTotalLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  relatedSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 13,
    color: "#22C55E",
    fontWeight: "600",
  },
  relatedProductsScroll: {
    paddingHorizontal: 16,
    paddingRight: 16,
    gap: 8,
  },
  relatedProductWrapper: {
    marginRight: 8,
    flexShrink: 0,
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
  summary: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 0 : 0, // Will add paddingBottom instead
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
    paddingBottom: Platform.OS === "ios" ? 90 : 80, // Account for tab bar + safe area
  },
  summaryContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  checkoutButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  discount: {
    color: "#22C55E",
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  checkoutButton: {
    backgroundColor: "#22C55E",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    minHeight: 44,
    width: "100%",
  },
  checkoutIcon: {
    marginRight: 6,
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    margin: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  shopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#22C55E",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 6,
    minWidth: 180,
  },
  shopButtonIcon: {
    marginRight: 0,
  },
  shopButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#22C55E",
  },
});
