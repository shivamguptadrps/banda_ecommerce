import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetVendorProfileQuery,
  useGetVendorStatsQuery,
  useGetVendorOrdersQuery,
} from "@/store/api/vendorApi";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function VendorDashboardScreen() {
  const navigation = useNavigation<any>();
  const { data: vendor, isLoading: loadingVendor } = useGetVendorProfileQuery();
  const { data: stats, isLoading: loadingStats, refetch: refetchStats, isFetching: fetchingStats } = useGetVendorStatsQuery();
  const { data: ordersData, isLoading: loadingOrders } = useGetVendorOrdersQuery({ page: 1, size: 5 });

  const isLoading = loadingVendor || loadingStats;
  const recentOrders = ordersData?.items?.slice(0, 5) || [];

  const handleRefresh = () => {
    refetchStats();
  };

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Welcome, {vendor?.shop_name || "Vendor"}!
            </Text>
            <Text style={styles.headerSubtitle}>
              Here's what's happening with your store today
            </Text>
          </View>
        </View>
      </View>

      {/* Verification Banner */}
      {vendor && !vendor.is_verified && (
        <View style={styles.verificationBanner}>
          <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
          <View style={styles.verificationContent}>
            <Text style={styles.verificationTitle}>Verification Pending</Text>
            <Text style={styles.verificationText}>
              Your shop is under review. Products won't be visible until approved.
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={fetchingStats}
            onRefresh={handleRefresh}
            colors={["#22C55E"]}
          />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="cash-outline" size={20} color="#22C55E" />
            </View>
            <Text style={styles.statValue}>
              {formatPrice(stats?.total_revenue || 0)}
            </Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.statSubtext}>
              This week: {formatPrice(stats?.this_week_revenue || 0)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="receipt-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats?.total_orders || 0}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Text style={styles.statSubtext}>Today: {stats?.today_orders || 0}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="cube-outline" size={20} color="#22C55E" />
            </View>
            <Text style={styles.statValue}>{stats?.total_products || 0}</Text>
            <Text style={styles.statLabel}>Products</Text>
            <Text style={styles.statSubtext}>Active listings</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{stats?.pending_orders || 0}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
            <Text style={styles.statSubtext}>Need attention</Text>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("VendorOrders")}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#22C55E" />
            </TouchableOpacity>
          </View>

          {loadingOrders ? (
            <View style={styles.centerContainer}>
              <Spinner size="small" />
            </View>
          ) : recentOrders.length > 0 ? (
            <View style={styles.ordersList}>
              {recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() =>
                    navigation.navigate("VendorOrderDetail", { orderId: order.id })
                  }
                >
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderNumber}>{order.order_number}</Text>
                      <Text style={styles.orderDate}>
                        {formatDateTime(order.placed_at)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(order.order_status)}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(order.order_status) },
                        ]}
                      >
                        {getStatusLabel(order.order_status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderCustomer}>
                      {order.buyer_name || "Customer"}
                    </Text>
                    <Text style={styles.orderAmount}>
                      {formatPrice(order.total_amount)}
                    </Text>
                  </View>
                  <Text style={styles.orderItems}>
                    {order.total_items} item{order.total_items !== 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No orders yet</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("VendorProductCreate")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="add-circle-outline" size={24} color="#22C55E" />
              </View>
              <Text style={styles.quickActionTitle}>Add New Product</Text>
              <Text style={styles.quickActionText}>List a new product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("VendorProducts")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="cube-outline" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionTitle}>Manage Inventory</Text>
              <Text style={styles.quickActionText}>Update stock levels</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("VendorOrders")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="time-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.quickActionTitle}>Pending Orders</Text>
              <Text style={styles.quickActionText}>
                {stats?.pending_orders || 0} need attention
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  verificationBanner: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: "flex-start",
    gap: 12,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 4,
  },
  verificationText: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: "#22C55E",
    fontWeight: "600",
  },
  centerContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  ordersList: {
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
    alignItems: "center",
    marginBottom: 8,
  },
  orderCustomer: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  orderItems: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: "#6B7280",
  },
});
