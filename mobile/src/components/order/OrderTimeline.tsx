import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Order, OrderStatus } from "@/types/order";

interface OrderTimelineProps {
  order: Order;
}

const statusSteps: Array<{
  status: OrderStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { status: "placed", label: "Order Placed", icon: "receipt-outline" },
  { status: "confirmed", label: "Confirmed", icon: "checkmark-circle-outline" },
  { status: "picked", label: "Picked", icon: "cube-outline" },
  { status: "packed", label: "Packed", icon: "archive-outline" },
  {
    status: "out_for_delivery",
    label: "Out for Delivery",
    icon: "car-outline",
  },
  { status: "delivered", label: "Delivered", icon: "checkmark-done-outline" },
];

const getStatusIndex = (status: OrderStatus): number => {
  const statusMap: Record<OrderStatus, number> = {
    placed: 0,
    confirmed: 1,
    picked: 2,
    packed: 3,
    out_for_delivery: 4,
    delivered: 5,
    cancelled: -1,
    returned: -1,
    pending: 0,
    processing: 2,
    shipped: 4,
  };
  return statusMap[status] ?? -1;
};

const getStatusTimestamp = (order: Order, status: OrderStatus): string | null => {
  const timestampMap: Record<OrderStatus, string | undefined> = {
    placed: order.placed_at,
    confirmed: order.confirmed_at,
    picked: order.picked_at,
    packed: order.packed_at,
    out_for_delivery: order.out_for_delivery_at,
    delivered: order.delivered_at,
    cancelled: order.cancelled_at,
    returned: undefined,
    pending: order.placed_at,
    processing: order.processing_at,
    shipped: order.shipped_at,
  };
  return timestampMap[status] || null;
};

const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ order }) => {
  const currentStatusIndex = getStatusIndex(order.order_status);
  const isCancelled = order.order_status === "cancelled";

  if (isCancelled) {
    return (
      <View style={styles.container}>
        <View style={styles.cancelledContainer}>
          <Ionicons name="close-circle" size={24} color="#DC2626" />
          <View style={styles.cancelledText}>
            <Text style={styles.cancelledLabel}>Order Cancelled</Text>
            {order.cancellation_reason && (
              <Text style={styles.cancelledReason}>
                {order.cancellation_reason}
              </Text>
            )}
            {order.cancelled_at && (
              <Text style={styles.cancelledDate}>
                {formatTimestamp(order.cancelled_at)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {statusSteps.map((step, index) => {
        const isCompleted = index <= currentStatusIndex;
        const isCurrent = index === currentStatusIndex;
        const timestamp = getStatusTimestamp(order, step.status);

        return (
          <View key={step.status} style={styles.stepContainer}>
            <View style={styles.stepContent}>
              <View
                style={[
                  styles.iconContainer,
                  isCompleted && styles.iconContainerCompleted,
                  isCurrent && styles.iconContainerCurrent,
                ]}
              >
                <Ionicons
                  name={step.icon}
                  size={20}
                  color={
                    isCurrent
                      ? "#FFFFFF"
                      : isCompleted
                      ? "#059669"
                      : "#D1D5DB"
                  }
                />
              </View>
              <View style={styles.stepText}>
                <Text
                  style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                  ]}
                >
                  {step.label}
                </Text>
                {timestamp && (
                  <Text style={styles.stepTimestamp}>
                    {formatTimestamp(timestamp)}
                  </Text>
                )}
              </View>
            </View>
            {index < statusSteps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stepContainer: {
    marginBottom: 4,
  },
  stepContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconContainerCompleted: {
    backgroundColor: "#D1FAE5",
  },
  iconContainerCurrent: {
    backgroundColor: "#7B2D8E",
  },
  stepText: {
    flex: 1,
    paddingTop: 8,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  stepLabelCompleted: {
    color: "#059669",
  },
  stepLabelCurrent: {
    color: "#7B2D8E",
    fontWeight: "600",
  },
  stepTimestamp: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  connector: {
    width: 2,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginLeft: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  connectorCompleted: {
    backgroundColor: "#059669",
  },
  cancelledContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  cancelledText: {
    flex: 1,
    marginLeft: 12,
  },
  cancelledLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC2626",
    marginBottom: 4,
  },
  cancelledReason: {
    fontSize: 13,
    color: "#991B1B",
    marginBottom: 4,
  },
  cancelledDate: {
    fontSize: 12,
    color: "#991B1B",
  },
});

