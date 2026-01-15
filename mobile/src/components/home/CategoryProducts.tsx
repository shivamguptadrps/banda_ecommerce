import React from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { useGetProductsByCategoryQuery } from "@/store/api/productApi";
import { useGetProductsQuery } from "@/store/api/productApi";
import { ProductCard } from "@/components/product/ProductCard";
import { Product } from "@/types/product";

const { width } = Dimensions.get("window");
const HORIZONTAL_CARD_WIDTH = width * 0.45; // Slightly less than half for horizontal scroll

interface CategoryProductsProps {
  categoryId: string;
  onProductPress: (product: Product) => void;
  onAddToCart?: (productId: string) => void;
}

export const CategoryProducts: React.FC<CategoryProductsProps> = ({
  categoryId,
  onProductPress,
  onAddToCart,
}) => {
  // Fetch products for this category
  const {
    data: categoryProductsData,
    isLoading: categoryLoading,
  } = useGetProductsByCategoryQuery({
    categoryId,
    page: 1,
    size: 6,
    inStockOnly: false,
  });

  // Fetch all products as fallback
  const { data: allProductsData } = useGetProductsQuery({
    page: 1,
    size: 6,
    filters: {},
  });

  const categoryProducts = categoryProductsData?.items || [];
  const allProducts = allProductsData?.items || [];

  // Use category products if available, otherwise use fallback products
  const products = categoryProducts.length > 0 
    ? categoryProducts 
    : allProducts.slice(0, 6).map((p) => ({
        ...p,
        category_id: categoryId, // Assign category for display
      }));

  if (categoryLoading && categoryProducts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#7B2D8E" />
      </View>
    );
  }

  if (products.length === 0) {
    return null; // Don't show empty state, just don't render
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => onProductPress(item)}
            onAddToCart={() => onAddToCart?.(item.id)}
            width={HORIZONTAL_CARD_WIDTH}
          />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsScroll}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  productsScroll: {
    paddingRight: 16,
    paddingLeft: 4,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});

