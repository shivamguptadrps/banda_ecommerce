import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { OrderStatus } from "@/types/order";

interface StatusBadgeProps {
  status: OrderStatus;
  size?: "small" | "medium" | "large";
}

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string }
> = {
  placed: {
    label: "Placed",
    color: "#7B2D8E",
    bgColor: "#F3E8FF",
  },
  confirmed: {
    label: "Confirmed",
    color: "#059669",
    bgColor: "#D1FAE5",
  },
  picked: {
    label: "Picked",
    color: "#0284C7",
    bgColor: "#DBEAFE",
  },
  packed: {
    label: "Packed",
    color: "#7C3AED",
    bgColor: "#EDE9FE",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "#DC2626",
    bgColor: "#FEE2E2",
  },
  delivered: {
    label: "Delivered",
    color: "#059669",
    bgColor: "#D1FAE5",
  },
  cancelled: {
    label: "Cancelled",
    color: "#6B7280",
    bgColor: "#F3F4F6",
  },
  returned: {
    label: "Returned",
    color: "#DC2626",
    bgColor: "#FEE2E2",
  },
  // Legacy statuses
  pending: {
    label: "Pending",
    color: "#7B2D8E",
    bgColor: "#F3E8FF",
  },
  processing: {
    label: "Processing",
    color: "#0284C7",
    bgColor: "#DBEAFE",
  },
  shipped: {
    label: "Shipped",
    color: "#DC2626",
    bgColor: "#FEE2E2",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "medium",
}) => {
  const config = statusConfig[status] || statusConfig.placed;
  const sizeStyles = {
    small: { padding: 4, fontSize: 10, borderRadius: 4 },
    medium: { padding: 6, fontSize: 12, borderRadius: 6 },
    large: { padding: 8, fontSize: 14, borderRadius: 8 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: currentSize.padding,
          paddingVertical: currentSize.padding / 2,
          borderRadius: currentSize.borderRadius,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: config.color,
            fontSize: currentSize.fontSize,
            fontWeight: size === "large" ? "600" : "500",
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
  },
  text: {
    textTransform: "capitalize",
  },
});

