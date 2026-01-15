import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category } from "@/types/category";

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const hasImage = category.image_url && !imageError;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image
            source={{ uri: category.image_url! }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="grid-outline" size={36} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.overlay} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "31%",
    marginBottom: 20,
  },
  imageContainer: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
    position: "relative",
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
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    paddingHorizontal: 4,
  },
});
