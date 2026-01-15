import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { useTabBar } from "@/contexts/TabBarContext";
import { FloatingCartIcon } from "@/components/navigation/FloatingCartIcon";
import { SearchBar } from "@/components/home/SearchBar";
import { Spinner } from "@/components/ui/Spinner";
import { CategoryTreeNode } from "@/types/category";

const { width } = Dimensions.get("window");
const PADDING = 16;
const GAP = 2; // Very close spacing
// Professional design: 4 columns per row
const CARD_SIZE = (width - PADDING * 2 - GAP * 3) / 4;
const IMAGE_SIZE = CARD_SIZE * 0.9; // Larger image for better visibility

const DEFAULT_CATEGORY_IMAGE = "https://via.placeholder.com/150x150?text=Category";

export default function CategoriesScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const { setIsVisible } = useTabBar();
  const [lastScrollY, setLastScrollY] = useState(0);

  // Show tab bar when component mounts
  useEffect(() => {
    setIsVisible(true);
    return () => {
      setIsVisible(true); // Reset on unmount
    };
  }, [setIsVisible]);

  const { data: categoryTreeData, isLoading } = useGetCategoryTreeQuery();

  const handleSearchFocus = () => {
    (navigation as any).navigate("Search");
  };

  // Navigate to category detail with side navigation for sub-categories
  const handleCategoryPress = (category: CategoryTreeNode) => {
    (navigation as any).navigate("CategoryDetail", {
      slug: category.slug,
      initialCategoryId: category.id,
    });
  };


  // Organize categories into sections (top-level categories with their children)
  const categorySections = useMemo(() => {
    if (!categoryTreeData?.items) return [];
    return categoryTreeData.items.map((topCategory) => ({
      topCategory,
      subcategories: topCategory.children || [],
    }));
  }, [categoryTreeData]);

  // Render category card - professional 4-column design
  const renderCategoryCard = (category: CategoryTreeNode) => {
    const hasImage = category.image_url;

    return (
      <TouchableOpacity
        key={category.id}
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryImageContainer}>
          {hasImage ? (
            <Image
              source={{ uri: category.image_url! }}
              style={styles.categoryImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.categoryImagePlaceholder}>
              <Ionicons name="grid-outline" size={20} color="#9CA3AF" />
            </View>
          )}
        </View>
        <Text style={styles.categoryName} numberOfLines={2}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render category section with Blinkit-style heading
  const renderCategorySection = (section: {
    topCategory: CategoryTreeNode;
    subcategories: CategoryTreeNode[];
  }) => {
    const { topCategory, subcategories } = section;

    // Only show sections that have subcategories
    if (subcategories.length === 0) return null;

    return (
      <View key={topCategory.id} style={styles.section}>
        <TouchableOpacity
          onPress={() => handleCategoryPress(topCategory)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>{topCategory.name}</Text>
        </TouchableOpacity>
        <View style={styles.categoryGrid}>
          {subcategories.map((subcategory) => renderCategoryCard(subcategory))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Search Bar - Blinkit Style */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            placeholder="Search 'chips'"
          />
          <TouchableOpacity style={styles.micButton} activeOpacity={0.7}>
            <Ionicons name="mic" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Categories List - Professional 4-Column Grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
          {categorySections.length > 0 ? (
            categorySections.map((section) => renderCategorySection(section))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No categories available</Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Cart Icon - Permanent on Screen */}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PADDING,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: PADDING,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    justifyContent: "space-between",
  },
  categoryCard: {
    width: CARD_SIZE,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  categoryImageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginBottom: 5,
    overflow: "hidden",
    alignSelf: "center",
    // Professional design: subtle shadow
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    // Subtle border for definition
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
    lineHeight: 13,
    marginTop: 0,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 12,
    fontWeight: "500",
  },
});
