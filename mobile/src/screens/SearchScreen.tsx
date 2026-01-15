import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useSearchProductsQuery,
  useGetSearchSuggestionsQuery,
  SearchSuggestion,
} from "@/store/api/searchApi";
import { ProductCard } from "@/components/product/ProductCard";

export default function SearchScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: searchResults,
    isLoading: isSearching,
    isFetching,
    refetch,
  } = useSearchProductsQuery(
    {
      query: debouncedQuery,
      page,
      size: 20,
    },
    { skip: debouncedQuery.length < 2 }
  );

  const {
    data: suggestionsData,
    isLoading: isLoadingSuggestions,
  } = useGetSearchSuggestionsQuery(
    { query: debouncedQuery, limit: 10 },
    { skip: debouncedQuery.length < 2 }
  );

  const handleProductPress = (productSlug: string) => {
    (navigation as any).navigate("ProductDetail", { slug: productSlug });
  };

  const handleAddToCart = (productId: string) => {
    // TODO: Implement add to cart in Phase 4
    console.log("Add to cart:", productId);
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.name);
    (navigation as any).navigate("ProductDetail", { slug: suggestion.slug });
  };

  const handleLoadMore = useCallback(() => {
    if (searchResults && page < searchResults.pages && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [searchResults, page, isFetching]);

  const renderProduct = ({ item }: { item: any }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item.slug)}
      onAddToCart={() => handleAddToCart(item.id)}
    />
  );

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Ionicons name="search" size={20} color="#6B7280" />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        {item.category && (
          <Text style={styles.suggestionCategory}>{item.category}</Text>
        )}
      </View>
      {item.min_price && (
        <Text style={styles.suggestionPrice}>₹{item.min_price.toFixed(2)}</Text>
      )}
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isFetching || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#7B2D8E" />
      </View>
    );
  };

  const showSuggestions =
    debouncedQuery.length >= 2 &&
    !searchResults &&
    suggestionsData?.suggestions &&
    suggestionsData.suggestions.length > 0;

  const showResults = searchResults && searchResults.items.length > 0;
  const showEmpty =
    debouncedQuery.length >= 2 &&
    searchResults &&
    searchResults.items.length === 0 &&
    !isSearching;

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggestions</Text>
          <FlatList
            data={suggestionsData.suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Loading */}
      {isSearching && debouncedQuery.length >= 2 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B2D8E" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Results */}
      {showResults && (
        <>
          <View style={styles.resultsBar}>
            <Text style={styles.resultsText}>
              {searchResults.total} {searchResults.total === 1 ? "result" : "results"} found
            </Text>
          </View>
          <FlatList
            data={searchResults.items}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        </>
      )}

      {/* Empty State */}
      {showEmpty && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            Try different keywords or browse categories
          </Text>
        </View>
      )}

      {/* Initial State */}
      {debouncedQuery.length < 2 && (
        <View style={styles.initialContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text style={styles.initialText}>
            Start typing to search for products
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    maxHeight: 300,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 2,
  },
  suggestionCategory: {
    fontSize: 12,
    color: "#6B7280",
  },
  suggestionPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7B2D8E",
  },
  resultsBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  resultsText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    justifyContent: "space-between",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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
  },
  initialContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  initialText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
});

