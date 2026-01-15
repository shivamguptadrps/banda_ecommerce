import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OrderItem as OrderItemType } from "@/types/order";
import { useGetProductByIdQuery } from "@/store/api/productApi";

interface OrderItemProps {
  item: OrderItemType;
  showImage?: boolean;
}

export const OrderItem: React.FC<OrderItemProps> = ({
  item,
  showImage = true,
}) => {
  const { data: product } = useGetProductByIdQuery(item.product_id || "", {
    skip: !item.product_id,
  });

  const formatPrice = (amount: number) => {
    return `₹${parseFloat(String(amount)).toFixed(0)}`;
  };

  const imageUrl = product?.primary_image || product?.images?.[0]?.image_url;

  return (
    <View style={styles.container}>
      {showImage && (
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={16} color="#9CA3AF" />
            </View>
          )}
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product_name}
        </Text>
        <View style={styles.unitRow}>
          <Text style={styles.unitInfo}>
            {item.quantity} × {item.sell_unit_label}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.pricePerUnit}>
            {formatPrice(item.price_per_unit)}/unit
          </Text>
          <Text style={styles.totalPrice}>
            {formatPrice(item.total_price)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 10,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
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
  productImage: {
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
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    lineHeight: 18,
  },
  unitRow: {
    marginBottom: 6,
  },
  unitInfo: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  pricePerUnit: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#22C55E",
  },
});

