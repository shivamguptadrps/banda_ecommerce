import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetOrdersQuery } from "@/store/api/orderApi";
import { useGetProductsQuery } from "@/store/api/productApi";
import { Order, OrderStatus } from "@/types/order";
import { OrderCard } from "@/components/order/OrderCard";
import { ProductCard } from "@/components/product/ProductCard";
import { useAppSelector } from "@/store/hooks";
import { useAddToCartMutation } from "@/store/api/cartApi";
import { SellUnitSelectionModal } from "@/components/product/SellUnitSelectionModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RELATED_PRODUCT_WIDTH = (SCREEN_WIDTH - 64) / 3;

const statusFilters: Array<{ label: string; value: OrderStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Placed", value: "placed" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Packed", value: "packed" },
  { label: "Out for Delivery", value: "out_for_delivery" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | "all">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [showRelatedProductVariantModal, setShowRelatedProductVariantModal] = useState(false);
  const [selectedRelatedProductForVariant, setSelectedRelatedProductForVariant] = useState<any>(null);
  const [addToCart] = useAddToCartMutation();

  // Skip query for delivery partners and vendors - they should use their own screens
  const isBuyer = user?.role === "buyer" || (!user?.role && isAuthenticated);
  const isDeliveryPartner = user?.role === "delivery_partner";
  const isVendor = user?.role === "vendor";

  const {
    data: ordersData,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetOrdersQuery(
    {
      page,
      size: 10,
      status: selectedFilter !== "all" ? selectedFilter : undefined,
    },
    {
      skip: !isBuyer || isDeliveryPartner || isVendor, // Skip for non-buyers
    }
  );

  const handleOrderPress = (order: Order) => {
    navigation.navigate("OrderDetail", { orderId: order.id });
  };

  const handleLoadMore = () => {
    if (
      ordersData &&
      page < ordersData.pages &&
      !isFetching &&
      !isLoading
    ) {
      setPage(page + 1);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    refetch();
  };

  // Show error if wrong role tries to access this screen
  if (isDeliveryPartner || isVendor) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.emptyTitle}>Wrong Account Type</Text>
          <Text style={styles.emptyText}>
            {isDeliveryPartner 
              ? "Delivery partners should use the Delivery Partner section"
              : "Vendors should use the Vendor Dashboard"}
          </Text>
        </View>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptyText}>
            Please login to view your orders
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.emptyTitle}>Error Loading Orders</Text>
          <Text style={styles.emptyText}>
            {error && "data" in error
              ? (error.data as any)?.detail || "Failed to load orders"
              : "Something went wrong"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const orders = ordersData?.items || [];
  const hasMore = ordersData ? page < ordersData.pages : false;

  // Fetch related products
  const { data: relatedProductsData } = useGetProductsQuery(
    {
      page: 1,
      size: 8,
      filters: {},
    }
  );

  const relatedProducts = useMemo(() => {
    return relatedProductsData?.items || [];
  }, [relatedProductsData]);

  const handleAddToCartFromRelated = async (productId: string) => {
    const product = relatedProducts.find((p) => p.id === productId);
    if (!product) return;

    const hasMultipleOptions = product.sell_units && product.sell_units.length > 1;
    if (hasMultipleOptions) {
      setSelectedRelatedProductForVariant(product);
      setShowRelatedProductVariantModal(true);
    } else {
      // Add directly if only one variant
      try {
        await addToCart({
          product_id: productId,
          sell_unit_id: product.sell_units?.[0]?.id || "",
          quantity: 1,
        }).unwrap();
        Alert.alert("Success", "Item added to cart");
      } catch (error: any) {
        Alert.alert("Error", error?.data?.detail || "Failed to add to cart");
      }
    }
  };

  const handleRelatedProductVariantSelect = async (sellUnit: any) => {
    if (!selectedRelatedProductForVariant) return;
    try {
      await addToCart({
        product_id: selectedRelatedProductForVariant.id,
        sell_unit_id: sellUnit.id,
        quantity: 1,
      }).unwrap();
      setShowRelatedProductVariantModal(false);
      setSelectedRelatedProductForVariant(null);
      Alert.alert("Success", "Item added to cart");
    } catch (error: any) {
      Alert.alert("Error", error?.data?.detail || "Failed to add to cart");
    }
  };

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
                onPress={() => {
                  setSelectedFilter(item.value as OrderStatus | "all");
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Orders List */}
      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptyText}>
            {selectedFilter !== "all"
              ? `No orders with status "${statusFilters.find((f) => f.value === selectedFilter)?.label}"`
              : "You haven't placed any orders yet"}
          </Text>
          {selectedFilter !== "all" && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setSelectedFilter("all")}
            >
              <Text style={styles.clearFilterText}>Show All Orders</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => handleOrderPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={handleRefresh}
              colors={["#22C55E"]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <>
              {hasMore && isFetching ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#22C55E" />
                </View>
              ) : null}
              {/* Related Products Section */}
              {relatedProducts.length > 0 && (
                <View style={styles.relatedSection}>
                  <Text style={styles.relatedSectionTitle}>You May Also Like</Text>
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
                    {relatedProducts.map((product) => (
                      <View key={product.id} style={styles.relatedProductWrapper}>
                        <ProductCard
                          product={product}
                          onPress={() => (navigation as any).navigate("ProductDetail", { slug: product.slug })}
                          onAddToCart={() => handleAddToCartFromRelated(product.id)}
                          width={RELATED_PRODUCT_WIDTH}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          }
        />
      )}

      {/* Variant Selection Modal */}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: "#22C55E",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  clearFilterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  clearFilterText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  relatedSection: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  relatedSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  relatedProductsScroll: {
    paddingRight: 16,
  },
  relatedProductWrapper: {
    marginRight: 8,
  },
});
