import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetStatsQuery } from "@/store/api/deliveryPartnerApi";
import { useAppDispatch } from "@/store/hooks";
import { clearCredentials } from "@/store/slices/authSlice";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/utils";

export default function DeliveryPartnerStatsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { data: stats, isLoading, refetch, isFetching } = useGetStatsQuery();

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigation.replace("DeliveryPartnerLogin");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="stats-chart-outline" size={64} color="#D1D5DB" />
        <Text style={styles.errorTitle}>No Statistics Available</Text>
        <Text style={styles.errorText}>Statistics will appear here once you start delivering orders.</Text>
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
            <Text style={styles.headerTitle}>Analytics & Stats</Text>
            <Text style={styles.headerSubtitle}>Your delivery performance</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} colors={["#7B2D8E"]} />
        }
      >
        {/* Today's Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#E9D5FF" }]}>
                <Ionicons name="cube-outline" size={24} color="#7B2D8E" />
              </View>
              <Text style={styles.statValue}>{stats.today_assigned}</Text>
              <Text style={styles.statLabel}>Assigned</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{stats.today_delivered}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="cash-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{formatPrice(stats.today_cod_revenue)}</Text>
              <Text style={styles.statLabel}>COD Revenue</Text>
            </View>
          </View>
        </View>

        {/* Overall Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Performance</Text>
          <View style={styles.card}>
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Ionicons name="trophy-outline" size={20} color="#7B2D8E" />
                <Text style={styles.metricLabel}>Total Deliveries</Text>
              </View>
              <Text style={styles.metricValue}>{stats.total_deliveries}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.metricLabel}>Successful</Text>
              </View>
              <Text style={[styles.metricValue, { color: "#10B981" }]}>{stats.successful}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Ionicons name="close-circle" size={20} color="#DC2626" />
                <Text style={styles.metricLabel}>Failed</Text>
              </View>
              <Text style={[styles.metricValue, { color: "#DC2626" }]}>{stats.failed}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Ionicons name="trending-up-outline" size={20} color="#2563EB" />
                <Text style={styles.metricLabel}>Success Rate</Text>
              </View>
              <Text style={[styles.metricValue, { color: "#2563EB" }]}>
                {stats.success_rate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly & Monthly Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Period Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.periodCard}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.periodValue}>{stats.week_delivered}</Text>
              <Text style={styles.periodLabel}>This Week</Text>
            </View>
            <View style={styles.periodCard}>
              <Ionicons name="calendar" size={20} color="#6B7280" />
              <Text style={styles.periodValue}>{stats.month_delivered}</Text>
              <Text style={styles.periodLabel}>This Month</Text>
            </View>
          </View>
        </View>

        {/* COD Collection Stats */}
        {stats.cod_total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COD Collection</Text>
            <View style={styles.card}>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Ionicons name="cash" size={20} color="#F59E0B" />
                  <Text style={styles.metricLabel}>Total COD Amount</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#F59E0B" }]}>
                  {formatPrice(stats.cod_total)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Ionicons name="wallet-outline" size={20} color="#10B981" />
                  <Text style={styles.metricLabel}>Collected</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#10B981" }]}>
                  {formatPrice(stats.cod_collected)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Ionicons name="percent-outline" size={20} color="#2563EB" />
                  <Text style={styles.metricLabel}>Collection Rate</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#2563EB" }]}>
                  {stats.cod_collection_rate.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statusCard}>
              <Ionicons name="cube" size={24} color="#7B2D8E" />
              <Text style={styles.statusValue}>{stats.currently_assigned}</Text>
              <Text style={styles.statusLabel}>Currently Assigned</Text>
            </View>
            <View style={styles.statusCard}>
              <Ionicons name="time-outline" size={24} color="#F59E0B" />
              <Text style={styles.statusValue}>{stats.pending_deliveries}</Text>
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
          </View>
          {stats.avg_delivery_time_minutes && (
            <View style={styles.card}>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Ionicons name="speedometer-outline" size={20} color="#7B2D8E" />
                  <Text style={styles.metricLabel}>Avg Delivery Time</Text>
                </View>
                <Text style={styles.metricValue}>
                  {Math.round(stats.avg_delivery_time_minutes)} min
                </Text>
              </View>
            </View>
          )}
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
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
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  metricLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  periodCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  periodValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
  },
  periodLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statusValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});

