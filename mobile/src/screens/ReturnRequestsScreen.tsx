import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetReturnRequestsQuery } from "@/store/api/returnApi";
import { ReturnRequest, ReturnStatus } from "@/types/return";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_FILTERS: { label: string; value: ReturnStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Requested", value: "requested" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
];

export default function ReturnRequestsScreen() {
  const navigation = useNavigation<any>();
  const [selectedStatus, setSelectedStatus] = useState<ReturnStatus | "">("");
  const [page, setPage] = useState(1);

  const {
    data: returnRequestsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetReturnRequestsQuery({
    status: selectedStatus === "" ? undefined : selectedStatus,
    page,
    size: 20,
  });

  const returnRequests = returnRequestsData?.items || [];

  const formatPrice = (amount: number) => {
    return `₹${parseFloat(String(amount)).toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: ReturnStatus) => {
    switch (status) {
      case "requested":
        return "#FEF3C7";
      case "approved":
        return "#D1FAE5";
      case "rejected":
        return "#FEE2E2";
      case "completed":
        return "#DBEAFE";
      default:
        return "#E5E7EB";
    }
  };

  const renderReturnRequest = ({ item }: { item: ReturnRequest }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          navigation.navigate("ReturnRequestDetail", {
            returnRequestId: item.id,
          });
        }}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.orderNumber}>
              {item.order_number || `Order #${item.order_id.slice(0, 8)}`}
            </Text>
            <Text style={styles.productName}>{item.product_name}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === "approved"
                    ? "#D1FAE5"
                    : item.status === "rejected"
                    ? "#FEE2E2"
                    : item.status === "completed"
                    ? "#DBEAFE"
                    : "#FEF3C7",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    item.status === "approved"
                      ? "#059669"
                      : item.status === "rejected"
                      ? "#DC2626"
                      : item.status === "completed"
                      ? "#2563EB"
                      : "#D97706",
                },
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {item.order_item_quantity} × {item.product_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="alert-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              Reason: {item.reason.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              Requested on {formatDate(item.created_at)}
            </Text>
          </View>

          {item.resolved_at && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Resolved on {formatDate(item.resolved_at)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.refundLabel}>Refund Amount</Text>
            <Text style={styles.refundAmount}>{formatPrice(item.refund_amount)}</Text>
          </View>
          {item.status === "approved" && (
            <View style={styles.approvedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.approvedText}>Approved</Text>
            </View>
          )}
        </View>

        {item.vendor_notes && (
          <View style={styles.vendorNotes}>
            <Text style={styles.vendorNotesLabel}>Vendor Note:</Text>
            <Text style={styles.vendorNotesText}>{item.vendor_notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && !isFetching) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          <Spinner />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Return Requests</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Status Filters */}
        <View style={styles.filtersContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedStatus === item.value && styles.filterButtonActive,
                ]}
                onPress={() => {
                  setSelectedStatus(item.value);
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedStatus === item.value && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filtersContent}
          />
        </View>

        {/* Return Requests List */}
        {returnRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="return-down-back-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Return Requests</Text>
            <Text style={styles.emptyText}>
              {selectedStatus === ""
                ? "You haven't requested any returns yet"
                : `No ${selectedStatus} return requests found`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={returnRequests}
            keyExtractor={(item) => item.id}
            renderItem={renderReturnRequest}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={() => {
                  setPage(1);
                  refetch();
                }}
                tintColor="#7B2D8E"
              />
            }
            onEndReached={() => {
              if (
                !isFetching &&
                returnRequestsData &&
                returnRequests.length < returnRequestsData.total &&
                page < returnRequestsData.pages
              ) {
                setPage((prev) => prev + 1);
              }
            }}
            onEndReachedThreshold={0.5}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#7B2D8E",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cardHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    color: "#6B7280",
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  refundLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  refundAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#D1FAE5",
    borderRadius: 16,
  },
  approvedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  vendorNotes: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#7B2D8E",
  },
  vendorNotesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  vendorNotesText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 18,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});

