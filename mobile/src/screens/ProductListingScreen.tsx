import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetProductsQuery } from "@/store/api/productApi";
import { useAddToCartMutation } from "@/store/api/cartApi";
import { useAppSelector } from "@/store/hooks";
import { ProductCard } from "@/components/product/ProductCard";
import { Spinner } from "@/components/ui/Spinner";
import { ProductFilters } from "@/types/product";

type ProductListingRouteParams = {
  categoryId?: string;
  vendorId?: string;
  searchQuery?: string;
  title?: string;
};

type RouteParams = {
  ProductListing: ProductListingRouteParams;
};

export default function ProductListingScreen() {
  const route = useRoute<RouteProp<RouteParams, "ProductListing">>();
  const navigation = useNavigation();
  const { categoryId, vendorId, searchQuery, title } = route.params || {};

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>({
    category_id: categoryId,
    vendor_id: vendorId,
    search: searchQuery,
    in_stock: false,
  });

  const { data, isLoading, isFetching, refetch, isError } = useGetProductsQuery({
    page,
    size: 20,
    filters,
  });

  const handleRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (data && page < data.pages && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [data, page, isFetching]);

  const handleProductPress = (productSlug: string) => {
    (navigation as any).navigate("ProductDetail", { slug: productSlug });
  };

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();

  const handleAddToCart = async (product: any) => {
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
              (navigation as any).navigate("Login");
            },
          },
        ]
      );
      return;
    }

    // Get default sell unit
    const defaultUnit = product.sell_units?.find((su: any) => su.is_default) || product.sell_units?.[0];
    
    if (!defaultUnit) {
      Alert.alert("Error", "Product unit not available");
      return;
    }

    try {
      const result = await addToCart({
        product_id: product.id,
        sell_unit_id: defaultUnit.id,
        quantity: 1,
      }).unwrap();
      
      // Cart will automatically refetch due to invalidatesTags
      // ProductCard will update to show quantity controls
      console.log("✅ Item added to cart, cart will refetch automatically");
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      const errorMessage = error?.data?.detail || "Failed to add item to cart";
      Alert.alert("Error", errorMessage);
    }
  };

  const renderProduct = ({ item, index }: { item: any; index: number }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item.slug)}
      onAddToCart={() => handleAddToCart(item)}
    />
  );

  const renderFooter = () => {
    if (!isFetching || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#7B2D8E" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return <Spinner />;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No products found</Text>
        <Text style={styles.emptyText}>
          Try adjusting your filters or search query
        </Text>
      </View>
    );
  };

  if (isLoading && !data) {
    return <Spinner />;
  }

  const products = data?.items || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || "Products"}
          </Text>
          {data && (
            <Text style={styles.headerSubtitle}>
              {data.total} {data.total === 1 ? "item" : "items"}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            console.log("Open filters");
          }}
          style={styles.filterButton}
        >
          <Ionicons name="options-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Product Grid */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={false}
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        scrollEventThrottle={16}
        decelerationRate="normal"
        refreshControl={
          <RefreshControl
            refreshing={isLoading && page === 1}
            onRefresh={handleRefresh}
            tintColor="#7B2D8E"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
        directionalLockEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  filterButton: {
    padding: 6,
    marginRight: -6,
  },
  listContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 0,
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
