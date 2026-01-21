import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetOrdersQuery,
  useGetProfileQuery,
  DeliveryPartnerOrder,
} from "@/store/api/deliveryPartnerApi";
import { storage } from "@/lib/storage";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCredentials } from "@/store/slices/authSlice";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, formatDateTime } from "@/lib/utils";

type OrderStatusFilter = "out_for_delivery" | "delivered" | undefined;

export default function DeliveryPartnerOrdersScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>(undefined);
  const pageSize = 10;

  const { data: profile } = useGetProfileQuery();
  const {
    data: ordersData,
    isLoading,
    isFetching,
    refetch,
  } = useGetOrdersQuery({
    page,
    size: pageSize,
    status: statusFilter,
  });

  const handleLogout = async () => {
    try {
      await storage.clearAuth();
      dispatch(clearCredentials());
      // Reset navigation to login - clears all navigation state
      navigation.reset({
        index: 0,
        routes: [{ name: "DeliveryPartnerLogin" }],
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Even on error, clear auth
      await storage.clearAuth();
      dispatch(clearCredentials());
      try {
        (navigation as any).navigate("DeliveryPartnerLogin");
      } catch (navError) {
        console.error("Navigation error:", navError);
      }
    }
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate("DeliveryPartnerOrderDetail", { orderId });
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenMaps = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  };

  const onRefresh = () => {
    setPage(1);
    refetch();
  };

  const handleLoadMore = () => {
    if (ordersData && page < ordersData.pages && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "out_for_delivery":
        return { bg: "#E9D5FF", text: "#7B2D8E", border: "#C084FC" };
      case "delivered":
        return { bg: "#D1FAE5", text: "#065F46", border: "#10B981" };
      default:
        return { bg: "#F3F4F6", text: "#4B5563", border: "#D1D5DB" };
    }
  };

  const renderOrderCard = ({ item, index }: { item: DeliveryPartnerOrder; index: number }) => {
    const statusColor = getStatusColor(item.order_status);
    const canDeliver = item.order_status === "out_for_delivery";

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg, borderColor: statusColor.border }]}>
                <Text style={[styles.statusText, { color: statusColor.text }]}>
                  {item.order_status === "out_for_delivery" ? "Out for Delivery" : item.order_status === "delivered" ? "Delivered" : "Packed"}
                </Text>
              </View>
              {item.order_status === "packed" && item.delivery_otp && (
                <View style={styles.otpBadge}>
                  <Ionicons name="lock-closed-outline" size={12} color="#2563EB" />
                  <Text style={styles.otpText}>OTP: {item.delivery_otp}</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.customerText}>{item.buyer_name || "Customer"}</Text>
          </View>
          {item.buyer_phone && (
            <TouchableOpacity
              style={styles.customerRow}
              onPress={() => handleCall(item.buyer_phone!)}
            >
              <Ionicons name="call-outline" size={16} color="#7B2D8E" />
              <Text style={styles.phoneText}>{item.buyer_phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Address */}
        {item.delivery_address_snapshot && (
          <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.addressText} numberOfLines={2}>
                {item.delivery_address_snapshot}
              </Text>
            </View>
            {item.delivery_latitude && item.delivery_longitude && (
              <TouchableOpacity
                style={styles.mapsButton}
                onPress={() => handleOpenMaps(item.delivery_latitude!, item.delivery_longitude!)}
              >
                <Ionicons name="map-outline" size={14} color="#7B2D8E" />
                <Text style={styles.mapsText}>Open in Maps</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Product Images Preview */}
        {item.items && item.items.length > 0 && (
          <View style={styles.productsPreview}>
            <Text style={styles.productsPreviewLabel}>
              {item.total_items} item{item.total_items !== 1 ? "s" : ""}
            </Text>
            <View style={styles.productsGrid}>
              {item.items.slice(0, 4).map((orderItem: any, idx: number) => (
                <View key={idx} style={styles.productImageContainer}>
                  {orderItem.product_image ? (
                    <Image
                      source={{ uri: orderItem.product_image }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  {idx === 3 && item.items.length > 4 && (
                    <View style={styles.moreItemsOverlay}>
                      <Text style={styles.moreItemsText}>+{item.items.length - 4}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.amountText}>{formatPrice(item.total_amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment:</Text>
            <View style={[
              styles.paymentBadge,
              { backgroundColor: item.payment_mode === "cod" ? "#FEE2E2" : "#D1FAE5" }
            ]}>
              <Text style={[
                styles.paymentText,
                { color: item.payment_mode === "cod" ? "#DC2626" : "#059669" }
              ]}>
                {item.payment_mode === "cod" ? "💰 COD" : "✅ Online"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        {canDeliver && (
          <TouchableOpacity
            style={styles.deliverButton}
            onPress={() => handleOrderPress(item.id)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deliverButtonText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && page === 1) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Orders</Text>
            {profile && (
              <Text style={styles.headerSubtitle}>
                {profile.name} • {profile.phone}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Filters */}
        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterButton, !statusFilter && styles.filterButtonActive]}
            onPress={() => setStatusFilter(undefined)}
          >
            <Text style={[styles.filterText, !statusFilter && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === "out_for_delivery" && styles.filterButtonActive]}
            onPress={() => setStatusFilter("out_for_delivery")}
          >
            <Text style={[styles.filterText, statusFilter === "out_for_delivery" && styles.filterTextActive]}>
              Out for Delivery
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === "delivered" && styles.filterButtonActive]}
            onPress={() => setStatusFilter("delivered")}
          >
            <Text style={[styles.filterText, statusFilter === "delivered" && styles.filterTextActive]}>
              Delivered
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders List */}
      {ordersData && ordersData.items.length > 0 ? (
        <FlatList
          data={ordersData.items}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isFetching && page === 1} onRefresh={onRefresh} colors={["#7B2D8E"]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            isFetching && page > 1 ? (
              <ActivityIndicator size="small" color="#7B2D8E" style={styles.loadingMore} />
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No orders assigned</Text>
          <Text style={styles.emptyText}>You don't have any orders assigned to you yet.</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterButtonActive: {
    backgroundColor: "#7B2D8E",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  loadingMore: {
    marginVertical: 20,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  otpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  otpText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1E40AF",
    fontFamily: "monospace",
  },
  customerInfo: {
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  phoneText: {
    fontSize: 14,
    color: "#7B2D8E",
    fontWeight: "500",
  },
  addressContainer: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  mapsText: {
    fontSize: 12,
    color: "#7B2D8E",
    fontWeight: "500",
  },
  orderSummary: {
    gap: 6,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  amountText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  paymentText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  productsPreview: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  productsPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  productsGrid: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  productImageContainer: {
    position: "relative",
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImagePlaceholder: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  moreItemsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreItemsText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  deliverButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7B2D8E",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  deliverButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
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
});

