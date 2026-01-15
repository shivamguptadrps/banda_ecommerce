import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetProductsByVendorQuery } from "@/store/api/productApi";
import { ProductCard } from "@/components/product/ProductCard";
import { Spinner } from "@/components/ui/Spinner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = 16; // Horizontal padding
const GAP = 8; // Gap between products
const NUM_COLUMNS = 3;
// Calculate card width: (screen width - left padding - right padding - (gaps between columns)) / num columns
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - (PADDING * 2) - (GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS);

type VendorStoreRouteParams = {
  vendorId: string;
  vendorName?: string;
};

type RouteParams = {
  VendorStore: VendorStoreRouteParams;
};

export default function VendorStoreScreen() {
  const route = useRoute<RouteProp<RouteParams, "VendorStore">>();
  const navigation = useNavigation();
  const { vendorId, vendorName } = route.params;

  const [page, setPage] = useState(1);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetProductsByVendorQuery({
    vendorId,
    page,
    size: 20,
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

  const handleProductPress = useCallback((productSlug: string) => {
    (navigation as any).navigate("ProductDetail", { slug: productSlug });
  }, [navigation]);

  const handleAddToCart = useCallback((productId: string) => {
    // TODO: Implement add to cart in Phase 4
    console.log("Add to cart:", productId);
  }, []);

  const renderProduct = useCallback(({ item }: { item: any }) => (
    <View style={[styles.productWrapper, { width: CARD_WIDTH }]}>
      <ProductCard
        product={item}
        onPress={() => handleProductPress(item.slug)}
        onAddToCart={() => handleAddToCart(item.id)}
        width={CARD_WIDTH}
      />
    </View>
  ), [handleProductPress, handleAddToCart]);

  const renderFooter = () => {
    if (!isFetching || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#22C55E" />
      </View>
    );
  };

  const products = useMemo(() => data?.items || [], [data?.items]);
  const vendor = useMemo(() => 
    products[0]?.vendor_name || vendorName || "Store",
    [products, vendorName]
  );

  if (isLoading && !data) {
    return <Spinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="storefront" size={20} color="#22C55E" />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {vendor}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Store Info */}
      <View style={styles.storeInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.infoText}>
            {(() => {
              const rating = products[0]?.vendor_rating;
              if (rating == null) return "4.5";
              const numRating = typeof rating === 'number' 
                ? rating 
                : parseFloat(String(rating)) || 4.5;
              return numRating.toFixed(1);
            })()} Rating
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time" size={14} color="#22C55E" />
          <Text style={styles.infoText}>10-15 min delivery</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cube" size={14} color="#22C55E" />
          <Text style={styles.infoText}>
            {data?.total || 0} Products
          </Text>
        </View>
      </View>

      {/* Products */}
      {products.length > 0 ? (
        <>
          <View style={styles.resultsBar}>
            <Text style={styles.resultsText}>
              {data?.total} {data?.total === 1 ? "product" : "products"} available
            </Text>
          </View>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={NUM_COLUMNS > 1 ? styles.row : undefined}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} colors={["#22C55E"]} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            removeClippedSubviews={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No products available</Text>
          <Text style={styles.emptyText}>
            This store doesn't have any products yet
          </Text>
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  placeholder: {
    width: 32,
  },
  storeInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginLeft: 6,
  },
  resultsBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  resultsText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  listContent: {
    padding: PADDING,
    paddingBottom: 32,
  },
  row: {
    justifyContent: "flex-start",
    marginBottom: GAP,
  },
  productWrapper: {
    marginRight: GAP,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
});

