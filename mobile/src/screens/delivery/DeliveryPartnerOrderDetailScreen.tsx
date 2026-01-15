import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetOrderQuery,
  useMarkDeliveredMutation,
  useMarkFailedMutation,
  useRetryDeliveryMutation,
  useReturnOrderMutation,
} from "@/store/api/deliveryPartnerApi";
import { Spinner } from "@/components/ui/Spinner";
import { OTPInputModal } from "@/components/delivery/OTPInputModal";
import { CODCollectionModal } from "@/components/delivery/CODCollectionModal";
import { ReasonInputModal } from "@/components/delivery/ReasonInputModal";
import { formatPrice, formatDateTime } from "@/lib/utils";

export default function DeliveryPartnerOrderDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const orderId = route.params?.orderId;

  const { data: order, isLoading, error, refetch } = useGetOrderQuery(orderId, {
    skip: !orderId,
  });

  const [markDelivered, { isLoading: isDelivering }] = useMarkDeliveredMutation();
  const [markFailed, { isLoading: isMarkingFailed }] = useMarkFailedMutation();
  const [retryDelivery, { isLoading: isRetrying }] = useRetryDeliveryMutation();
  const [returnOrder, { isLoading: isReturning }] = useReturnOrderMutation();

  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [showCODDialog, setShowCODDialog] = useState(false);
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [otpError, setOtpError] = useState<string>("");
  const [tempOTP, setTempOTP] = useState<string>("");

  const handleDeliver = () => {
    setShowOTPDialog(true);
    setOtpError("");
  };

  const handleOTPConfirm = async (otp: string) => {
    try {
      // For COD orders, show COD collection dialog after OTP is entered
      if (order?.payment_mode === "cod") {
        setShowOTPDialog(false);
        setShowCODDialog(true);
        setTempOTP(otp);
      } else {
        // For online orders, directly mark as delivered with OTP
        await markDelivered({
          orderId,
          otpData: {
            delivery_otp: otp,
          },
        }).unwrap();
        Alert.alert("Success", "Order marked as delivered!", [
          {
            text: "OK",
            onPress: () => {
              setShowOTPDialog(false);
              refetch();
            },
          },
        ]);
      }
    } catch (error: any) {
      const errorMessage = error?.data?.detail || "Invalid OTP. Please verify with customer.";
      setOtpError(errorMessage);
      Alert.alert("Error", errorMessage);
    }
  };

  const handleConfirmDeliver = async (codCollected: boolean) => {
    if (!tempOTP) {
      Alert.alert("Error", "OTP is required");
      setShowCODDialog(false);
      setShowOTPDialog(true);
      return;
    }

    try {
      await markDelivered({
        orderId,
        otpData: {
          delivery_otp: tempOTP,
          cod_collected: codCollected,
        },
      }).unwrap();
      Alert.alert("Success", "Order marked as delivered!", [
        {
          text: "OK",
          onPress: () => {
            setShowCODDialog(false);
            setShowOTPDialog(false);
            setTempOTP("");
            refetch();
          },
        },
      ]);
    } catch (error: any) {
      const errorMessage = error?.data?.detail || "Failed to mark order as delivered";
      Alert.alert("Error", errorMessage);
      // If OTP error, go back to OTP dialog
      if (errorMessage.includes("OTP") || errorMessage.includes("otp")) {
        setShowCODDialog(false);
        setShowOTPDialog(true);
        setOtpError(errorMessage);
      }
    }
  };

  const handleMarkFailed = () => {
    setShowFailedDialog(true);
  };

  const handleConfirmFailed = async (reason: string) => {
    if (!reason || reason.trim().length === 0) {
      Alert.alert("Error", "Please provide a reason");
      return;
    }

    try {
      await markFailed({
        orderId,
        failureData: {
          failure_reason: reason.trim(),
        },
      }).unwrap();
      Alert.alert("Success", "Delivery marked as failed");
      setShowFailedDialog(false);
      refetch();
    } catch (error: any) {
      Alert.alert("Error", error?.data?.detail || "Failed to mark delivery as failed");
    }
  };

  const handleRetry = () => {
    Alert.alert(
      "Retry Delivery",
      "Are you sure you want to retry this delivery? This will create a new delivery attempt.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Retry",
          onPress: async () => {
            try {
              await retryDelivery(orderId).unwrap();
              Alert.alert("Success", "Delivery retry created!");
              refetch();
            } catch (error: any) {
              Alert.alert("Error", error?.data?.detail || "Failed to retry delivery");
            }
          },
        },
      ]
    );
  };

  const handleReturn = () => {
    setShowReturnDialog(true);
  };

  const handleConfirmReturn = async (reason: string) => {
    if (!reason || reason.trim().length === 0) {
      Alert.alert("Error", "Please provide a reason");
      return;
    }

    Alert.alert(
      "Confirm Return",
      "Are you sure you want to return this order to the vendor? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setShowReturnDialog(false),
        },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            try {
              await returnOrder({ orderId, returnReason: reason.trim() }).unwrap();
              Alert.alert("Success", "Order returned to vendor");
              setShowReturnDialog(false);
              refetch();
            } catch (error: any) {
              Alert.alert("Error", error?.data?.detail || "Failed to return order");
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenMaps = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorText}>
          {error && "data" in error
            ? (error.data as any)?.detail || "Failed to load order."
            : "Order not found."}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.phoneText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canDeliver = order.order_status === "out_for_delivery";
  const canMarkFailed = order.order_status === "out_for_delivery";
  const canRetry = order.order_status === "out_for_delivery";
  const canReturn = order.order_status === "out_for_delivery";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.order_number}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusLabel}>Order Status</Text>
              <Text
                style={[
                  styles.statusValue,
                  order.order_status === "delivered"
                    ? styles.statusDelivered
                    : order.order_status === "out_for_delivery"
                    ? styles.statusOutForDelivery
                    : styles.statusDefault,
                ]}
              >
                {order.order_status === "delivered"
                  ? "Delivered"
                  : order.order_status === "out_for_delivery"
                  ? "Out for Delivery"
                  : order.order_status}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {(canDeliver || canMarkFailed || canRetry || canReturn) && (
          <View style={styles.actionsCard}>
            {canDeliver && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deliverButton]}
                onPress={handleDeliver}
                disabled={isDelivering || isMarkingFailed || isRetrying || isReturning}
              >
                {isDelivering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Mark as Delivered</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canMarkFailed && (
              <TouchableOpacity
                style={[styles.actionButton, styles.failedButton]}
                onPress={handleMarkFailed}
                disabled={isDelivering || isMarkingFailed || isRetrying || isReturning}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Mark as Failed</Text>
              </TouchableOpacity>
            )}
            {canRetry && (
              <TouchableOpacity
                style={[styles.actionButton, styles.retryButton]}
                onPress={handleRetry}
                disabled={isDelivering || isMarkingFailed || isRetrying || isReturning}
              >
                {isRetrying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Retry Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canReturn && (
              <TouchableOpacity
                style={[styles.actionButton, styles.returnButton]}
                onPress={handleReturn}
                disabled={isDelivering || isMarkingFailed || isRetrying || isReturning}
              >
                {isReturning ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="arrow-back-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Return to Vendor</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{order.buyer_name || "N/A"}</Text>
          </View>
          {order.buyer_phone && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => handleCall(order.buyer_phone!)}
            >
              <Ionicons name="call-outline" size={20} color="#7B2D8E" />
              <Text style={styles.phoneText}>{order.buyer_phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Address */}
        {order.delivery_address_snapshot && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <Text style={styles.addressText}>{order.delivery_address_snapshot}</Text>
            </View>
            {order.delivery_latitude && order.delivery_longitude && (
              <TouchableOpacity
                style={styles.mapsButton}
                onPress={() => handleOpenMaps(order.delivery_latitude!, order.delivery_longitude!)}
              >
                <Ionicons name="map-outline" size={18} color="#7B2D8E" />
                <Text style={styles.mapsText}>Open in Google Maps</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Vendor/Sender Information */}
        {order.vendor_info && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pickup From (Vendor)</Text>
            <View style={styles.vendorInfo}>
              <View style={styles.vendorRow}>
                <Ionicons name="storefront-outline" size={20} color="#7B2D8E" />
                <View style={styles.vendorDetails}>
                  <Text style={styles.vendorName}>{order.vendor_info.shop_name}</Text>
                  {order.vendor_info.phone && (
                    <TouchableOpacity
                      style={styles.vendorPhoneRow}
                      onPress={() => handleCall(order.vendor_info!.phone!)}
                    >
                      <Ionicons name="call-outline" size={16} color="#7B2D8E" />
                      <Text style={styles.vendorPhone}>{order.vendor_info.phone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Order Items with Images */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Items ({order.total_items})</Text>
          <View style={styles.itemsList}>
            {order.items?.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemCard}>
                {/* Product Image */}
                {item.product_image && (
                  <Image
                    source={{ uri: item.product_image }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      {item.product_description && (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                          {item.product_description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.itemMeta}>
                    <View style={styles.itemQuantityRow}>
                      <Ionicons name="cube-outline" size={14} color="#6B7280" />
                      <Text style={styles.itemQuantity}>
                        {item.quantity}x {item.sell_unit_label}
                      </Text>
                    </View>
                    {item.price_per_unit && (
                      <Text style={styles.itemUnitPrice}>
                        {formatPrice(item.price_per_unit)} per {item.sell_unit_label}
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemPrice}>{formatPrice(item.total_price)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Mode</Text>
            <Text style={styles.summaryValue}>{order.payment_mode.toUpperCase()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Status</Text>
            <Text style={styles.summaryValue}>{order.payment_status}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total_amount)}</Text>
          </View>
        </View>

        {/* Order Status Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Status Timeline</Text>
          <View style={styles.timelineContainer}>
            {/* Timeline line */}
            <View style={styles.timelineLine} />
            
            {/* Status items */}
            {[
              {
                key: "placed",
                label: "Order Placed",
                icon: "bag-outline",
                timestamp: order.placed_at,
                completed: true,
                current: false,
              },
              {
                key: "confirmed",
                label: "Order Confirmed",
                icon: "checkmark-circle-outline",
                timestamp: order.confirmed_at,
                completed: !!order.confirmed_at,
                current: false,
              },
              {
                key: "picked",
                label: "Items Picked",
                icon: "cube-outline",
                timestamp: order.picked_at,
                completed: !!order.picked_at,
                current: false,
              },
              {
                key: "packed",
                label: "Order Packed",
                icon: "archive-outline",
                timestamp: order.packed_at,
                completed: !!order.packed_at,
                current: order.order_status === "packed",
                showOTP: order.order_status === "packed" && order.delivery_otp,
              },
              {
                key: "out_for_delivery",
                label: "Out for Delivery",
                icon: "car-outline",
                timestamp: order.out_for_delivery_at,
                completed: !!order.out_for_delivery_at,
                current: order.order_status === "out_for_delivery",
              },
              {
                key: "delivered",
                label: "Order Delivered",
                icon: "checkmark-circle",
                timestamp: order.delivered_at,
                completed: !!order.delivered_at,
                current: order.order_status === "delivered",
              },
            ].map((status, index) => {
              const isCompleted = status.completed;
              const isCurrent = status.current;
              const isPending = !isCompleted && !isCurrent;

              return (
                <View key={status.key} style={styles.timelineItem}>
                  {/* Icon */}
                  <View
                    style={[
                      styles.timelineIcon,
                      isCompleted
                        ? styles.timelineIconCompleted
                        : isCurrent
                        ? styles.timelineIconCurrent
                        : styles.timelineIconPending,
                    ]}
                  >
                    <Ionicons
                      name={status.icon as any}
                      size={20}
                      color={
                        isCompleted
                          ? "#FFFFFF"
                          : isCurrent
                          ? "#7B2D8E"
                          : "#9CA3AF"
                      }
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text
                        style={[
                          styles.timelineLabel,
                          (isCompleted || isCurrent) && styles.timelineLabelActive,
                        ]}
                      >
                        {status.label}
                      </Text>
                      {status.timestamp && (
                        <Text style={styles.timelineTime}>
                          {formatDateTime(status.timestamp)}
                        </Text>
                      )}
                    </View>
                    
                    {/* Show OTP when packed */}
                    {status.showOTP && order.delivery_otp && (
                      <View style={styles.otpContainer}>
                        <View style={styles.otpHeader}>
                          <Ionicons name="lock-closed-outline" size={14} color="#2563EB" />
                          <Text style={styles.otpLabel}>Delivery OTP</Text>
                        </View>
                        <Text style={styles.otpCode}>{order.delivery_otp}</Text>
                        <Text style={styles.otpHint}>
                          Verify this OTP with customer before delivery
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* OTP Input Modal */}
      <OTPInputModal
        visible={showOTPDialog}
        onClose={() => {
          setShowOTPDialog(false);
          setOtpError("");
        }}
        onConfirm={handleOTPConfirm}
        isLoading={isDelivering}
        error={otpError}
      />

      {/* COD Collection Modal */}
      {order && (
        <CODCollectionModal
          visible={showCODDialog}
          onClose={() => {
            setShowCODDialog(false);
            if (tempOTP) {
              setShowOTPDialog(true);
            }
          }}
          onConfirm={handleConfirmDeliver}
          amount={order.total_amount}
          isLoading={isDelivering}
        />
      )}

      {/* Failed Delivery Reason Modal */}
      <ReasonInputModal
        visible={showFailedDialog}
        onClose={() => setShowFailedDialog(false)}
        onConfirm={handleConfirmFailed}
        title="Mark as Failed"
        message="Please provide a reason for the failed delivery:"
        placeholder="Enter reason for failure..."
        confirmText="Submit"
        isLoading={isMarkingFailed}
      />

      {/* Return to Vendor Reason Modal */}
      <ReasonInputModal
        visible={showReturnDialog}
        onClose={() => setShowReturnDialog(false)}
        onConfirm={handleConfirmReturn}
        title="Return to Vendor"
        message="Please provide a reason for returning the order:"
        placeholder="Enter return reason..."
        confirmText="Return"
        isLoading={isReturning}
        destructive={true}
      />
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
    marginBottom: 24,
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
    marginBottom: 12,
    marginHorizontal: 16,
    marginTop: 16,
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
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusDelivered: {
    color: "#10B981",
  },
  statusOutForDelivery: {
    color: "#7B2D8E",
  },
  statusDefault: {
    color: "#111827",
  },
  actionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deliverButton: {
    backgroundColor: "#7B2D8E",
  },
  failedButton: {
    backgroundColor: "#DC2626",
  },
  retryButton: {
    backgroundColor: "#F59E0B",
  },
  returnButton: {
    backgroundColor: "#6B7280",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  phoneText: {
    fontSize: 14,
    color: "#7B2D8E",
    fontWeight: "500",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  mapsText: {
    fontSize: 13,
    color: "#7B2D8E",
    fontWeight: "500",
  },
  itemsList: {
    gap: 16,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  productImage: {
    width: 100,
    height: 100,
    backgroundColor: "#F3F4F6",
  },
  itemContent: {
    flex: 1,
    padding: 12,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  itemMeta: {
    marginBottom: 8,
    gap: 4,
  },
  itemQuantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemQuantity: {
    fontSize: 13,
    color: "#6B7280",
  },
  itemUnitPrice: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  vendorInfo: {
    gap: 12,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  vendorDetails: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  vendorPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vendorPhone: {
    fontSize: 14,
    color: "#7B2D8E",
    fontWeight: "500",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    textTransform: "uppercase",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7B2D8E",
  },
  timelineContainer: {
    position: "relative",
    paddingLeft: 8,
  },
  timelineLine: {
    position: "absolute",
    left: 20,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#E5E7EB",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    position: "relative",
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginRight: 12,
    zIndex: 1,
  },
  timelineIconCompleted: {
    backgroundColor: "#7B2D8E",
    borderColor: "#7B2D8E",
  },
  timelineIconCurrent: {
    backgroundColor: "#EDE9FE",
    borderColor: "#7B2D8E",
    borderWidth: 3,
  },
  timelineIconPending: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timelineLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  timelineLabelActive: {
    color: "#111827",
  },
  timelineTime: {
    fontSize: 11,
    color: "#6B7280",
  },
  otpContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  otpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E40AF",
  },
  otpCode: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "monospace",
    color: "#1E40AF",
    letterSpacing: 4,
    marginBottom: 4,
  },
  otpHint: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 4,
  },
});

