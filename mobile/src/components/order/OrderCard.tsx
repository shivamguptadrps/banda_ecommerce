import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Order } from "@/types/order";
import { StatusBadge } from "./StatusBadge";

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (amount: number) => {
    return `₹${parseFloat(String(amount)).toFixed(0)}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <Text style={styles.orderDate}>{formatDate(order.placed_at)}</Text>
        </View>
        <StatusBadge status={order.order_status} size="small" />
      </View>

      <View style={styles.body}>
        {order.vendor && (
          <View style={styles.vendorRow}>
            <Ionicons name="storefront-outline" size={12} color="#6B7280" />
            <Text style={styles.vendorName}>{order.vendor.shop_name}</Text>
          </View>
        )}

        <View style={styles.itemsRow}>
          <Text style={styles.itemsText}>
            {order.total_items} {order.total_items === 1 ? "item" : "items"}
          </Text>
          <Text style={styles.totalAmount}>{formatPrice(order.total_amount)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.paymentInfo}>
          <Ionicons
            name={
              order.payment_mode === "cod"
                ? "cash-outline"
                : "card-outline"
            }
            size={12}
            color="#6B7280"
          />
          <Text style={styles.paymentText}>
            {order.payment_mode === "cod" ? "Cash on Delivery" : "Online Payment"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 3,
  },
  orderDate: {
    fontSize: 11,
    color: "#6B7280",
  },
  body: {
    marginBottom: 10,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 5,
  },
  vendorName: {
    fontSize: 12,
    color: "#6B7280",
  },
  itemsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  paymentText: {
    fontSize: 11,
    color: "#6B7280",
  },
});

