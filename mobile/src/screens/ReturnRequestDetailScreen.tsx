import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetReturnRequestQuery } from "@/store/api/returnApi";
import { ReturnRequest } from "@/types/return";
import { Spinner } from "@/components/ui/Spinner";

export default function ReturnRequestDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const returnRequestId = route.params?.returnRequestId;

  const { data: returnRequest, isLoading, error, refetch } =
    useGetReturnRequestQuery(returnRequestId);

  const formatPrice = (amount: number) => {
    return `₹${parseFloat(String(amount)).toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "requested":
        return { bg: "#FEF3C7", text: "#D97706" };
      case "approved":
        return { bg: "#D1FAE5", text: "#059669" };
      case "rejected":
        return { bg: "#FEE2E2", text: "#DC2626" };
      case "completed":
        return { bg: "#DBEAFE", text: "#2563EB" };
      default:
        return { bg: "#E5E7EB", text: "#6B7280" };
    }
  };

  if (isLoading) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          <Spinner />
        </View>
      </>
    );
  }

  if (error || !returnRequest) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Error Loading Return Request</Text>
          <Text style={styles.errorText}>
            {error && "data" in error
              ? (error.data as any)?.detail || "Failed to load return request"
              : "Return request not found"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const statusColor = getStatusColor(returnRequest.status);

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
          <Text style={styles.headerTitle}>Return Request Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Status Card */}
          <View style={styles.card}>
            <View style={styles.statusHeader}>
              <View>
                <Text style={styles.requestId}>
                  Request #{returnRequest.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={styles.orderNumber}>
                  Order: {returnRequest.order_number || "N/A"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor.bg },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor.text }]}>
                  {returnRequest.status.charAt(0).toUpperCase() +
                    returnRequest.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Product Info */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Product Name</Text>
              <Text style={styles.infoValue}>{returnRequest.product_name}</Text>
            </View>
            {returnRequest.order_item_quantity && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quantity</Text>
                <Text style={styles.infoValue}>
                  {returnRequest.order_item_quantity} item(s)
                </Text>
              </View>
            )}
          </View>

          {/* Return Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Return Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reason</Text>
              <Text style={styles.infoValue}>
                {returnRequest.reason
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
            {returnRequest.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionText}>
                  {returnRequest.description}
                </Text>
              </View>
            )}
          </View>

          {/* Images */}
          {returnRequest.images && returnRequest.images.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Images</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesScrollView}
              >
                {returnRequest.images.map((imageUrl, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Refund Information */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Refund Information</Text>
            <View style={styles.refundRow}>
              <Text style={styles.refundLabel}>Refund Amount</Text>
              <Text style={styles.refundAmount}>
                {formatPrice(returnRequest.refund_amount)}
              </Text>
            </View>
            {returnRequest.status === "approved" && (
              <View style={styles.approvedInfo}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.approvedText}>
                  Your return has been approved. Refund will be processed soon.
                </Text>
              </View>
            )}
          </View>

          {/* Notes */}
          {(returnRequest.vendor_notes || returnRequest.admin_notes) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Notes</Text>
              {returnRequest.vendor_notes && (
                <View style={styles.noteContainer}>
                  <Text style={styles.noteLabel}>Vendor Note</Text>
                  <Text style={styles.noteText}>{returnRequest.vendor_notes}</Text>
                </View>
              )}
              {returnRequest.admin_notes && (
                <View style={styles.noteContainer}>
                  <Text style={styles.noteLabel}>Admin Note</Text>
                  <Text style={styles.noteText}>{returnRequest.admin_notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Timeline */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.timelineItem}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Requested</Text>
                <Text style={styles.timelineDate}>
                  {formatDate(returnRequest.created_at)}
                </Text>
              </View>
            </View>
            {returnRequest.resolved_at && (
              <View style={styles.timelineItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#059669" />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Resolved</Text>
                  <Text style={styles.timelineDate}>
                    {formatDate(returnRequest.resolved_at)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Actions */}
          {returnRequest.status === "requested" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  navigation.navigate("OrderDetail", {
                    orderId: returnRequest.order_id,
                  })
                }
              >
                <Ionicons name="receipt-outline" size={20} color="#7B2D8E" />
                <Text style={styles.actionButtonText}>View Order</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  requestId: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
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
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  descriptionContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "600",
  },
  descriptionText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  imagesScrollView: {
    marginTop: 12,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  refundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 8,
  },
  refundLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  refundAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7B2D8E",
  },
  approvedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
  },
  approvedText: {
    flex: 1,
    fontSize: 13,
    color: "#059669",
    lineHeight: 18,
  },
  noteContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#7B2D8E",
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: "#6B7280",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    backgroundColor: "#F3E8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7B2D8E",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7B2D8E",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#7B2D8E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

