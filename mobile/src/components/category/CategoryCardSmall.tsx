import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category } from "@/types/category";

interface CategoryCardSmallProps {
  category: Category;
  onPress: () => void;
}

export const CategoryCardSmall: React.FC<CategoryCardSmallProps> = ({
  category,
  onPress,
}) => {
  const [imageError, setImageError] = useState(false);
  const hasImage = category.image_url && !imageError;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {hasImage ? (
          <Image
            source={{ uri: category.image_url! }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="grid-outline" size={20} color="#7B2D8E" />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 70,
    alignItems: "center",
    marginRight: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F5F0F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F0F8",
  },
  name: {
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
    maxWidth: 70,
  },
});

