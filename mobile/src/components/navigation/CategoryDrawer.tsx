import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { CategoryTreeNode } from "@/types/category";

interface CategoryDrawerProps {
  onCategorySelect: (slug: string) => void;
  onClose: () => void;
  initialCategoryId?: string | null;
}

export const CategoryDrawer: React.FC<CategoryDrawerProps> = ({
  onCategorySelect,
  onClose,
  initialCategoryId,
}) => {
  const { data, isLoading } = useGetCategoryTreeQuery();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategoryId || null
  );

  // Auto-expand categories to show initial category
  useEffect(() => {
    if (initialCategoryId && data?.items) {
      const findAndExpand = (categories: CategoryTreeNode[], targetId: string, path: string[] = []): string[] | null => {
        for (const cat of categories) {
          if (cat.id === targetId) {
            return path;
          }
          if (cat.children && cat.children.length > 0) {
            const found = findAndExpand(cat.children, targetId, [...path, cat.id]);
            if (found) return found;
          }
        }
        return null;
      };

      const path = findAndExpand(data.items, initialCategoryId);
      if (path) {
        setExpandedCategories(new Set(path));
        setSelectedCategoryId(initialCategoryId);
      }
    }
  }, [initialCategoryId, data]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryPress = (category: CategoryTreeNode) => {
    if (category.children && category.children.length > 0) {
      toggleCategory(category.id);
    } else {
      onCategorySelect(category.slug);
      onClose();
    }
  };

  const renderCategory = (category: CategoryTreeNode, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategoryId === category.id;

    return (
      <View key={category.id}>
        <TouchableOpacity
          style={[
            styles.categoryItem,
            { paddingLeft: 16 + level * 20 },
            isSelected && styles.categoryItemSelected,
          ]}
          onPress={() => {
            setSelectedCategoryId(category.id);
            handleCategoryPress(category);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.categoryContent}>
            <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
              {category.name}
            </Text>
            {hasChildren && (
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={isSelected ? "#7B2D8E" : "#6B7280"}
              />
            )}
          </View>
        </TouchableOpacity>
        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {category.children?.map((child) => renderCategory(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B2D8E" />
      </View>
    );
  }

  const categories = data?.items || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Categories</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {categories.length > 0 ? (
          categories.map((category) => renderCategory(category))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No categories available</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  categoryItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  categoryItemSelected: {
    backgroundColor: "#F3E8FF",
    borderLeftWidth: 3,
    borderLeftColor: "#7B2D8E",
  },
  categoryContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
  },
  categoryNameSelected: {
    color: "#7B2D8E",
    fontWeight: "600",
  },
  childrenContainer: {
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});

