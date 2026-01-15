import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "@/types/product";
import { useGetCartQuery, useUpdateCartItemMutation, useRemoveFromCartMutation } from "@/store/api/cartApi";
import { useAppSelector } from "@/store/hooks";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = 85; // Sidebar width from CategoryDetailScreen  
const PADDING = 8; // Padding on both sides of product grid
const GAP = 6; // Gap between two product cards
// Calculate available width: screen width - sidebar - left padding - right padding
const AVAILABLE_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH - (PADDING * 2);
// Calculate card width: (available width - gap between cards) / 2
const CARD_WIDTH = Math.floor((AVAILABLE_WIDTH - GAP) / 2);
const IMAGE_HEIGHT = Math.floor(CARD_WIDTH * 0.75); // More compact image for smaller cards

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  width?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  width: customWidth,
}) => {
  const cardWidth = customWidth || CARD_WIDTH;
  const imageHeight = cardWidth * 0.75; // More compact for smaller cards
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const isBuyer = user?.role === "buyer" || (!user?.role && isAuthenticated);
  const { data: cart, refetch: refetchCart } = useGetCartQuery(undefined, {
    skip: !isBuyer,
  });
  const [updateCartItem, { isLoading: isUpdating }] = useUpdateCartItemMutation();
  const [removeFromCart, { isLoading: isRemoving }] = useRemoveFromCartMutation();
  const [isAdding, setIsAdding] = useState(false);
  const isProcessingRef = useRef(false);
  
  const defaultSellUnit = product.sell_units?.find((su) => su.is_default) || product.sell_units?.[0];
  const cartItem = cart?.items?.find(
    (item) => item.product_id === product.id && item.sell_unit_id === defaultSellUnit?.id
  );
  const quantity = cartItem?.quantity || 0;
  const isInCart = quantity > 0 && isAuthenticated;
  
  const priceValue = defaultSellUnit?.price ?? product.min_price ?? 0;
  const price = typeof priceValue === "number" ? priceValue : parseFloat(String(priceValue)) || 0;
  const mrpValue = defaultSellUnit?.mrp ?? defaultSellUnit?.compare_price;
  const mrp = mrpValue ? (typeof mrpValue === "number" ? mrpValue : parseFloat(String(mrpValue)) || null) : null;
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const imageUrl = product.primary_image || product.images?.[0]?.image_url;
  const hasMultipleOptions = (product.sell_units?.length || 0) > 1;

  const handleCardPress = useCallback(() => {
    if (!isAdding && !isUpdating && !isRemoving && !isProcessingRef.current) {
      onPress();
    }
  }, [onPress, isAdding, isUpdating, isRemoving]);

  const handleDecreaseQuantity = useCallback(async (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (isUpdating || isRemoving || isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    InteractionManager.runAfterInteractions(async () => {
      try {
        if (cartItem && quantity > 1) {
          await updateCartItem({
            itemId: cartItem.id,
            data: { quantity: quantity - 1 },
          }).unwrap();
        } else if (cartItem && quantity === 1) {
          await removeFromCart(cartItem.id).unwrap();
        }
      } catch (error) {
        console.error("Failed to update cart:", error);
      } finally {
        isProcessingRef.current = false;
      }
    });
  }, [cartItem, quantity, isUpdating, isRemoving, updateCartItem, removeFromCart]);

  const handleIncreaseQuantity = useCallback(async (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (isUpdating || isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    InteractionManager.runAfterInteractions(async () => {
      try {
        if (cartItem) {
          await updateCartItem({
            itemId: cartItem.id,
            data: { quantity: quantity + 1 },
          }).unwrap();
        } else if (onAddToCart) {
          await onAddToCart();
        }
      } catch (error) {
        console.error("Failed to update cart:", error);
      } finally {
        isProcessingRef.current = false;
      }
    });
  }, [cartItem, quantity, isUpdating, updateCartItem, onAddToCart]);

  const handleAddToCartPress = useCallback(async (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (isAdding || !onAddToCart || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsAdding(true);
    
    try {
      await onAddToCart();
      if (isAuthenticated) {
        setTimeout(() => {
          refetchCart();
        }, 200);
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
      isProcessingRef.current = false;
    }
  }, [isAdding, onAddToCart, isAuthenticated, refetchCart]);

  const rating = product.rating || 4.5;
  const reviewCount = product.review_count || Math.floor(Math.random() * 50000) + 1000;
  const formatReviewCount = (count: number) => {
    if (count >= 100000) return `${(count / 100000).toFixed(2)} lac`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth, maxWidth: cardWidth }]}
      onPress={handleCardPress}
      activeOpacity={0.9}
      delayPressIn={100}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={18} color="#D1D5DB" />
          </View>
        )}

        {/* Discount Badge - Top Left */}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        {/* Heart Icon - Top Right */}
        <TouchableOpacity 
          style={styles.heartButton}
          onPress={(e) => {
            e?.preventDefault?.();
            e?.stopPropagation?.();
          }}
        >
          <Ionicons name="heart-outline" size={12} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Delivery Time Badge - Bottom Left */}
        <View style={styles.deliveryBadge}>
          <Text style={styles.deliveryText}>11 MINS</Text>
        </View>

        {!product.is_in_stock && (
          <View style={styles.outOfStockOverlay}>
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {defaultSellUnit && (
          <Text style={styles.unit} numberOfLines={1}>
            {defaultSellUnit.label}
          </Text>
        )}

        <View style={styles.ratingRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={10} color="#FFB800" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.reviewText}>({formatReviewCount(reviewCount)})</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{price.toFixed(0)}</Text>
          {mrp && mrp > price && (
            <Text style={styles.mrp}>MRP ₹{mrp.toFixed(0)}</Text>
          )}
        </View>

        {product.is_in_stock ? (
          isInCart ? (
            <View style={styles.quantityContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.quantityButton,
                  (isUpdating || isRemoving || pressed) && styles.quantityButtonDisabled,
                ]}
                onPress={handleDecreaseQuantity}
                disabled={isUpdating || isRemoving}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color="#22C55E" />
                ) : (
                  <Ionicons name="remove" size={10} color="#22C55E" />
                )}
              </Pressable>
              <Text style={styles.quantityText}>{quantity}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.quantityButton,
                  (isUpdating || pressed) && styles.quantityButtonDisabled,
                ]}
                onPress={handleIncreaseQuantity}
                disabled={isUpdating}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#22C55E" />
                ) : (
                  <Ionicons name="add" size={10} color="#22C55E" />
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                (isAdding || pressed) && styles.addButtonPressed,
              ]}
              onPress={handleAddToCartPress}
              disabled={isAdding || !onAddToCart}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="add" size={14} color="#FFFFFF" />
              )}
            </Pressable>
          )
        ) : (
          <View style={styles.outOfStockButton}>
            <Text style={styles.outOfStockButtonText}>Unavailable</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    maxWidth: CARD_WIDTH,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    position: "relative",
    backgroundColor: "#F9FAFB",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  discountBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#22C55E",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
    minWidth: 40,
    alignItems: "center",
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  heartButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(34, 197, 94, 0.95)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  deliveryText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  outOfStockText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    padding: 5,
    paddingBottom: 6,
  },
  name: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
    lineHeight: 14,
    minHeight: 28,
    letterSpacing: -0.1,
  },
  unit: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 2,
    fontWeight: "500",
  },
  ratingRow: {
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 1,
  },
  reviewText: {
    fontSize: 8,
    color: "#6B7280",
    marginLeft: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
    gap: 4,
  },
  price: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  mrp: {
    fontSize: 9,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  addButton: {
    width: 28,
    height: 28,
    backgroundColor: "#22C55E",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.9 }],
  },
  quantityContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#22C55E",
    paddingVertical: 3,
    gap: 4,
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 1.5,
    elevation: 1,
  },
  quantityButton: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: "#F0FDF4",
  },
  quantityText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#22C55E",
    minWidth: 12,
    textAlign: "center",
  },
  outOfStockButton: {
    width: "100%",
    height: 30,
    backgroundColor: "#F3F4F6",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockButtonText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
});
