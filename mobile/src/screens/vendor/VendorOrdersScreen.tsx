import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetVendorOrdersQuery,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useMarkOrderPickedMutation,
  useMarkOrderPackedMutation,
  VendorOrder,
} from "@/store/api/vendorApi";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/utils";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "placed", label: "Placed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "picked", label: "Picked" },
  { id: "packed", label: "Packed" },
  { id: "out_for_delivery", label: "Out for Delivery" },
  { id: "delivered", label: "Delivered" },
];

interface VendorOrdersScreenProps {
  onMenuPress?: () => void;
}

export default function VendorOrdersScreen({ onMenuPress }: VendorOrdersScreenProps = {}) {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);

  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetVendorOrdersQuery({
    page,
    size: 20,
    status: activeStatus !== "all" ? activeStatus : undefined,
  });

  const [acceptOrder, { isLoading: isAccepting }] = useAcceptOrderMutation();
  const [rejectOrder, { isLoading: isRejecting }] = useRejectOrderMutation();
  const [markPicked, { isLoading: isPicking }] = useMarkOrderPickedMutation();
  const [markPacked, { isLoading: isPacking }] = useMarkOrderPackedMutation();

  const isUpdating = isAccepting || isRejecting || isPicking || isPacking;

  const orders = ordersData?.items || [];
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      (order.buyer_name && order.buyer_name.toLowerCase().includes(query)) ||
      (order.buyer_phone && order.buyer_phone.includes(query))
    );
  });

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
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

  const getActions = (order: VendorOrder) => {
    const status = order.order_status;
    switch (status) {
      case "placed":
        return [
          { label: "Accept", action: () => handleAccept(order.id), color: "#22C55E" },
          { label: "Reject", action: () => handleReject(order.id), color: "#EF4444" },
        ];
      case "confirmed":
        return [{ label: "Mark Picked", action: () => handlePick(order.id), color: "#22C55E" }];
      case "picked":
        return [{ label: "Mark Packed", action: () => handlePack(order.id), color: "#22C55E" }];
      default:
        return [];
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      await acceptOrder(orderId).unwrap();
      Alert.alert("Success", "Order accepted!");
    } catch (error: any) {
      Alert.alert("Error", error.data?.detail || "Failed to accept order");
    }
  };

  const handleReject = async (orderId: string) => {
    Alert.alert(
      "Reject Order",
      "Are you sure you want to reject this order? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await rejectOrder({ orderId }).unwrap();
              Alert.alert("Success", "Order rejected");
            } catch (error: any) {
              Alert.alert("Error", error.data?.detail || "Failed to reject order");
            }
          },
        },
      ]
    );
  };

  const handlePick = async (orderId: string) => {
    try {
      await markPicked(orderId).unwrap();
      Alert.alert("Success", "Order marked as picked!");
    } catch (error: any) {
      Alert.alert("Error", error.data?.detail || "Failed to mark order as picked");
    }
  };

  const handlePack = async (orderId: string) => {
    try {
      await markPacked(orderId).unwrap();
      Alert.alert("Success", "Order marked as packed!");
    } catch (error: any) {
      Alert.alert("Error", error.data?.detail || "Failed to mark order as packed");
    }
  };

  const renderOrder = useCallback(
    ({ item }: { item: VendorOrder }) => {
      const actions = getActions(item);
      const statusColor = getStatusColor(item.order_status);
      let addressDisplay = "No address";
      try {
        if (item.delivery_address_snapshot) {
          const addr = JSON.parse(item.delivery_address_snapshot);
          addressDisplay = addr.full_address || `${addr.address_line_1}, ${addr.city}`;
        }
      } catch {
        addressDisplay = item.delivery_address_snapshot || "No address";
      }

      return (
        <TouchableOpacity
          style={styles.orderCard}
          onPress={() => navigation.navigate("VendorOrderDetail", { orderId: item.id })}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderNumber}>{item.order_number}</Text>
              <Text style={styles.orderDate}>{formatDateTime(item.placed_at)}</Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(item.order_status)}
              </Text>
            </View>
          </View>

          <View style={styles.orderInfo}>
            <View>
              <Text style={styles.customerName}>{item.buyer_name || "Customer"}</Text>
              {item.buyer_phone && (
                <Text style={styles.customerPhone}>{item.buyer_phone}</Text>
              )}
              <Text style={styles.address} numberOfLines={1}>
                {addressDisplay}
              </Text>
            </View>
            <Text style={styles.orderAmount}>{formatPrice(item.total_amount)}</Text>
          </View>

          <View style={styles.orderItems}>
            {item.items.slice(0, 2).map((orderItem, idx) => (
              <Text key={idx} style={styles.orderItemText} numberOfLines={1}>
                {orderItem.quantity}x {orderItem.product_name} ({orderItem.sell_unit_label})
              </Text>
            ))}
            {item.items.length > 2 && (
              <Text style={styles.orderItemMore}>
                +{item.items.length - 2} more items
              </Text>
            )}
          </View>

          {actions.length > 0 && (
            <View style={styles.orderActions}>
              {actions.map((action, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.actionButton, { backgroundColor: `${action.color}15` }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    action.action();
                  }}
                  disabled={isUpdating}
                >
                  <Text style={[styles.actionButtonText, { color: action.color }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [isUpdating]
  );

  const handleLoadMore = useCallback(() => {
    if (ordersData && page < (ordersData.pages || 1) && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [ordersData, page, isFetching]);

  const renderFooter = () => {
    if (!isFetching || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <Spinner size="small" />
      </View>
    );
  };

  if (isLoading && !ordersData) {
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Orders</Text>
            <Text style={styles.headerSubtitle}>Manage customer orders</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order number, customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeStatus === tab.id && styles.tabActive,
            ]}
            onPress={() => {
              setActiveStatus(tab.id);
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeStatus === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      {isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load orders</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? "No orders found" : "No orders yet"}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? `No orders match "${searchQuery}"`
              : "Orders from customers will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={() => {
                setPage(1);
                refetch();
              }}
              colors={["#22C55E"]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
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
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
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
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  menuButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  clearButton: {
    marginLeft: 8,
  },
  tabsContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: "#22C55E",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  orderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  address: {
    fontSize: 12,
    color: "#6B7280",
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  orderItems: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  orderItemText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  orderItemMore: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
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
    fontSize: 18,
    fontWeight: "600",
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
