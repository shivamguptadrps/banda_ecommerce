import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetVendorOrderQuery,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useMarkOrderPickedMutation,
  useMarkOrderPackedMutation,
} from "@/store/api/vendorApi";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/utils";

type RouteParams = {
  VendorOrderDetail: { orderId: string };
};

export default function VendorOrderDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, "VendorOrderDetail">>();
  const navigation = useNavigation();
  const { orderId } = route.params;

  const { data: order, isLoading, refetch } = useGetVendorOrderQuery(orderId);
  const [acceptOrder] = useAcceptOrderMutation();
  const [rejectOrder] = useRejectOrderMutation();
  const [markPicked] = useMarkOrderPickedMutation();
  const [markPacked] = useMarkOrderPackedMutation();

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "placed":
        return "#F59E0B";
      case "confirmed":
        return "#3B82F6";
      case "picked":
        return "#06B6D4";
      case "packed":
        return "#6366F1";
      case "out_for_delivery":
        return "#8B5CF6";
      case "delivered":
        return "#22C55E";
      case "cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "placed":
        return "Placed";
      case "confirmed":
        return "Confirmed";
      case "picked":
        return "Picked";
      case "packed":
        return "Packed";
      case "out_for_delivery":
        return "Out for Delivery";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getActions = () => {
    if (!order) return [];
    const status = order.order_status;
    switch (status) {
      case "placed":
        return [
          { label: "Accept Order", action: () => handleAccept(), color: "#22C55E" },
          { label: "Reject Order", action: () => handleReject(), color: "#EF4444" },
        ];
      case "confirmed":
        return [{ label: "Mark as Picked", action: () => handlePick(), color: "#22C55E" }];
      case "picked":
        return [{ label: "Mark as Packed", action: () => handlePack(), color: "#22C55E" }];
      default:
        return [];
    }
  };

  const handleAccept = async () => {
    try {
      await acceptOrder(orderId).unwrap();
      Alert.alert("Success", "Order accepted!");
      refetch();
    } catch (error: any) {
      Alert.alert("Error", error.data?.detail || "Failed to accept order");
    }
  };

  const handleReject = () => {
    Alert.alert(
      "Reject Order",
      "Are you sure you want to reject this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await rejectOrder({ orderId }).unwrap();
              Alert.alert("Success", "Order rejected");
              navigation.goBack();
            } catch (error: any) {
              Alert.alert("Error", error.data?.detail || "Failed to reject order");
            }
          },
        },
      ]
    );
  };

  const handlePick = async () => {
    try {
      await markPicked(orderId).unwrap();
      Alert.alert("Success", "Order marked as picked!");
      refetch();
    } catch (error: any) {
      Alert.alert("Error", error.data?.detail || "Failed to mark order as picked");
    }
  };

  const handlePack = async () => {
    try {
      await markPacked(orderId).unwrap();
      Alert.alert("Success", "Order marked as packed!");
      refetch();
    } catch (error: any) {
      Alert.alert("Error", error.data?.detail || "Failed to mark order as packed");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  const actions = getActions();
  let addressDisplay = "No address";
  try {
    if (order.delivery_address_snapshot) {
      const addr = JSON.parse(order.delivery_address_snapshot);
      addressDisplay = addr.full_address || `${addr.address_line_1}, ${addr.city}, ${addr.state} ${addr.pincode}`;
    }
  } catch {
    addressDisplay = order.delivery_address_snapshot || "No address";
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSubtitle}>{order.order_number}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(order.order_status)}15` },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}>
              {getStatusLabel(order.order_status)}
            </Text>
          </View>
          {order.delivery_otp && (
            <View style={styles.otpContainer}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" />
              <Text style={styles.otpText}>OTP: {order.delivery_otp}</Text>
            </View>
          )}
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{order.buyer_name || "Customer"}</Text>
          </View>
          {order.buyer_phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{order.buyer_phone}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{addressDisplay}</Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({order.total_items})</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemUnit}>{item.sell_unit_label}</Text>
                <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          {order.delivery_fee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>{formatPrice(order.delivery_fee)}</Text>
            </View>
          )}
          {order.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: "#22C55E" }]}>
                -{formatPrice(order.discount_amount)}
              </Text>
            </View>
          )}
          {order.tax_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>{formatPrice(order.tax_amount)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total_amount)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Mode</Text>
            <Text style={styles.infoValue}>
              {order.payment_mode === "cod" ? "Cash on Delivery" : "Online"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status</Text>
            <Text style={styles.infoValue}>{order.payment_status}</Text>
          </View>
        </View>

        {/* Actions */}
        {actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.actionButton, { backgroundColor: action.color }]}
                onPress={action.action}
              >
                <Text style={styles.actionButtonText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  otpContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  otpText: {
    fontSize: 12,
    color: "#6B7280",
  },
  section: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  itemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  itemUnit: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: "#6B7280",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
